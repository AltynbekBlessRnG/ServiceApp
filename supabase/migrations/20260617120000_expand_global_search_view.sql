-- Расширение global_search_view: добавлены все venue и specialist поля
-- для корректного отображения в избранном, поиске и ProfileCard

DROP VIEW IF EXISTS public.global_search_view;

CREATE OR REPLACE VIEW public.global_search_view AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.city,
  p.role,
  c.name AS category_name,
  COALESCE(sp.bio, vp.description, '') AS description,
  -- Specialist поля
  COALESCE(sp.price_start, 0) AS price_start,
  COALESCE(sp.experience_years, 0) AS experience_years,
  COALESCE(sp.works_in_alakol, FALSE) AS works_in_alakol,
  sp.alakol_zone,
  -- Venue поля
  COALESCE(vp.price_from, 0) AS price_from,
  COALESCE(vp.capacity, 0) AS capacity,
  vp.distance_to_beach_m,
  vp.location_zone,
  COALESCE(vp.has_wifi, FALSE) AS has_wifi,
  COALESCE(vp.has_parking, FALSE) AS has_parking,
  COALESCE(vp.has_meals, FALSE) AS has_meals,
  COALESCE(vp.family_friendly, FALSE) AS family_friendly,
  COALESCE(vp.pet_friendly, FALSE) AS pet_friendly,
  vp.season_open,
  vp.season_close,
  COALESCE(vp.latitude, 0) AS latitude,
  COALESCE(vp.longitude, 0) AS longitude,
  -- Рейтинг
  COALESCE(sr.avg_rating, 0)::NUMERIC(10, 2) AS avg_rating,
  COALESCE(sr.review_count, 0) AS review_count
FROM public.profiles p
LEFT JOIN public.specialist_profiles sp ON sp.id = p.id
LEFT JOIN public.venue_profiles vp ON vp.id = p.id
LEFT JOIN public.categories c ON c.id = COALESCE(sp.category_id, vp.category_id)
LEFT JOIN public.specialist_search_view sr ON sr.id = p.id
WHERE p.role IN ('specialist', 'venue');

-- RLS политика для админов: полный доступ к profiles
CREATE POLICY "admin_select_all_profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "admin_update_all_profiles" ON public.profiles
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
