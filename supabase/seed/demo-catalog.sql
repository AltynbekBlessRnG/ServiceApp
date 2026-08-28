-- Наполняет каталог демонстрационными исполнителями.
--
-- Зачем: на старте в базе было по одному специалисту и заведению, поэтому
-- любая категория открывалась пустым списком. Пустой каталог плохо выглядит на
-- витрине и попадает под пункт 4.2 правил Apple — приложение читается как
-- пустая оболочка.
--
-- Честность: у каждой карточки в описании прямо сказано, что профиль
-- демонстрационный, а отзывов и оценок не создаётся вовсе — выдуманные отзывы
-- вводят в заблуждение покупателя и Apple удаляет за них приложения. Карточки
-- без отзывов показывают метку NEW, как и положено новому сервису.
--
-- Удаление: см. supabase/seed/demo-catalog-down.sql. Все записи помечены
-- адресом вида demo.<услуга>.<номер>@example.com (example.com зарезервирован
-- RFC 2606 и никому не принадлежит).

DO $$
DECLARE
  v_first_f TEXT[] := ARRAY['Айгерим','Асель','Динара','Жанна','Мадина','Сауле','Гульнара','Айнур','Камила','Алия','Назерке','Балжан'];
  v_first_m TEXT[] := ARRAY['Данияр','Нурлан','Ерлан','Асхат','Тимур','Бекзат','Арман','Мурат','Санжар','Алишер','Дамир','Ержан'];
  v_last    TEXT[] := ARRAY['Сериков','Абдрахманов','Оспанов','Жумабеков','Каримов','Нурпеисов','Сагындыков','Токтаров','Бекмуратов','Алимбаев','Дюсенов','Мукашев'];
  v_brand   TEXT[] := ARRAY['Аружан','Алтын','Керемет','Жетісу','Сарыарқа','Медеу','Тұмар','Шаңырақ','Береке','Самал','Нұрлы','Ару'];
  v_city    TEXT[] := ARRAY['Алматы','Астана','Шымкент','Караганда','Актобе'];

  r         RECORD;
  n         INT;
  seq       INT := 0;
  v_uid     UUID;
  v_email   TEXT;
  v_name    TEXT;
  v_city_n  TEXT;
  v_price   INT;
  v_years   INT;
  v_base    INT;
BEGIN
  FOR r IN
    SELECT s.id AS service_id, s.slug, s.name AS service_name,
           c.slug AS cat_slug, c.provider_type
    FROM public.services s
    JOIN public.service_categories c ON c.id = s.category_id
    WHERE s.is_active AND c.is_active
    ORDER BY c.sort_order, s.sort_order
  LOOP
    v_base := CASE r.cat_slug
      WHEN 'it'            THEN 60000
      WHEN 'business'      THEN 40000
      WHEN 'events'        THEN 25000
      WHEN 'legal'         THEN 20000
      WHEN 'leisure'       THEN 15000
      WHEN 'auto'          THEN 8000
      WHEN 'home'          THEN 7000
      WHEN 'beauty'        THEN 6000
      WHEN 'education'     THEN 5000
      WHEN 'entertainment' THEN 5000
      ELSE 4000
    END;

    FOR n IN 1..2 LOOP
      seq := seq + 1;
      v_uid := gen_random_uuid();
      v_email := format('demo.%s.%s@example.com', r.slug, n);
      v_city_n := v_city[1 + (seq % array_length(v_city, 1))];
      v_price := v_base + (v_base / 10) * (seq % 6);
      v_years := 2 + (seq % 11);

      IF r.provider_type = 'specialist' THEN
        v_name := CASE WHEN seq % 2 = 0
          THEN v_first_f[1 + (seq % array_length(v_first_f, 1))] || ' ' || v_last[1 + (seq % array_length(v_last, 1))] || 'а'
          ELSE v_first_m[1 + (seq % array_length(v_first_m, 1))] || ' ' || v_last[1 + (seq % array_length(v_last, 1))]
        END;
      ELSE
        v_name := v_brand[1 + (seq % array_length(v_brand, 1))] || ' ' || v_city_n;
      END IF;

      INSERT INTO auth.users (id, instance_id, aud, role, email, email_confirmed_at,
                              created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              v_email, NOW(), NOW(), NOW(),
              '{"provider":"email","providers":["email"]}'::jsonb,
              jsonb_build_object('full_name', v_name, 'city', v_city_n));

      UPDATE public.profiles
      SET full_name = v_name, city = v_city_n, role = r.provider_type::TEXT::public.account_role
      WHERE id = v_uid;

      IF r.provider_type = 'specialist' THEN
        INSERT INTO public.specialist_profiles (id, bio, experience_years, price_start)
        VALUES (v_uid,
                format('%s, %s. Опыт %s лет. Демонстрационный профиль Taptym: каталог наполняется, реальные исполнители подключаются.',
                       r.service_name, v_city_n, v_years),
                v_years, v_price)
        ON CONFLICT (id) DO NOTHING;
      ELSE
        INSERT INTO public.venue_profiles (id, description, address, capacity, price_from,
                                           has_wifi, has_parking, family_friendly)
        VALUES (v_uid,
                format('%s в городе %s. Демонстрационный профиль Taptym: каталог наполняется, реальные заведения подключаются.',
                       r.service_name, v_city_n),
                v_city_n, 10 + (seq % 40) * 5, v_price,
                seq % 2 = 0, seq % 3 <> 0, seq % 4 <> 0)
        ON CONFLICT (id) DO NOTHING;
      END IF;

      INSERT INTO public.provider_verifications (provider_id, status, reviewed_at, review_note)
      VALUES (v_uid, 'approved', NOW(), 'Демонстрационный профиль каталога')
      ON CONFLICT (provider_id) DO UPDATE SET status = 'approved', reviewed_at = NOW();

      INSERT INTO public.provider_services (provider_id, service_id, price_from)
      VALUES (v_uid, r.service_id, v_price)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Создано демонстрационных профилей: %', seq;
