CREATE TEMP TABLE _category_seed (
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  bg_color TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO _category_seed (type, name, bg_color) VALUES
  ('specialist', 'Барберы', '#2ED573'),
  ('specialist', 'Маникюр', '#E056FD'),
  ('specialist', 'Макияж', '#FF6B81'),
  ('specialist', 'Фотографы', '#3742FA'),
  ('specialist', 'Репетиторы', '#1E90FF'),
  ('specialist', 'Массаж', '#00D2D3'),
  ('specialist', 'IT и диджитал', '#00D2D3'),
  ('specialist', 'Автоуслуги', '#FF4757'),
  ('specialist', 'Дизайн и реклама', '#FFA502'),
  ('specialist', 'Ивенты и праздники', '#FF6B81'),
  ('specialist', 'Клининг и дом', '#7BED9F'),
  ('specialist', 'Медицина', '#FF6348'),
  ('specialist', 'Ремонт и стройка', '#A55EEA'),
  ('specialist', 'Салоны красоты', '#E056FD'),
  ('specialist', 'Фото и видео', '#3742FA'),
  ('specialist', 'Юридические услуги', '#5352ED'),
  ('specialist', 'Трансфер', '#00D2D3'),
  ('specialist', 'Детские услуги', '#FF6B81'),
  ('specialist', 'Развлечения и аренда', '#FFA502'),
  ('venue', 'Салоны красоты', '#8A2BE2'),
  ('venue', 'Барбершопы', '#2ED573'),
  ('venue', 'Кофейни', '#FFA502'),
  ('venue', 'Фотостудии', '#3742FA'),
  ('venue', 'Зоны отдыха', '#00D2D3'),
  ('venue', 'Пансионаты', '#1E90FF'),
  ('venue', 'Гостевые дома', '#7BED9F'),
  ('venue', 'Коттеджи', '#A55EEA');

INSERT INTO public.categories (type, name, bg_color)
SELECT type, name, bg_color FROM _category_seed
ON CONFLICT (type, name) DO NOTHING;

UPDATE public.categories c
SET bg_color = seed.bg_color
FROM _category_seed seed
WHERE c.type = seed.type AND c.name = seed.name;

DELETE FROM public.categories c
WHERE (c.name LIKE '%?%' OR c.name LIKE '%Ð%' OR c.name LIKE '%Ñ%')
  AND NOT EXISTS (SELECT 1 FROM public.specialist_profiles sp WHERE sp.category_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.venue_profiles vp WHERE vp.category_id = c.id);

DELETE FROM public.subcategories sc
USING public.categories c
JOIN _category_seed seed ON seed.type = c.type AND seed.name = c.name
WHERE sc.category_id = c.id;

CREATE TEMP TABLE _subcategory_seed (
  category_type TEXT NOT NULL,
  category_name TEXT NOT NULL,
  name TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO _subcategory_seed (category_type, category_name, name) VALUES
  ('specialist', 'Барберы', 'Мужская стрижка'),
  ('specialist', 'Барберы', 'Fade'),
  ('specialist', 'Барберы', 'Борода'),
  ('specialist', 'Барберы', 'Детская стрижка'),
  ('specialist', 'Барберы', 'Окрашивание'),
  ('specialist', 'Маникюр', 'Маникюр'),
  ('specialist', 'Маникюр', 'Педикюр'),
  ('specialist', 'Маникюр', 'Гель-лак'),
  ('specialist', 'Маникюр', 'Наращивание'),
  ('specialist', 'Маникюр', 'Дизайн ногтей'),
  ('specialist', 'Макияж', 'Дневной макияж'),
  ('specialist', 'Макияж', 'Вечерний макияж'),
  ('specialist', 'Макияж', 'Свадебный макияж'),
  ('specialist', 'Макияж', 'Брови'),
  ('specialist', 'Макияж', 'Образ для съемки'),
  ('specialist', 'Фотографы', 'Портрет'),
  ('specialist', 'Фотографы', 'Свадьба'),
  ('specialist', 'Фотографы', 'Семейная съемка'),
  ('specialist', 'Фотографы', 'Контент для бизнеса'),
  ('specialist', 'Фотографы', 'Репортаж'),
  ('specialist', 'Репетиторы', 'Английский язык'),
  ('specialist', 'Репетиторы', 'Математика'),
  ('specialist', 'Репетиторы', 'Казахский язык'),
  ('specialist', 'Репетиторы', 'Подготовка к ЕНТ'),
  ('specialist', 'Репетиторы', 'Начальные классы'),
  ('specialist', 'Массаж', 'Классический'),
  ('specialist', 'Массаж', 'Расслабляющий'),
  ('specialist', 'Массаж', 'Спортивный'),
  ('specialist', 'Массаж', 'Лечебный'),
  ('specialist', 'Массаж', 'Антицеллюлитный'),
  ('specialist', 'IT и диджитал', 'Разработка сайтов'),
  ('specialist', 'IT и диджитал', 'Мобильные приложения'),
  ('specialist', 'IT и диджитал', 'Настройка рекламы'),
  ('specialist', 'IT и диджитал', 'Автоматизация'),
  ('specialist', 'IT и диджитал', 'Техническая поддержка'),
  ('specialist', 'Автоуслуги', 'Диагностика'),
  ('specialist', 'Автоуслуги', 'Ремонт ходовой'),
  ('specialist', 'Автоуслуги', 'Шиномонтаж'),
  ('specialist', 'Автоуслуги', 'Автоэлектрик'),
  ('specialist', 'Автоуслуги', 'Химчистка салона'),
  ('specialist', 'Дизайн и реклама', 'Логотипы'),
  ('specialist', 'Дизайн и реклама', 'SMM'),
  ('specialist', 'Дизайн и реклама', 'Баннеры'),
  ('specialist', 'Дизайн и реклама', 'Полиграфия'),
  ('specialist', 'Дизайн и реклама', 'Брендинг'),
  ('specialist', 'Ивенты и праздники', 'Ведущий'),
  ('specialist', 'Ивенты и праздники', 'Декор'),
  ('specialist', 'Ивенты и праздники', 'Аниматор'),
  ('specialist', 'Ивенты и праздники', 'DJ и музыка'),
  ('specialist', 'Ивенты и праздники', 'Кейтеринг'),
  ('specialist', 'Клининг и дом', 'Уборка квартир'),
  ('specialist', 'Клининг и дом', 'Генеральная уборка'),
  ('specialist', 'Клининг и дом', 'Химчистка мебели'),
  ('specialist', 'Клининг и дом', 'Мытье окон'),
  ('specialist', 'Клининг и дом', 'Домработница'),
  ('specialist', 'Медицина', 'Медсестра'),
  ('specialist', 'Медицина', 'Реабилитация'),
  ('specialist', 'Медицина', 'ЛФК'),
  ('specialist', 'Медицина', 'Капельницы'),
  ('specialist', 'Медицина', 'Сиделка'),
  ('specialist', 'Ремонт и стройка', 'Сантехник'),
  ('specialist', 'Ремонт и стройка', 'Электрик'),
  ('specialist', 'Ремонт и стройка', 'Мастер на час'),
  ('specialist', 'Ремонт и стройка', 'Отделка'),
  ('specialist', 'Ремонт и стройка', 'Сборка мебели'),
  ('specialist', 'Салоны красоты', 'Брови'),
  ('specialist', 'Салоны красоты', 'Ресницы'),
  ('specialist', 'Салоны красоты', 'Волосы'),
  ('specialist', 'Салоны красоты', 'Косметология'),
  ('specialist', 'Салоны красоты', 'Депиляция'),
  ('specialist', 'Фото и видео', 'Видеосъемка'),
  ('specialist', 'Фото и видео', 'Монтаж'),
  ('specialist', 'Фото и видео', 'Reels'),
  ('specialist', 'Фото и видео', 'Аэросъемка'),
  ('specialist', 'Фото и видео', 'Цветокоррекция'),
  ('specialist', 'Юридические услуги', 'Консультации'),
  ('specialist', 'Юридические услуги', 'Документы'),
  ('specialist', 'Юридические услуги', 'Договоры'),
  ('specialist', 'Юридические услуги', 'Судебные вопросы'),
  ('specialist', 'Юридические услуги', 'Регистрация бизнеса'),
  ('specialist', 'Трансфер', 'Ушарал - Алаколь'),
  ('specialist', 'Трансфер', 'Алматы - Алаколь'),
  ('specialist', 'Трансфер', 'Между зонами отдыха'),
  ('specialist', 'Трансфер', 'Минивэн'),
  ('specialist', 'Трансфер', 'Встреча с вокзала'),
  ('specialist', 'Детские услуги', 'Няня'),
  ('specialist', 'Детские услуги', 'Аниматор'),
  ('specialist', 'Детские услуги', 'Детский фотограф'),
  ('specialist', 'Детские услуги', 'Развивающие занятия'),
  ('specialist', 'Детские услуги', 'Сопровождение'),
  ('specialist', 'Развлечения и аренда', 'SUP и катамараны'),
  ('specialist', 'Развлечения и аренда', 'Экскурсии'),
  ('specialist', 'Развлечения и аренда', 'Катера'),
  ('specialist', 'Развлечения и аренда', 'Велосипеды'),
  ('specialist', 'Развлечения и аренда', 'Рыбалка и туры'),
  ('venue', 'Салоны красоты', 'Парикмахерская'),
  ('venue', 'Салоны красоты', 'Ногтевой сервис'),
  ('venue', 'Салоны красоты', 'Косметология'),
  ('venue', 'Салоны красоты', 'SPA'),
  ('venue', 'Барбершопы', 'Мужские стрижки'),
  ('venue', 'Барбершопы', 'Борода'),
  ('venue', 'Барбершопы', 'Детская зона'),
  ('venue', 'Кофейни', 'Кофе с собой'),
  ('venue', 'Кофейни', 'Завтраки'),
  ('venue', 'Кофейни', 'Десерты'),
  ('venue', 'Фотостудии', 'Циклорама'),
  ('venue', 'Фотостудии', 'Предметная съемка'),
  ('venue', 'Фотостудии', 'Гримерка'),
  ('venue', 'Зоны отдыха', 'У берега'),
  ('venue', 'Зоны отдыха', 'Семейный отдых'),
  ('venue', 'Зоны отдыха', 'С бассейном'),
  ('venue', 'Зоны отдыха', 'С питанием'),
  ('venue', 'Пансионаты', 'С питанием'),
  ('venue', 'Пансионаты', 'Все включено'),
  ('venue', 'Пансионаты', 'Семейные номера'),
  ('venue', 'Гостевые дома', '2-4 гостя'),
  ('venue', 'Гостевые дома', 'Общая кухня'),
  ('venue', 'Гостевые дома', 'Бюджетный отдых'),
  ('venue', 'Коттеджи', 'Компания 6+'),
  ('venue', 'Коттеджи', 'Отдельный дом'),
  ('venue', 'Коттеджи', 'Мангал и двор');

INSERT INTO public.subcategories (category_id, name)
SELECT c.id, seed.name
FROM _subcategory_seed seed
JOIN public.categories c ON c.type = seed.category_type AND c.name = seed.category_name
ON CONFLICT (category_id, name) DO NOTHING;
