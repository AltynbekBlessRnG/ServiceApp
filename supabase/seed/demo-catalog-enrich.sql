-- Приводит демонстрационный каталог в вид, пригодный для витрины.
--
-- Что было не так после demo-catalog.sql:
--   * имена. Индексы имени и фамилии считались от одного счётчика (seq % 12
--     при массивах длиной 12), поэтому пары двигались синхронно и из 144
--     возможных сочетаний получалось 12: «Алишер Алимбаев» встречался в
--     каталоге десять раз в разных городах;
--   * описания. Все собирались одной строкой формата «<Услуга>, <город>.
--     Опыт N лет», включая «Опыт 4 лет» — и читались как выгрузка из базы;
--   * аватары. avatar_url не заполнялся, а UserAvatar без него рисует серый
--     кружок с иконкой человека. 184 одинаковых кружка выглядят как пустая база.
--
-- Аватар здесь — монограмма, а не фотография несуществующего человека, и
-- каждая карточка по-прежнему называет себя демонстрационной. Оценки и отзывы
-- добавляет отдельный demo-reviews.sql; там же записано, почему это решение
-- изменилось и чем оно закрыто со стороны Apple.
--
-- Затрагивает только demo.%@example.com. Учётные записи Taptym Демо, на
-- которых Apple проверяет приложение, остаются как есть.

-- 1. Уникальные имена специалистов: смешанное основание вместо общего счётчика.
WITH pool AS (
  SELECT p.id, (row_number() OVER (ORDER BY p.created_at, p.id) - 1)::INT AS rn
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'specialist' AND u.email LIKE 'demo.%@example.com'
),
named AS (
  SELECT id,
    CASE WHEN rn % 2 = 0 THEN
      (ARRAY['Айгерим','Асель','Динара','Жанна','Мадина','Сауле','Гульнара','Айнур','Камила','Алия','Назерке','Балжан','Аружан','Жанара'])[1 + ((rn/2) % 14)]
      || ' ' ||
      (ARRAY['Серикова','Абдрахманова','Оспанова','Жумабекова','Каримова','Нурпеисова','Сагындыкова','Токтарова','Бекмуратова','Алимбаева','Дюсенова','Мукашева'])[1 + (((rn/2) / 14) % 12)]
    ELSE
      (ARRAY['Данияр','Нурлан','Ерлан','Асхат','Тимур','Бекзат','Арман','Мурат','Санжар','Алишер','Дамир','Ержан','Айдос','Руслан'])[1 + ((rn/2) % 14)]
      || ' ' ||
      (ARRAY['Сериков','Абдрахманов','Оспанов','Жумабеков','Каримов','Нурпеисов','Сагындыков','Токтаров','Бекмуратов','Алимбаев','Дюсенов','Мукашев'])[1 + (((rn/2) / 14) % 12)]
    END AS new_name
  FROM pool
)
UPDATE public.profiles p SET full_name = n.new_name, updated_at = NOW()
FROM named n WHERE p.id = n.id;

-- 2. Уникальные названия заведений. Бренд нумеруется внутри города, иначе
--    «Керемет Алматы» повторяется, как только счётчик обгонит список брендов.
WITH pool AS (
  SELECT p.id, p.city,
         (row_number() OVER (PARTITION BY p.city ORDER BY p.created_at, p.id) - 1)::INT AS rn
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'venue' AND u.email LIKE 'demo.%@example.com'
    AND u.email NOT LIKE 'demo.alakol.%'
),
named AS (
  SELECT id,
    (ARRAY['Аружан','Алтын','Керемет','Жетісу','Сарыарқа','Медеу','Тұмар','Шаңырақ','Береке','Самал','Нұрлы','Ару',
           'Байтерек','Қарлығаш','Ақжол','Жібек','Тұлпар','Ұлытау','Айсұлу','Дәстүр','Мерей','Қуаныш','Асыл','Жұлдыз',
           'Тәуелсіздік','Ақниет','Сая','Аққу','Нұрсая','Ақбота'])[1 + (rn % 30)]
    || ' ' || city AS new_name
  FROM pool
)
UPDATE public.profiles p SET full_name = n.new_name, updated_at = NOW()
FROM named n WHERE p.id = n.id;

-- 3. Медсестра и сиделка — существительные женского рода; мужское имя рядом
--    читается как ошибка данных.
WITH gendered AS (
  SELECT pr.id, (row_number() OVER (ORDER BY pr.id) - 1)::INT AS rn
  FROM public.profiles pr
  JOIN auth.users u ON u.id = pr.id
  JOIN public.provider_services ps ON ps.provider_id = pr.id
  JOIN public.services s ON s.id = ps.service_id
  WHERE u.email LIKE 'demo.%@example.com'
    AND s.slug IN ('nurses','caregivers') AND pr.full_name !~ 'а$'
),
renamed AS (
  SELECT id,
    (ARRAY['Сауле','Айнур','Алия','Балжан','Жанара','Аружан','Асель','Мадина'])[1 + (rn % 8)]
    || ' ' ||
    (ARRAY['Ибраева','Калиева','Смагулова','Тлеубаева','Ахметова','Досжанова'])[1 + ((rn / 8) % 6)] AS new_name
  FROM gendered
)
UPDATE public.profiles p SET full_name = r.new_name, updated_at = NOW()
FROM renamed r WHERE p.id = r.id;

