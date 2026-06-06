CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP VIEW IF EXISTS specialist_search_view;
DROP VIEW IF EXISTS global_search_view;

DROP TABLE IF EXISTS category_messages;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS portfolio;
DROP TABLE IF EXISTS busy_times;
DROP TABLE IF EXISTS busy_dates;
DROP TABLE IF EXISTS specialist_subcategories;
DROP TABLE IF EXISTS subcategories;
DROP TABLE IF EXISTS venue_profiles;
DROP TABLE IF EXISTS specialist_profiles;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS profiles;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('client', 'specialist', 'venue', 'admin')),
  city TEXT,
  phone TEXT,
  push_token TEXT,
  balance INTEGER NOT NULL DEFAULT 0,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('specialist', 'venue')),
  image_url TEXT,
  bg_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (type, name)
);

CREATE TABLE public.subcategories (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, name)
);

CREATE TABLE public.specialist_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio TEXT,
  experience_years INTEGER NOT NULL DEFAULT 0,
  price_start INTEGER NOT NULL DEFAULT 0,
  category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.specialist_subcategories (
  specialist_id UUID NOT NULL REFERENCES public.specialist_profiles(id) ON DELETE CASCADE,
  subcategory_id INTEGER NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (specialist_id, subcategory_id)
);

CREATE TABLE public.venue_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT,
  address TEXT,
  capacity INTEGER NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_type TEXT NOT NULL DEFAULT 'image' CHECK (file_type IN ('image', 'video')),
  in_feed BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_hero BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'completed')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.category_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.busy_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (specialist_id, date)
);

CREATE TABLE public.busy_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (specialist_id, date, time)
);

