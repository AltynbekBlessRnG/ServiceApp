INSERT INTO public.service_categories (slug, provider_type, name, icon, sort_order) VALUES
  ('events', 'specialist', 'Праздники и события', 'gift', 10),
  ('beauty', 'specialist', 'Красота и здоровье', 'heart', 20),
  ('auto', 'specialist', 'Автоуслуги', 'truck', 30),
  ('leisure', 'specialist', 'Отдых и туризм', 'sun', 40),
  ('business', 'specialist', 'Бизнес и маркетинг', 'trending-up', 50),
  ('legal', 'specialist', 'Юридические услуги', 'briefcase', 60),
  ('home', 'specialist', 'Бытовые услуги / Ремонт', 'home', 70),
  ('education', 'specialist', 'Образование и спорт', 'book-open', 80),
  ('it', 'specialist', 'IT и Digital', 'cpu', 90),
  ('events', 'venue', 'Праздники и события', 'gift', 10),
  ('beauty', 'venue', 'Красота и здоровье', 'heart', 20),
  ('auto', 'venue', 'Автоуслуги', 'truck', 30),
  ('leisure', 'venue', 'Отдых и туризм', 'home', 40),
  ('legal', 'venue', 'Юридические услуги', 'briefcase', 50),
  ('home', 'venue', 'Бытовые услуги / Ремонт', 'home', 60),
  ('education', 'venue', 'Образование и спорт', 'book-open', 70)
ON CONFLICT (provider_type, slug) DO UPDATE SET
  name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, is_active = TRUE;

INSERT INTO public.conversations(kind, category_id)
SELECT 'category', id FROM public.service_categories
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversations c WHERE c.kind = 'category' AND c.category_id = service_categories.id
);

