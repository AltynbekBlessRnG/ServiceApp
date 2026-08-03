INSERT INTO public.service_categories (slug, provider_type, name, icon, sort_order) VALUES
  ('food', 'venue', 'Питание', 'coffee', 80),
  ('entertainment', 'venue', 'Развлечения', 'music', 90)
ON CONFLICT (provider_type, slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

INSERT INTO public.conversations(kind, category_id)
SELECT 'category', category.id
FROM public.service_categories category
WHERE category.provider_type = 'venue'
  AND category.slug IN ('food', 'entertainment')
  AND NOT EXISTS (
    SELECT 1
    FROM public.conversations conversation
    WHERE conversation.kind = 'category'
      AND conversation.category_id = category.id
  );

WITH seed(provider_type, category_slug, slug, name, icon, sort_order) AS (
  VALUES
    ('specialist'::public.provider_type, 'beauty', 'nurses', 'Медсёстры', 'activity', 60),
    ('specialist'::public.provider_type, 'beauty', 'rehabilitation', 'Реабилитологи', 'activity', 70),
    ('specialist'::public.provider_type, 'beauty', 'physical-therapy', 'Специалисты ЛФК', 'activity', 80),
    ('specialist'::public.provider_type, 'beauty', 'caregivers', 'Сиделки', 'users', 90),
    ('specialist'::public.provider_type, 'auto', 'diagnostics', 'Автодиагносты', 'search', 10),
    ('specialist'::public.provider_type, 'auto', 'mechanics', 'Автомеханики', 'tool', 20),
    ('specialist'::public.provider_type, 'auto', 'auto-electricians', 'Автоэлектрики', 'zap', 30),
    ('specialist'::public.provider_type, 'auto', 'tire-specialists', 'Мастера шиномонтажа', 'circle', 40),
    ('specialist'::public.provider_type, 'auto', 'interior-cleaning', 'Химчистка салона', 'droplet', 50),
    ('specialist'::public.provider_type, 'auto', 'car-selection', 'Автоподбор', 'search', 60),
    ('specialist'::public.provider_type, 'auto', 'mobile-repair', 'Выездной ремонт', 'tool', 70),
    ('specialist'::public.provider_type, 'leisure', 'guides', 'Гиды и экскурсоводы', 'map', 10),
    ('specialist'::public.provider_type, 'leisure', 'tour-organizers', 'Организаторы туров', 'compass', 20),
    ('specialist'::public.provider_type, 'leisure', 'transfers', 'Трансфер и водители', 'navigation', 30),
    ('specialist'::public.provider_type, 'leisure', 'outdoor-instructors', 'Инструкторы активного отдыха', 'activity', 40),
    ('specialist'::public.provider_type, 'leisure', 'equipment-rental', 'Прокат туристического оборудования', 'package', 50),
    ('specialist'::public.provider_type, 'leisure', 'travel-agents', 'Туристические агенты', 'briefcase', 60),
    ('specialist'::public.provider_type, 'home', 'cleaners', 'Клинеры', 'home', 50),
    ('specialist'::public.provider_type, 'home', 'furniture-assembly', 'Сборщики мебели', 'tool', 60),
    ('specialist'::public.provider_type, 'home', 'finishing', 'Мастера отделочных работ', 'layers', 70),
    ('specialist'::public.provider_type, 'home', 'appliance-repair', 'Ремонт бытовой техники', 'settings', 80),
    ('specialist'::public.provider_type, 'home', 'installers', 'Установщики', 'tool', 90),
    ('specialist'::public.provider_type, 'home', 'upholstery-cleaning', 'Химчистка мебели', 'droplet', 100),
    ('venue'::public.provider_type, 'food', 'restaurants', 'Рестораны', 'coffee', 10),
    ('venue'::public.provider_type, 'food', 'pubs', 'Пабы', 'star', 20),
    ('venue'::public.provider_type, 'food', 'coffee-shops', 'Кофейни', 'coffee', 30),
    ('venue'::public.provider_type, 'food', 'pizzerias', 'Пиццерии', 'coffee', 40),
    ('venue'::public.provider_type, 'food', 'hookah-lounges', 'Кальянные', 'cloud', 50),
    ('venue'::public.provider_type, 'entertainment', 'bars', 'Бары', 'star', 10),
    ('venue'::public.provider_type, 'entertainment', 'computer-clubs', 'Компьютерные клубы', 'monitor', 20),
    ('venue'::public.provider_type, 'entertainment', 'karaoke', 'Караоке', 'mic', 30),
    ('venue'::public.provider_type, 'entertainment', 'nightclubs', 'Ночные клубы', 'music', 40)
)
INSERT INTO public.services(category_id, slug, name, icon, sort_order)
SELECT category.id, seed.slug, seed.name, seed.icon, seed.sort_order
FROM seed
JOIN public.service_categories category
  ON category.provider_type = seed.provider_type
 AND category.slug = seed.category_slug
ON CONFLICT (category_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

UPDATE public.services service
SET is_active = FALSE
FROM public.service_categories category
WHERE category.id = service.category_id
  AND category.provider_type = 'specialist'
  AND category.slug = 'leisure'
  AND service.slug IN ('recreation', 'glamping', 'hotels', 'sanatoriums', 'camps');

CREATE OR REPLACE FUNCTION public.replace_my_provider_services(
  p_category_id BIGINT,
  p_service_ids BIGINT[],
  p_price_from INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  expected_type public.provider_type;
  selected_count INTEGER;
  valid_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_price_from < 0 THEN
    RAISE EXCEPTION 'invalid_price';
  END IF;

  SELECT profile.role
  INTO expected_type
  FROM public.profiles profile
  WHERE profile.id = auth.uid()
    AND profile.role IN ('specialist', 'venue');

  IF expected_type IS NULL THEN
    RAISE EXCEPTION 'invalid_provider_role';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.service_categories category
    WHERE category.id = p_category_id
      AND category.provider_type = expected_type
      AND category.is_active
  ) THEN
    RAISE EXCEPTION 'invalid_category';
  END IF;

  SELECT COUNT(DISTINCT service_id)
  INTO selected_count
  FROM unnest(COALESCE(p_service_ids, ARRAY[]::BIGINT[])) AS selected(service_id);

  IF selected_count = 0 THEN
    RAISE EXCEPTION 'select_at_least_one_service';
  END IF;

  SELECT COUNT(*)
  INTO valid_count
  FROM public.services service
  WHERE service.id = ANY(p_service_ids)
    AND service.category_id = p_category_id
    AND service.is_active;

  IF valid_count <> selected_count THEN
    RAISE EXCEPTION 'invalid_service_selection';
  END IF;

  DELETE FROM public.provider_services
  WHERE provider_id = auth.uid();

  INSERT INTO public.provider_services(provider_id, service_id, price_from)
  SELECT auth.uid(), selected.service_id, p_price_from
  FROM (
    SELECT DISTINCT unnest(p_service_ids) AS service_id
  ) selected;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_my_provider_services(BIGINT, BIGINT[], INTEGER)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_my_provider_services(BIGINT, BIGINT[], INTEGER)
TO authenticated;