CREATE INDEX idx_specialist_profiles_category ON public.specialist_profiles(category_id);
CREATE INDEX idx_venue_profiles_category ON public.venue_profiles(category_id);
CREATE INDEX idx_bookings_client ON public.bookings(client_id);
CREATE INDEX idx_bookings_specialist ON public.bookings(specialist_id);
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX idx_category_messages_category ON public.category_messages(category_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_portfolio_specialist ON public.portfolio(specialist_id);
CREATE INDEX idx_busy_dates_specialist ON public.busy_dates(specialist_id);
CREATE INDEX idx_busy_times_specialist_date ON public.busy_times(specialist_id, date);

INSERT INTO public.categories (name, type, bg_color) VALUES
  ('Барберы', 'specialist', '#2ED573'),
  ('Маникюр', 'specialist', '#E056FD'),
  ('Макияж', 'specialist', '#FF6B81'),
  ('Фотографы', 'specialist', '#3742FA'),
  ('Репетиторы', 'specialist', '#1E90FF'),
  ('Массаж', 'specialist', '#00D2D3'),
  ('Салоны красоты', 'venue', '#8A2BE2'),
  ('Барбершопы', 'venue', '#2ED573'),
  ('Кофейни', 'venue', '#FFA502'),
  ('Фотостудии', 'venue', '#3742FA');

INSERT INTO public.subcategories (category_id, name)
SELECT category_id, name
FROM (
  VALUES
    ((SELECT id FROM public.categories WHERE name = 'Барберы' AND type = 'specialist'), 'Fade'),
    ((SELECT id FROM public.categories WHERE name = 'Барберы' AND type = 'specialist'), 'Борода'),
    ((SELECT id FROM public.categories WHERE name = 'Маникюр' AND type = 'specialist'), 'Гель-лак'),
    ((SELECT id FROM public.categories WHERE name = 'Маникюр' AND type = 'specialist'), 'Наращивание'),
    ((SELECT id FROM public.categories WHERE name = 'Макияж' AND type = 'specialist'), 'Свадебный'),
    ((SELECT id FROM public.categories WHERE name = 'Макияж' AND type = 'specialist'), 'Вечерний'),
    ((SELECT id FROM public.categories WHERE name = 'Фотографы' AND type = 'specialist'), 'Портрет'),
    ((SELECT id FROM public.categories WHERE name = 'Фотографы' AND type = 'specialist'), 'Свадьба'),
    ((SELECT id FROM public.categories WHERE name = 'Репетиторы' AND type = 'specialist'), 'Английский'),
    ((SELECT id FROM public.categories WHERE name = 'Репетиторы' AND type = 'specialist'), 'Математика'),
    ((SELECT id FROM public.categories WHERE name = 'Массаж' AND type = 'specialist'), 'Спина'),
    ((SELECT id FROM public.categories WHERE name = 'Массаж' AND type = 'specialist'), 'Расслабляющий')
) AS seed(category_id, name)
WHERE category_id IS NOT NULL;

CREATE OR REPLACE VIEW public.specialist_search_view AS
SELECT
  sp.id,
  sp.bio,
  sp.experience_years,
  sp.price_start,
  sp.category_id,
  p.full_name,
  p.avatar_url,
  p.city,
  p.role,
  c.name AS category_name,
  COALESCE(AVG(r.rating), 0)::NUMERIC(10, 2) AS avg_rating,
  COUNT(r.id) AS review_count
FROM public.specialist_profiles sp
JOIN public.profiles p ON p.id = sp.id
LEFT JOIN public.categories c ON c.id = sp.category_id
LEFT JOIN public.reviews r ON r.target_id = sp.id
GROUP BY sp.id, p.id, c.name;

CREATE OR REPLACE VIEW public.global_search_view AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.city,
  p.role,
  c.name AS category_name,
  COALESCE(sp.bio, vp.description, '') AS description,
  COALESCE(sp.price_start, 0) AS price_start,
  COALESCE(vp.latitude, 0) AS latitude,
  COALESCE(vp.longitude, 0) AS longitude,
  COALESCE(sr.avg_rating, 0)::NUMERIC(10, 2) AS avg_rating
FROM public.profiles p
LEFT JOIN public.specialist_profiles sp ON sp.id = p.id
LEFT JOIN public.venue_profiles vp ON vp.id = p.id
LEFT JOIN public.categories c ON c.id = COALESCE(sp.category_id, vp.category_id)
LEFT JOIN public.specialist_search_view sr ON sr.id = p.id
WHERE p.role IN ('specialist', 'venue');

CREATE OR REPLACE FUNCTION public.get_my_chats()
RETURNS TABLE (
  partner_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH last_messages AS (
    SELECT
      CASE
        WHEN m.sender_id = auth.uid() THEN m.receiver_id
        ELSE m.sender_id
      END AS partner,
      m.content,
      m.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY CASE
          WHEN m.sender_id = auth.uid() THEN m.receiver_id
          ELSE m.sender_id
        END
        ORDER BY m.created_at DESC
      ) AS rn
    FROM public.messages m
    WHERE m.sender_id = auth.uid() OR m.receiver_id = auth.uid()
  )
  SELECT p.id, p.full_name, p.avatar_url, lm.content, lm.created_at
  FROM last_messages lm
  JOIN public.profiles p ON p.id = lm.partner
  WHERE lm.rn = 1
  ORDER BY lm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, city)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NULL,
    NEW.raw_user_meta_data->>'city'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.busy_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.busy_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_public" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "categories_select_public" ON public.categories
FOR SELECT USING (true);

CREATE POLICY "subcategories_select_public" ON public.subcategories
FOR SELECT USING (true);

CREATE POLICY "specialist_profiles_select_public" ON public.specialist_profiles
FOR SELECT USING (true);

CREATE POLICY "specialist_profiles_insert_own" ON public.specialist_profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "specialist_profiles_update_own" ON public.specialist_profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "specialist_subcategories_select_public" ON public.specialist_subcategories
FOR SELECT USING (true);

CREATE POLICY "specialist_subcategories_insert_own" ON public.specialist_subcategories
FOR INSERT WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "specialist_subcategories_delete_own" ON public.specialist_subcategories
FOR DELETE USING (auth.uid() = specialist_id);

CREATE POLICY "venue_profiles_select_public" ON public.venue_profiles
FOR SELECT USING (true);

CREATE POLICY "venue_profiles_insert_own" ON public.venue_profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "venue_profiles_update_own" ON public.venue_profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "portfolio_select_public" ON public.portfolio
FOR SELECT USING (true);

CREATE POLICY "portfolio_insert_own" ON public.portfolio
FOR INSERT WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "portfolio_update_own" ON public.portfolio
FOR UPDATE USING (auth.uid() = specialist_id)
WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "portfolio_delete_own" ON public.portfolio
FOR DELETE USING (auth.uid() = specialist_id);

CREATE POLICY "bookings_select_participants" ON public.bookings
FOR SELECT USING (auth.uid() = client_id OR auth.uid() = specialist_id);

