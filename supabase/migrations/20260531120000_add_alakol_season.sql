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