WITH seed(provider_type, category_slug, slug, name, icon, sort_order) AS (
  VALUES
    ('specialist'::public.provider_type, 'events', 'hosts', 'Ведущие и тамада', 'mic', 10),
    ('specialist'::public.provider_type, 'events', 'photographers', 'Фотографы', 'camera', 20),
    ('specialist'::public.provider_type, 'events', 'videographers', 'Видеографы', 'video', 30),
    ('specialist'::public.provider_type, 'events', 'musicians', 'Музыканты и артисты', 'music', 40),
    ('specialist'::public.provider_type, 'events', 'decorators', 'Оформители и декораторы', 'pen-tool', 50),
    ('specialist'::public.provider_type, 'beauty', 'nail-artists', 'Мастера маникюра', 'edit-3', 10),
    ('specialist'::public.provider_type, 'beauty', 'makeup-artists', 'Визажисты', 'feather', 20),
    ('specialist'::public.provider_type, 'beauty', 'massage', 'Массажисты', 'smile', 30),
    ('specialist'::public.provider_type, 'beauty', 'cosmetology', 'Косметологи', 'star', 40),
    ('specialist'::public.provider_type, 'beauty', 'stylists', 'Стилисты', 'scissors', 50),
    ('specialist'::public.provider_type, 'auto', 'car-selection', 'Автоподбор', 'search', 10),
    ('specialist'::public.provider_type, 'auto', 'mobile-repair', 'Выездной ремонт', 'tool', 20),
    ('specialist'::public.provider_type, 'leisure', 'recreation', 'Зоны и базы отдыха', 'sun', 10),
    ('specialist'::public.provider_type, 'leisure', 'glamping', 'Глэмпинги', 'home', 20),
    ('specialist'::public.provider_type, 'leisure', 'hotels', 'Отели и хостелы', 'home', 30),
    ('specialist'::public.provider_type, 'leisure', 'sanatoriums', 'Санатории', 'activity', 40),
    ('specialist'::public.provider_type, 'leisure', 'camps', 'Детские лагеря', 'users', 50),
    ('specialist'::public.provider_type, 'business', 'smm', 'SMM-менеджеры', 'share-2', 10),
    ('specialist'::public.provider_type, 'business', 'marketing', 'Таргетологи и маркетологи', 'target', 20),
    ('specialist'::public.provider_type, 'business', 'design', 'Дизайнеры', 'pen-tool', 30),
    ('specialist'::public.provider_type, 'business', 'accounting', 'Бухгалтеры', 'hash', 40),
    ('specialist'::public.provider_type, 'business', 'consulting', 'Консультанты', 'briefcase', 50),
    ('specialist'::public.provider_type, 'legal', 'lawyers', 'Юристы', 'shield', 10),
    ('specialist'::public.provider_type, 'legal', 'advocates', 'Адвокаты', 'shield', 20),
    ('specialist'::public.provider_type, 'legal', 'notaries', 'Нотариусы', 'file', 30),
    ('specialist'::public.provider_type, 'home', 'plumbing', 'Сантехники', 'droplet', 10),
    ('specialist'::public.provider_type, 'home', 'electrical', 'Электрики', 'zap', 20),
    ('specialist'::public.provider_type, 'home', 'repair', 'Мастера по ремонту', 'tool', 30),
    ('specialist'::public.provider_type, 'home', 'handyman', 'Мастер на час', 'clock', 40),
    ('specialist'::public.provider_type, 'education', 'tutors', 'Репетиторы', 'book', 10),
    ('specialist'::public.provider_type, 'education', 'trainers', 'Тренеры', 'activity', 20),
    ('specialist'::public.provider_type, 'education', 'driving', 'Инструкторы по вождению', 'navigation', 30),
    ('specialist'::public.provider_type, 'it', 'frontend', 'Frontend-разработчики', 'monitor', 10),
    ('specialist'::public.provider_type, 'it', 'backend', 'Backend-разработчики', 'server', 20),
    ('specialist'::public.provider_type, 'it', 'devops', 'DevOps-инженеры', 'cloud', 30),
    ('specialist'::public.provider_type, 'it', 'mobile', 'Мобильные разработчики', 'smartphone', 40),
    ('specialist'::public.provider_type, 'it', 'ui-ux', 'UI/UX-дизайнеры', 'pen-tool', 50),
    ('specialist'::public.provider_type, 'it', 'analytics', 'Аналитики данных', 'bar-chart', 60),
    ('venue'::public.provider_type, 'events', 'banquet', 'Рестораны и банкетные залы', 'coffee', 10),
    ('venue'::public.provider_type, 'events', 'catering', 'Кейтеринг', 'coffee', 20),
    ('venue'::public.provider_type, 'events', 'photo-studios', 'Фотостудии', 'camera', 30),
    ('venue'::public.provider_type, 'beauty', 'beauty-salons', 'Салоны красоты', 'star', 10),
    ('venue'::public.provider_type, 'beauty', 'barbershops', 'Барбершопы', 'scissors', 20),
    ('venue'::public.provider_type, 'beauty', 'spa', 'SPA-центры', 'heart', 30),
    ('venue'::public.provider_type, 'beauty', 'dentistry', 'Стоматологии', 'smile', 40),
    ('venue'::public.provider_type, 'auto', 'service-stations', 'СТО (Сервис)', 'tool', 10),
    ('venue'::public.provider_type, 'auto', 'detailing', 'Детейлинг-центры', 'droplet', 20),
    ('venue'::public.provider_type, 'auto', 'car-wash', 'Автомойки', 'droplet', 30),
    ('venue'::public.provider_type, 'auto', 'tire-service', 'Шиномонтаж', 'circle', 40),
    ('venue'::public.provider_type, 'auto', 'car-rental', 'Аренда авто', 'navigation', 50),
    ('venue'::public.provider_type, 'leisure', 'recreation', 'Зоны и базы отдыха', 'sun', 10),
    ('venue'::public.provider_type, 'leisure', 'glamping', 'Глэмпинги', 'home', 20),
    ('venue'::public.provider_type, 'leisure', 'hotels', 'Отели и хостелы', 'home', 30),
    ('venue'::public.provider_type, 'leisure', 'sanatoriums', 'Санатории', 'activity', 40),
    ('venue'::public.provider_type, 'leisure', 'camps', 'Детские лагеря', 'users', 50),
    ('venue'::public.provider_type, 'legal', 'law-firms', 'Юридические компании', 'shield', 10),
    ('venue'::public.provider_type, 'legal', 'business-registration', 'Регистрация ТОО/ИП', 'file-text', 20),
    ('venue'::public.provider_type, 'home', 'cleaning', 'Клининговые компании', 'home', 10),
    ('venue'::public.provider_type, 'home', 'dry-cleaning', 'Химчистка', 'home', 20),
    ('venue'::public.provider_type, 'education', 'driving-schools', 'Автошколы', 'book', 10),
    ('venue'::public.provider_type, 'education', 'language-schools', 'Языковые курсы', 'globe', 20),
    ('venue'::public.provider_type, 'education', 'education-centers', 'Образовательные центры', 'award', 30)
)
INSERT INTO public.services(category_id, slug, name, icon, sort_order)
SELECT c.id, seed.slug, seed.name, seed.icon, seed.sort_order
FROM seed
JOIN public.service_categories c
  ON c.provider_type = seed.provider_type AND c.slug = seed.category_slug
ON CONFLICT (category_id, slug) DO UPDATE SET
  name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, is_active = TRUE;