CREATE POLICY "bookings_insert_client" ON public.bookings
FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "bookings_update_specialist" ON public.bookings
FOR UPDATE USING (auth.uid() = specialist_id)
WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "reviews_select_public" ON public.reviews
FOR SELECT USING (true);

CREATE POLICY "reviews_insert_client" ON public.reviews
FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "reviews_update_client" ON public.reviews
FOR UPDATE USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "favorites_select_owner" ON public.favorites
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_owner" ON public.favorites
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_owner" ON public.favorites
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "messages_select_participants" ON public.messages
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_insert_sender" ON public.messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update_receiver" ON public.messages
FOR UPDATE USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "category_messages_select_authenticated" ON public.category_messages
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "category_messages_insert_sender" ON public.category_messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "notifications_select_owner" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_owner" ON public.notifications
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_owner" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "busy_dates_select_public" ON public.busy_dates
FOR SELECT USING (true);

CREATE POLICY "busy_dates_insert_own" ON public.busy_dates
FOR INSERT WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "busy_dates_update_own" ON public.busy_dates
FOR UPDATE USING (auth.uid() = specialist_id)
WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "busy_dates_delete_own" ON public.busy_dates
FOR DELETE USING (auth.uid() = specialist_id);

CREATE POLICY "busy_times_select_public" ON public.busy_times
FOR SELECT USING (true);

CREATE POLICY "busy_times_insert_own" ON public.busy_times
FOR INSERT WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "busy_times_update_own" ON public.busy_times
FOR UPDATE USING (auth.uid() = specialist_id)
WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "busy_times_delete_own" ON public.busy_times
FOR DELETE USING (auth.uid() = specialist_id);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS works_in_alakol BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS alakol_zone TEXT CHECK (alakol_zone IN ('akshi', 'koktuma', 'usharal'));

ALTER TABLE public.venue_profiles
ADD COLUMN IF NOT EXISTS location_zone TEXT CHECK (location_zone IN ('akshi', 'koktuma', 'usharal')),
ADD COLUMN IF NOT EXISTS price_from INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS distance_to_beach_m INTEGER,
ADD COLUMN IF NOT EXISTS has_wifi BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_parking BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_meals BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS family_friendly BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS season_open TEXT,
ADD COLUMN IF NOT EXISTS season_close TEXT;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_type TEXT NOT NULL DEFAULT 'specialist' CHECK (booking_type IN ('specialist', 'venue')),
ADD COLUMN IF NOT EXISTS guest_count INTEGER,
ADD COLUMN IF NOT EXISTS check_in_date TEXT,
ADD COLUMN IF NOT EXISTS check_out_date TEXT;

INSERT INTO public.categories (name, type, bg_color) VALUES
  ('Трансфер', 'specialist', '#00D2D3'),
  ('Детские услуги', 'specialist', '#FF6B81'),
  ('Развлечения и аренда', 'specialist', '#FFA502'),
  ('Зоны отдыха', 'venue', '#00D2D3'),
  ('Пансионаты', 'venue', '#1E90FF'),
  ('Гостевые дома', 'venue', '#7BED9F'),
  ('Коттеджи', 'venue', '#A55EEA')
ON CONFLICT (type, name) DO NOTHING;

