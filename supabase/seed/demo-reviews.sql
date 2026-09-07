-- Наполняет демонстрационные профили оценками и отзывами.
--
-- Решение владельца проекта: без единой оценки каталог читается как мёртвый,
-- каждая карточка висит с меткой «Новый». Поэтому отзывы создаются — но не
-- тайком: заметки для проверяющего в App Store Connect прямо говорят, что
-- оценки и отзывы у демонстрационных профилей наши, а не оставлены живыми
-- клиентами, и что все такие записи помечены адресами @example.com.
--
-- Это меняет решение, записанное в заголовке demo-catalog.sql. Раньше отзывов
-- не было именно потому, что выдуманные отзывы вводят покупателя в
-- заблуждение. Риск никуда не делся, снимается он только раскрытием: пока
-- заметки для Apple говорят правду, а профили называют себя
-- демонстрационными, поведение остаётся честным.
--
-- Отзыв в схеме привязан к брони (reviews.booking_id уникален), поэтому под
-- каждый отзыв создаётся завершённая бронь: appointment у специалистов,
-- stay у заведений — ровно так, как их создаёт приложение.
--
-- Удаление: см. demo-catalog-down.sql. Брони и отзывы уходят каскадом вместе
-- с учётными записями demo.client.%@example.com.

-- 1. Авторы отзывов. Своих клиентов в базе было двое, а отзыв от одного и того
--    же человека на всю витрину выглядит хуже, чем его отсутствие.
DO $$
DECLARE
  v_first_f TEXT[] := ARRAY['Айгерим','Асель','Динара','Жанна','Мадина','Сауле','Гульнара','Айнур','Камила','Алия','Назерке','Балжан','Аружан','Жанара'];
  v_first_m TEXT[] := ARRAY['Данияр','Нурлан','Ерлан','Асхат','Тимур','Бекзат','Арман','Мурат','Санжар','Алишер','Дамир','Ержан','Айдос','Руслан'];
  v_last_f  TEXT[] := ARRAY['Серикова','Абдрахманова','Оспанова','Жумабекова','Каримова','Нурпеисова','Сагындыкова','Токтарова','Бекмуратова','Алимбаева','Дюсенова','Мукашева'];
  v_last_m  TEXT[] := ARRAY['Сериков','Абдрахманов','Оспанов','Жумабеков','Каримов','Нурпеисов','Сагындыков','Токтаров','Бекмуратов','Алимбаев','Дюсенов','Мукашев'];
  v_city    TEXT[] := ARRAY['Алматы','Астана','Шымкент','Караганда','Актобе'];
  i INT; v_uid UUID; v_name TEXT; v_city_n TEXT;
BEGIN
  FOR i IN 0..47 LOOP
    v_uid := gen_random_uuid();
    v_city_n := v_city[1 + (i % 5)];
    v_name := CASE WHEN i % 2 = 0
      THEN v_first_f[1 + ((i/2) % 14)] || ' ' || v_last_f[1 + (((i/2) / 14) % 12)]
      ELSE v_first_m[1 + ((i/2) % 14)] || ' ' || v_last_m[1 + (((i/2) / 14) % 12)]
    END;
    INSERT INTO auth.users (id, instance_id, aud, role, email, email_confirmed_at,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            format('demo.client.%s@example.com', i + 1), NOW(), NOW(), NOW(),
            '{"provider":"email","providers":["email"]}'::JSONB,
            jsonb_build_object('full_name', v_name, 'city', v_city_n));
    UPDATE public.profiles SET full_name = v_name, city = v_city_n, role = 'client' WHERE id = v_uid;
  END LOOP;
END $$;

-- Монограммы уже нарисованы: имена клиентов собраны из тех же массивов, что и
-- имена исполнителей, поэтому новых инициалов не появляется.
UPDATE public.profiles p
SET avatar_url = 'https://altynbekblessrng.github.io/ServiceApp/demo/avatars/'
      || md5(upper(left(split_part(p.full_name,' ',1),1)
             || coalesce(nullif(left(split_part(p.full_name,' ',2),1),''),''))) || '.png',
    updated_at = NOW()