-- 4. Описания специалистов: профессия в единственном числе, своя строка о
--    работе на каждую категорию и склонение «год / года / лет».
WITH singular(slug, noun) AS (VALUES
 ('diagnostics','Автодиагност'),('mechanics','Автомеханик'),('auto-electricians','Автоэлектрик'),
 ('tire-specialists','Мастер шиномонтажа'),('interior-cleaning','Мастер химчистки салона'),
 ('car-selection','Специалист по автоподбору'),('mobile-repair','Мастер выездного ремонта'),
 ('nail-artists','Мастер маникюра'),('makeup-artists','Визажист'),('massage','Массажист'),
 ('cosmetology','Косметолог'),('stylists','Стилист'),('nurses','Медсестра'),
 ('rehabilitation','Реабилитолог'),('physical-therapy','Специалист ЛФК'),('caregivers','Сиделка'),
 ('smm','SMM-менеджер'),('marketing','Таргетолог'),('design','Дизайнер'),('accounting','Бухгалтер'),
 ('consulting','Консультант'),('tutors','Репетитор'),('trainers','Тренер'),
 ('driving','Инструктор по вождению'),('hosts','Ведущий'),('photographers','Фотограф'),
 ('videographers','Видеограф'),('musicians','Музыкант'),('decorators','Декоратор'),
 ('plumbing','Сантехник'),('electrical','Электрик'),('repair','Мастер по ремонту'),
 ('handyman','Мастер на час'),('cleaners','Клинер'),('furniture-assembly','Сборщик мебели'),
 ('finishing','Мастер отделочных работ'),('appliance-repair','Мастер по ремонту техники'),
 ('installers','Установщик'),('upholstery-cleaning','Мастер химчистки мебели'),
 ('frontend','Frontend-разработчик'),('backend','Backend-разработчик'),('devops','DevOps-инженер'),
 ('mobile','Мобильный разработчик'),('ui-ux','UI/UX-дизайнер'),('analytics','Аналитик данных'),
 ('lawyers','Юрист'),('advocates','Адвокат'),('notaries','Нотариус'),('guides','Гид'),
 ('tour-organizers','Организатор туров'),('transfers','Водитель трансфера'),
 ('outdoor-instructors','Инструктор активного отдыха'),('travel-agents','Турагент'),
 ('recreation','База отдыха'),('glamping','Глэмпинг'),('hotels','Отель'),
 ('sanatoriums','Санаторий'),('equipment-rental','Прокат туристического оборудования'),
 ('camps','Детский лагерь')
),
detail(cat, variants) AS (VALUES
 ('auto',      ARRAY['Диагностика, ремонт и подготовка к техосмотру','Работаю с легковыми авто, выезжаю по городу','Даю гарантию на работы до полугода']),
 ('beauty',    ARRAY['Принимаю в своём кабинете и выезжаю к клиенту','Стерильный инструмент, одноразовые расходники','Подбираю уход под тип кожи и волос']),
 ('business',  ARRAY['Веду проекты под ключ, отчёт раз в неделю','Работаю с малым бизнесом и ИП','Первая консультация — бесплатно']),
 ('education', ARRAY['Занятия очно и онлайн, программа под цель','Готовлю к экзаменам и поступлению','Первое занятие — знакомство и разбор уровня']),
 ('events',    ARRAY['Работаю на свадьбах, тоях и корпоративах','Свой реквизит и аппаратура','Выезжаю по области по договорённости']),
 ('home',      ARRAY['Выезжаю в день обращения, инструмент свой','Замер и смета до начала работ','Гарантия на работы и материалы']),
 ('it',        ARRAY['Удалённая работа, спринты по две недели','Пишу код с тестами и документацией','Опыт в продуктовых командах']),
 ('legal',     ARRAY['Консультация, документы и представительство','Работаю с ИП и ТОО','Оцениваю перспективы дела по телефону']),
 ('leisure',   ARRAY['Маршруты по Казахстану и соседним регионам','Трансфер и питание по договорённости','Беру группы и индивидуальные выезды'])
)
UPDATE public.specialist_profiles sp
SET bio = format('%s в городе %s. %s. Опыт %s %s, работа по записи. Демонстрационный профиль Taptym: каталог наполняется, реальные исполнители подключаются.',
      sg.noun, pr.city,
      d.variants[1 + (abs(hashtext(pr.id::TEXT)) % 3)],
      sp.experience_years,
      CASE
        WHEN sp.experience_years % 10 = 1 AND sp.experience_years % 100 <> 11 THEN 'год'
        WHEN sp.experience_years % 10 BETWEEN 2 AND 4 AND sp.experience_years % 100 NOT BETWEEN 12 AND 14 THEN 'года'
        ELSE 'лет'
      END),
    updated_at = NOW()