END $$;

-- Раздел «Алаколь» на главной фильтрует заведения по зонам Акши, Коктума и
-- Ушарал. Без них хаб открывается надписью «Пока нет объектов в этой зоне».
DO $$
DECLARE
  v_zone TEXT[] := ARRAY['akshi','koktuma','usharal'];
  v_zone_ru TEXT[] := ARRAY['Акши','Коктума','Ушарал'];
  v_brand TEXT[] := ARRAY['Жагалау','Алтын Кум','Тұмар','Балхаш','Сая','Аққу'];
  v_svc INT[] := ARRAY[55,54,53,52,55,54];
  i INT; z INT; v_uid UUID; v_email TEXT; v_name TEXT; v_price INT;
BEGIN
  FOR i IN 1..6 LOOP
    z := 1 + ((i - 1) % 3);
    v_uid := gen_random_uuid();
    v_email := format('demo.alakol.%s@example.com', i);
    v_name := v_brand[i] || ' ' || v_zone_ru[z];
    v_price := 12000 + i * 3000;
    INSERT INTO auth.users (id, instance_id, aud, role, email, email_confirmed_at,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', v_name, 'city', v_zone_ru[z]));
    UPDATE public.profiles SET full_name = v_name, city = v_zone_ru[z], role = 'venue' WHERE id = v_uid;
    INSERT INTO public.venue_profiles (id, description, address, capacity, price_from,
                                       location_zone, distance_to_beach_m,
                                       has_wifi, has_parking, has_meals, family_friendly, pet_friendly)
    VALUES (v_uid,
            format('База отдыха на Алаколе, зона %s. Демонстрационный профиль Taptym: каталог наполняется, реальные объекты подключаются.', v_zone_ru[z]),
            v_zone_ru[z], 20 + i * 10, v_price, v_zone[z], 50 + i * 60,
            i % 2 = 0, true, i % 2 = 1, true, i % 3 = 0)
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.provider_verifications (provider_id, status, reviewed_at, review_note)
    VALUES (v_uid, 'approved', NOW(), 'Демонстрационный профиль каталога')
    ON CONFLICT (provider_id) DO UPDATE SET status = 'approved', reviewed_at = NOW();
    INSERT INTO public.provider_services (provider_id, service_id, price_from)
    VALUES (v_uid, v_svc[i], v_price) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