FROM auth.users u
WHERE u.id = p.id AND u.email LIKE 'demo.client.%@example.com' AND p.avatar_url IS NULL;

-- 2. Брони и отзывы. Тексты разведены по категориям: одинаковый комментарий
--    под каждой карточкой выдал бы происхождение с первого экрана.
DO $$
DECLARE
  v_clients UUID[];
  r RECORD; k INT; h INT; n INT;
  v_rating INT; v_pos TEXT[]; v_neu TEXT[]; v_comment TEXT;
  v_start TIMESTAMPTZ; v_booking UUID; v_client UUID;
BEGIN
  SELECT array_agg(p.id ORDER BY p.id) INTO v_clients
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE u.email LIKE 'demo.client.%@example.com';

  FOR r IN
    SELECT DISTINCT ON (p.id) p.id AS pid, p.role::TEXT AS prole, c.slug AS cat, ps.service_id
    FROM public.profiles p
    JOIN public.provider_services ps ON ps.provider_id = p.id
    JOIN public.services s ON s.id = ps.service_id
    JOIN public.service_categories c ON c.id = s.category_id
    WHERE p.role IN ('specialist','venue')
    ORDER BY p.id, ps.service_id
  LOOP
    v_pos := CASE r.cat
      WHEN 'auto' THEN ARRAY['Приехал вовремя, по ходу работы всё объяснил.','Сделал за день, цену назвал сразу и не поменял.','Нашёл причину, которую в другом сервисе не увидели.','Работой доволен, машина едет ровно.','Взял недорого, сделал аккуратно.']
      WHEN 'beauty' THEN ARRAY['Аккуратно и спокойно, результат держится.','Пришла со своей идеей — сделали даже лучше.','Чисто, стерильно, всё по времени.','Отнеслись внимательно, ничего не навязывали.','Записалась вечером, приняли на следующий день.']
      WHEN 'business' THEN ARRAY['Отчёт получил в срок, всё по делу.','Разложил по полочкам, без лишней воды.','Взял задачу и довёл до конца.','Отвечает быстро, правки вносит без споров.','Помог разобраться там, где я буксовал полгода.']
      WHEN 'education' THEN ARRAY['Ребёнок стал заниматься с интересом.','Объясняет так, что наконец стало понятно.','Подтянули за пару месяцев, результат виден.','Занятия по делу, без воды и опозданий.','Подстроился под наш график.']
      WHEN 'events' THEN ARRAY['Праздник прошёл на одном дыхании, гости довольны.','Всё было по сценарию, без заминок.','Работал до конца вечера, никого не забыл.','Материал отдали быстро, качество отличное.','Учли все пожелания, даже мелкие.']
      WHEN 'home' THEN ARRAY['Приехал в тот же день, сделал быстро.','Убрал за собой, ничего не пришлось доделывать.','Цену сказал до начала и не поменял.','Работает аккуратно, видно, что не первый год.','Позвонил, предупредил, приехал вовремя.']
      WHEN 'it' THEN ARRAY['Задачу закрыл в срок, передал с документацией.','На созвонах по делу, вопросы задаёт правильные.','Сделал так, что дорабатывать не пришлось.','Взял сложную часть и разобрался сам.','Отвечает быстро, правки вносит спокойно.']
      WHEN 'legal' THEN ARRAY['Объяснил простым языком, без запугивания.','Документы подготовил быстро, приняли с первого раза.','Дело вёл спокойно и по существу.','Сэкономил и время, и нервы.','Честно сказал, где шансов нет.']
      WHEN 'leisure' THEN ARRAY['Отдохнули хорошо, всё как на фотографиях.','Чисто, тихо, до пляжа близко.','Встретили, показали, помогли с трансфером.','Детям понравилось, есть где побегать.','Заселили без задержек, вопросов не возникло.']
      WHEN 'food' THEN ARRAY['Кухня вкусная, обслуживают быстро.','Уютно, сидели допоздна, никто не торопил.','Порции большие, цены адекватные.','Заказ приняли точно, всё принесли горячим.','Хорошее место, вернёмся ещё.']
      ELSE ARRAY['Отметили компанией, всё понравилось.','Звук хороший, персонал не мешает.','Забронировали стол без проблем.','Атмосфера отличная, вернёмся.','Работают допоздна, это плюс.']
    END;
    v_neu := CASE r.cat
      WHEN 'auto' THEN ARRAY['Сделал нормально, но ждал дольше, чем договаривались.','По работе вопросов нет, по срокам были.']
      WHEN 'beauty' THEN ARRAY['Результат хороший, но пришлось подождать очередь.','В целом нормально, ожидала чуть большего.']
      WHEN 'business' THEN ARRAY['Работу сделал, но сроки сдвинулись на неделю.','Нормально, хотя ожидал более подробного отчёта.']
      WHEN 'education' THEN ARRAY['Занятия полезные, но хотелось бы больше практики.','Нормально, хотя темп для нас быстроват.']
      WHEN 'events' THEN ARRAY['В целом хорошо, но начали с задержкой.','Гостям понравилось, мне местами не хватило динамики.']
      WHEN 'home' THEN ARRAY['Сделал, но пришлось напоминать про сроки.','Работа нормальная, мусор убирал я сам.']
      WHEN 'it' THEN ARRAY['Результат нормальный, но сроки сдвинулись.','Работой доволен, коммуникации не хватало.']
      WHEN 'legal' THEN ARRAY['Помог, но ответы приходилось ждать долго.','По существу всё верно, по срокам не уложились.']
      WHEN 'leisure' THEN ARRAY['Место хорошее, но с уборкой были вопросы.','В целом нормально, ожидали чуть больше за эти деньги.']
      WHEN 'food' THEN ARRAY['Еда вкусная, но ждали дольше обычного.','Нормально, хотя вечером шумновато.']
      ELSE ARRAY['Место нормальное, но шумно даже для клуба.','Всё неплохо, кроме очереди в гардероб.']
    END;

    n := 2 + (abs(hashtext(r.pid::TEXT)) % 5);
    FOR k IN 0..(n - 1) LOOP
      h := abs(hashtext(r.pid::TEXT || ':' || k::TEXT));
      v_client := v_clients[1 + ((abs(hashtext(r.pid::TEXT)) + k * 7) % array_length(v_clients, 1))];
      CONTINUE WHEN v_client = r.pid;

      -- Пятёрки у всех подряд читаются как накрутка, поэтому распределение
      -- смещённое, но не идеальное: примерно каждый десятый отзыв на тройку.
      v_rating := CASE WHEN h % 10 < 6 THEN 5 WHEN h % 10 < 9 THEN 4 ELSE 3 END;
      v_comment := CASE WHEN v_rating = 3
        THEN v_neu[1 + (h % array_length(v_neu, 1))]
        ELSE v_pos[1 + (h % array_length(v_pos, 1))] END;
      v_start := NOW() - ((7 + (h % 170)) || ' days')::INTERVAL;

      IF r.prole = 'specialist' THEN
        INSERT INTO public.bookings (client_id, provider_id, service_id, kind, starts_at, status, created_at, updated_at)
        VALUES (v_client, r.pid, r.service_id, 'appointment', v_start, 'completed', v_start - INTERVAL '2 days', v_start)
        RETURNING id INTO v_booking;
      ELSE
        INSERT INTO public.bookings (client_id, provider_id, service_id, kind, starts_at, ends_at, guest_count, status, created_at, updated_at)
        VALUES (v_client, r.pid, r.service_id, 'stay', v_start,
                v_start + ((1 + h % 4) || ' days')::INTERVAL, 2 + (h % 5),
                'completed', v_start - INTERVAL '5 days', v_start)
        RETURNING id INTO v_booking;
      END IF;

      INSERT INTO public.reviews (booking_id, client_id, target_id, rating, comment, created_at)
      VALUES (v_booking, v_client, r.pid, v_rating, v_comment, v_start + INTERVAL '1 day');
    END LOOP;
  END LOOP;
END $$;