FROM public.profiles pr
JOIN auth.users u ON u.id = pr.id
JOIN public.provider_services ps ON ps.provider_id = pr.id
JOIN public.services s ON s.id = ps.service_id
JOIN public.service_categories c ON c.id = s.category_id
JOIN singular sg ON sg.slug = s.slug
JOIN detail d ON d.cat = c.slug
WHERE sp.id = pr.id AND u.email LIKE 'demo.%@example.com';

-- 5. Категория «Красота и здоровье» держит косметологов рядом с медсёстрами и
--    сиделками, а «Отдых и туризм» — гидов рядом с базами отдыха. Общая строка
--    категории им не подходит: сиделке доставалось «подбираю уход за кожей».
WITH own(slug, line) AS (VALUES
 ('nurses','Уколы, капельницы и перевязки на дому'),
 ('caregivers','Уход за пожилыми и лежачими, помощь по дому'),
 ('rehabilitation','Восстановление после травм и операций'),
 ('physical-therapy','Лечебная гимнастика по назначению врача'),
 ('massage','Лечебный, спортивный и расслабляющий массаж'),
 ('recreation','Домики и беседки, территория у воды'),
 ('glamping','Купольные шатры с отоплением и завтраком'),
 ('hotels','Номера посуточно, ранний заезд по договорённости'),
 ('sanatoriums','Лечебные программы и питание по путёвке'),
 ('camps','Смены для детей 7–16 лет, питание и программа'),
 ('equipment-rental','Палатки, спальники и снаряжение посуточно')
)
UPDATE public.specialist_profiles sp
SET bio = regexp_replace(sp.bio, '^([^.]+\. )[^.]+\.', '\1' || own.line || '.'),
    updated_at = NOW()
FROM public.profiles pr
JOIN auth.users u ON u.id = pr.id
JOIN public.provider_services ps ON ps.provider_id = pr.id
JOIN public.services s ON s.id = ps.service_id
JOIN own ON own.slug = s.slug
WHERE sp.id = pr.id AND u.email LIKE 'demo.%@example.com';

-- 6. Описания заведений: тип, чем занимается, вместимость и удобства.
WITH v(slug, kind, line) AS (VALUES
 ('banquet','Ресторан с банкетным залом','Зал на свадьбы и тои, своя кухня'),
 ('catering','Кейтеринговая служба','Выездное обслуживание банкетов и корпоративов'),
 ('photo-studios','Фотостудия','Залы с циклорамой и студийным светом'),
 ('beauty-salons','Салон красоты','Парикмахеры, маникюр и косметология в одном месте'),
 ('barbershops','Барбершоп','Мужские стрижки и оформление бороды по записи'),
 ('spa','SPA-центр','Хаммам, массаж и уходовые программы'),
 ('dentistry','Стоматология','Лечение, гигиена и протезирование'),
 ('service-stations','СТО','Подъёмники, диагностика и ремонт по записи'),
 ('detailing','Детейлинг-центр','Полировка, керамика и химчистка салона'),
 ('car-wash','Автомойка','Мойка кузова и салона, по записи без очереди'),
 ('tire-service','Шиномонтаж','Шиномонтаж, балансировка и сезонное хранение'),
 ('car-rental','Прокат автомобилей','Легковые авто посуточно, договор и залог'),
 ('recreation','База отдыха','Домики, беседки и зоны для барбекю'),
 ('glamping','Глэмпинг','Купольные шатры с отоплением и завтраком'),
 ('hotels','Отель','Номера посуточно, завтрак включён'),
 ('sanatoriums','Санаторий','Лечебные программы, питание и проживание'),
 ('camps','Детский лагерь','Смены для детей 7–16 лет'),
 ('law-firms','Юридическая компания','Сопровождение сделок, споры и договоры'),
 ('business-registration','Центр регистрации бизнеса','Регистрация ТОО и ИП под ключ'),
 ('cleaning','Клининговая компания','Уборка квартир и офисов со своими средствами'),
 ('dry-cleaning','Химчистка','Чистка одежды, ковров и текстиля'),
 ('driving-schools','Автошкола','Теория и вождение, категории B и C'),
 ('language-schools','Языковые курсы','Английский, казахский и турецкий в группах'),
 ('education-centers','Образовательный центр','Подготовка к ЕНТ и школьные предметы'),
 ('restaurants','Ресторан','Кухня, зал и летняя веранда'),
 ('pubs','Паб','Разливное пиво, кухня и трансляции матчей'),
 ('coffee-shops','Кофейня','Спешелти-кофе, завтраки и десерты'),
 ('pizzerias','Пиццерия','Пицца на дровах и доставка по городу'),
 ('hookah-lounges','Кальянная','Кальяны, чайная карта и зона отдыха'),
 ('bars','Бар','Коктейли, музыка и бронь столов'),
 ('computer-clubs','Компьютерный клуб','Игровые ПК и консоли, турниры по выходным'),
 ('karaoke','Караоке-клуб','Отдельные кабинки и общий зал'),
 ('nightclubs','Ночной клуб','Танцпол, DJ-сеты и бронь столов')
)
UPDATE public.venue_profiles vp
SET description = format('%s в городе %s. %s. Вместимость %s человек%s. Демонстрационный профиль Taptym: каталог наполняется, реальные заведения подключаются.',
      v.kind, pr.city, v.line, vp.capacity,
      coalesce(', ' || nullif(concat_ws(', ',
        CASE WHEN vp.has_wifi THEN 'Wi-Fi' END,
        CASE WHEN vp.has_parking THEN 'парковка' END,
        CASE WHEN vp.has_meals THEN 'питание' END,
        CASE WHEN vp.family_friendly THEN 'можно с детьми' END,
        CASE WHEN vp.pet_friendly THEN 'можно с питомцами' END), ''), '')),
    updated_at = NOW()