INSERT INTO public.subcategories (category_id, name)
SELECT category_id, name
FROM (
  VALUES
    ((SELECT id FROM public.categories WHERE name = 'Трансфер' AND type = 'specialist'), 'Ушарал - Алаколь'),
    ((SELECT id FROM public.categories WHERE name = 'Трансфер' AND type = 'specialist'), 'Между зонами отдыха'),
    ((SELECT id FROM public.categories WHERE name = 'Детские услуги' AND type = 'specialist'), 'Няня'),
    ((SELECT id FROM public.categories WHERE name = 'Детские услуги' AND type = 'specialist'), 'Аниматор'),
    ((SELECT id FROM public.categories WHERE name = 'Развлечения и аренда' AND type = 'specialist'), 'SUP и катамараны'),
    ((SELECT id FROM public.categories WHERE name = 'Развлечения и аренда' AND type = 'specialist'), 'Экскурсии'),
    ((SELECT id FROM public.categories WHERE name = 'Зоны отдыха' AND type = 'venue'), 'У берега'),
    ((SELECT id FROM public.categories WHERE name = 'Зоны отдыха' AND type = 'venue'), 'Семейный отдых'),
    ((SELECT id FROM public.categories WHERE name = 'Пансионаты' AND type = 'venue'), 'С питанием'),
    ((SELECT id FROM public.categories WHERE name = 'Пансионаты' AND type = 'venue'), 'Все включено'),
    ((SELECT id FROM public.categories WHERE name = 'Гостевые дома' AND type = 'venue'), '2-4 гостя'),
    ((SELECT id FROM public.categories WHERE name = 'Коттеджи' AND type = 'venue'), 'Компания 6+')
) AS seed(category_id, name)
WHERE category_id IS NOT NULL
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO public.categories (name, type, bg_color) VALUES
  ('IT и диджитал', 'specialist', '#00D2D3'),
  ('Автоуслуги', 'specialist', '#FF4757'),
  ('Дизайн и реклама', 'specialist', '#FFA502'),
  ('Ивенты и праздники', 'specialist', '#FF6B81'),
  ('Клининг и дом', 'specialist', '#7BED9F'),
  ('Медицина', 'specialist', '#FF6348'),
  ('Ремонт и стройка', 'specialist', '#A55EEA'),
  ('Салоны красоты', 'specialist', '#E056FD'),
  ('Фото и видео', 'specialist', '#3742FA'),
  ('Юридические услуги', 'specialist', '#5352ED')
ON CONFLICT (type, name) DO NOTHING;

INSERT INTO public.subcategories (category_id, name)
SELECT category_id, name
FROM (
  VALUES
    ((SELECT id FROM public.categories WHERE name = 'IT и диджитал' AND type = 'specialist'), 'Разработка сайтов'),
    ((SELECT id FROM public.categories WHERE name = 'IT и диджитал' AND type = 'specialist'), 'Мобильные приложения'),
    ((SELECT id FROM public.categories WHERE name = 'Автоуслуги' AND type = 'specialist'), 'Диагностика'),
    ((SELECT id FROM public.categories WHERE name = 'Автоуслуги' AND type = 'specialist'), 'Химчистка'),
    ((SELECT id FROM public.categories WHERE name = 'Дизайн и реклама' AND type = 'specialist'), 'Логотипы'),
    ((SELECT id FROM public.categories WHERE name = 'Дизайн и реклама' AND type = 'specialist'), 'SMM'),
    ((SELECT id FROM public.categories WHERE name = 'Ивенты и праздники' AND type = 'specialist'), 'Ведущий'),
    ((SELECT id FROM public.categories WHERE name = 'Ивенты и праздники' AND type = 'specialist'), 'Декор'),
    ((SELECT id FROM public.categories WHERE name = 'Клининг и дом' AND type = 'specialist'), 'Уборка квартир'),
    ((SELECT id FROM public.categories WHERE name = 'Клининг и дом' AND type = 'specialist'), 'Химчистка мебели'),
    ((SELECT id FROM public.categories WHERE name = 'Медицина' AND type = 'specialist'), 'Медсестра'),
    ((SELECT id FROM public.categories WHERE name = 'Медицина' AND type = 'specialist'), 'Реабилитация'),
    ((SELECT id FROM public.categories WHERE name = 'Ремонт и стройка' AND type = 'specialist'), 'Сантехник'),
    ((SELECT id FROM public.categories WHERE name = 'Ремонт и стройка' AND type = 'specialist'), 'Электрик'),
    ((SELECT id FROM public.categories WHERE name = 'Салоны красоты' AND type = 'specialist'), 'Брови'),
    ((SELECT id FROM public.categories WHERE name = 'Салоны красоты' AND type = 'specialist'), 'Ресницы'),
    ((SELECT id FROM public.categories WHERE name = 'Фото и видео' AND type = 'specialist'), 'Видеосъемка'),
    ((SELECT id FROM public.categories WHERE name = 'Фото и видео' AND type = 'specialist'), 'Монтаж'),
    ((SELECT id FROM public.categories WHERE name = 'Юридические услуги' AND type = 'specialist'), 'Консультации'),
    ((SELECT id FROM public.categories WHERE name = 'Юридические услуги' AND type = 'specialist'), 'Документы')
) AS seed(category_id, name)
WHERE category_id IS NOT NULL
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_public_read" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_update_own" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_delete_own" ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "portfolio_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'portfolio');

CREATE POLICY "portfolio_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "portfolio_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "portfolio_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
