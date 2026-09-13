-- Доводит каждую подкатегорию каталога до шести исполнителей.
--
-- Зачем: demo-catalog.sql создавал по два профиля на услугу. Каталог выходил
-- широким, но тонким — открываешь «Ведущие и тамада», а там двое, и витрина
-- снова выглядит пустой, только на уровень глубже.
--
-- Файл добавляет только недостающих: сколько бы раз его ни запустить, в
-- услуге не станет больше шести. Имена берутся из пула, из которого вычтены
-- уже занятые, поэтому повторов нет. Описания, аватары, портфолио и отзывы
-- новым профилям раздают demo-catalog-enrich.sql (шаги 4–9),
-- demo-portfolio.sql и demo-reviews.sql — их нужно запустить после этого.

DO $$
DECLARE
  v_first_f TEXT[] := ARRAY['Айгерим','Асель','Динара','Жанна','Мадина','Сауле','Гульнара','Айнур','Камила','Алия','Назерке','Балжан','Аружан','Жанара','Томирис','Дана','Ляззат','Эльмира'];
  v_first_m TEXT[] := ARRAY['Данияр','Нурлан','Ерлан','Асхат','Тимур','Бекзат','Арман','Мурат','Санжар','Алишер','Дамир','Ержан','Айдос','Руслан','Ильяс','Максат','Олжас','Бауыржан'];
  v_last    TEXT[] := ARRAY['Сериков','Абдрахманов','Оспанов','Жумабеков','Каримов','Нурпеисов','Сагындыков','Токтаров','Бекмуратов','Алимбаев','Дюсенов','Мукашев','Ибраев','Калиев','Смагулов','Ахметов'];
  v_brand   TEXT[] := ARRAY['Аружан','Алтын','Керемет','Жетісу','Сарыарқа','Медеу','Тұмар','Шаңырақ','Береке','Самал','Нұрлы','Ару',
                            'Байтерек','Қарлығаш','Ақжол','Жібек','Тұлпар','Ұлытау','Айсұлу','Дәстүр','Мерей','Қуаныш','Асыл','Жұлдыз',
                            'Тәуелсіздік','Ақниет','Сая','Аққу','Нұрсая','Ақбота','Көктем','Алатау','Бірлік','Шұғыла','Даналық','Сұңқар',
                            'Ақмарал','Нұр','Мәртөбе','Жайлау','Арай','Құрмет','Достар','Мейірім','Ырыс','Қазына','Бақыт','Шаттық',
                            'Әсем','Кербез','Жансая','Ерке','Дария','Қанат','Сәуле','Бұлақ','Жасыл','Таң','Алау','Өркен'];
  v_city    TEXT[] := ARRAY['Алматы','Астана','Шымкент','Караганда','Актобе'];

  r RECORD; k INT; seq INT := 0;
  v_uid UUID; v_name TEXT; v_city_n TEXT; v_base INT; v_price INT; v_years INT;
  v_female BOOLEAN; v_last_name TEXT; v_try INT;
BEGIN
  FOR r IN
    SELECT s.id AS service_id, s.slug, c.slug AS cat_slug, c.provider_type,
           count(ps.provider_id) AS have
    FROM public.services s
    JOIN public.service_categories c ON c.id = s.category_id
    LEFT JOIN public.provider_services ps ON ps.service_id = s.id
    WHERE s.is_active AND c.is_active
    GROUP BY s.id, s.slug, c.slug, c.provider_type, c.sort_order, s.sort_order
    HAVING count(ps.provider_id) < 6
    ORDER BY c.sort_order, s.sort_order
  LOOP
    v_base := CASE r.cat_slug
      WHEN 'it' THEN 60000 WHEN 'business' THEN 40000 WHEN 'events' THEN 25000
      WHEN 'legal' THEN 20000 WHEN 'leisure' THEN 15000 WHEN 'auto' THEN 8000
      WHEN 'home' THEN 7000 WHEN 'beauty' THEN 6000 WHEN 'education' THEN 5000
      WHEN 'entertainment' THEN 5000 ELSE 4000 END;

    FOR k IN (r.have + 1)..6 LOOP
      seq := seq + 1;
      v_city_n := v_city[1 + ((seq * 3 + k) % 5)];
      v_price := v_base + (v_base / 10) * ((seq + k) % 7);
      v_years := 2 + ((seq * 7 + k) % 13);

      IF r.provider_type = 'specialist' THEN
        -- Медсестра и сиделка — существительные женского рода.
        v_female := r.slug IN ('nurses','caregivers') OR (seq + k) % 2 = 0;
        v_name := NULL;
        FOR v_try IN 0..600 LOOP
          v_last_name := v_last[1 + (((seq * 5 + v_try) / 18) % 16)];
          v_name := CASE WHEN v_female
            THEN v_first_f[1 + ((seq * 5 + v_try) % 18)] || ' ' || v_last_name || 'а'
            ELSE v_first_m[1 + ((seq * 5 + v_try) % 18)] || ' ' || v_last_name END;
          EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE full_name = v_name);
        END LOOP;
      ELSE
        FOR v_try IN 0..300 LOOP
          v_name := v_brand[1 + ((seq * 7 + v_try) % array_length(v_brand, 1))] || ' ' || v_city_n;
          EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE full_name = v_name);
        END LOOP;
      END IF;

      v_uid := gen_random_uuid();
      INSERT INTO auth.users (id, instance_id, aud, role, email, email_confirmed_at,
                              created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              format('demo.%s.%s@example.com', r.slug, k), NOW(), NOW(), NOW(),
              '{"provider":"email","providers":["email"]}'::JSONB,
              jsonb_build_object('full_name', v_name, 'city', v_city_n));

      UPDATE public.profiles
      SET full_name = v_name, city = v_city_n, role = r.provider_type::TEXT::public.account_role
      WHERE id = v_uid;

      -- Текст описания здесь временный: его перепишет demo-catalog-enrich.sql.
      IF r.provider_type = 'specialist' THEN
        INSERT INTO public.specialist_profiles (id, bio, experience_years, price_start)
        VALUES (v_uid, 'Демонстрационный профиль Taptym.', v_years, v_price)
        ON CONFLICT (id) DO NOTHING;
      ELSE
        INSERT INTO public.venue_profiles (id, description, address, capacity, price_from,
                                           has_wifi, has_parking, family_friendly)
        VALUES (v_uid, 'Демонстрационный профиль Taptym.', v_city_n,
                10 + ((seq * 3 + k) % 40) * 5, v_price,
                (seq + k) % 2 = 0, (seq + k) % 3 <> 0, (seq + k) % 4 <> 0)
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

  RAISE NOTICE 'Добавлено профилей: %', seq;
END $$;