FROM public.profiles pr
JOIN auth.users u ON u.id = pr.id
JOIN public.provider_services ps ON ps.provider_id = pr.id
JOIN public.services s ON s.id = ps.service_id
JOIN v ON v.slug = s.slug
WHERE vp.id = pr.id AND u.email LIKE 'demo.%@example.com'
  AND u.email NOT LIKE 'demo.alakol.%';

-- 7. Алакольские базы: у них своя карточка с зоной и расстоянием до пляжа.
UPDATE public.venue_profiles vp
SET description = format('База отдыха на Алаколе, зона %s. %s. Вместимость %s человек, до пляжа %s м%s. Демонстрационный профиль Taptym: каталог наполняется, реальные объекты подключаются.',
      pr.city,
      (ARRAY['Домики у воды, зоны для барбекю и беседки',
             'Номера с кондиционером, свой выход к пляжу',
             'Семейные домики, детская площадка на территории'])[1 + (abs(hashtext(pr.id::TEXT)) % 3)],
      vp.capacity, vp.distance_to_beach_m,
      coalesce(', ' || nullif(concat_ws(', ',
        CASE WHEN vp.has_wifi THEN 'Wi-Fi' END,
        CASE WHEN vp.has_parking THEN 'парковка' END,
        CASE WHEN vp.has_meals THEN 'питание' END,
        CASE WHEN vp.pet_friendly THEN 'можно с питомцами' END), ''), ''))
FROM public.profiles pr
JOIN auth.users u ON u.id = pr.id
WHERE vp.id = pr.id AND u.email LIKE 'demo.alakol.%@example.com';

-- 8. Вместимость осмысленна для залов, гостиниц и баз отдыха. У нотариуса или
--    автомойки «вместимость 130 человек» читается как мусор в данных.
WITH no_capacity AS (
  SELECT vp.id
  FROM public.venue_profiles vp
  JOIN public.provider_services ps ON ps.provider_id = vp.id
  JOIN public.services s ON s.id = ps.service_id
  WHERE s.slug IN ('beauty-salons','barbershops','spa','dentistry','service-stations',
                   'detailing','car-wash','tire-service','car-rental','law-firms',
                   'business-registration','cleaning','dry-cleaning','driving-schools',
                   'language-schools','education-centers')
)
UPDATE public.venue_profiles vp
SET description = regexp_replace(
      regexp_replace(vp.description, 'Вместимость \d+ человек, ', 'Удобства: '),
      'Вместимость \d+ человек\. ', ''),
    updated_at = NOW()
FROM no_capacity nc WHERE vp.id = nc.id;

-- 9. Аватары. Картинки лежат в demo/avatars и раздаются GitHub Pages этого же
--    репозитория; имя файла — md5 инициалов, его же считает Postgres, поэтому
--    выгружать имена наружу не нужно. Файлы создаёт scripts/make-demo-avatars.mjs.
UPDATE public.profiles
SET avatar_url = 'https://altynbekblessrng.github.io/ServiceApp/demo/avatars/'
      || md5(upper(left(split_part(full_name,' ',1),1)
             || coalesce(nullif(left(split_part(full_name,' ',2),1),''),''))) || '.png',
    updated_at = NOW()
WHERE role IN ('specialist','venue') AND avatar_url IS NULL;
