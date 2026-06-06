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

UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url LIKE 'https://i.pravatar.cc/%';

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
