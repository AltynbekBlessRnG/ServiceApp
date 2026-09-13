-- Раздаёт демонстрационным профилям снимки портфолио.
--
-- Пустая вкладка «Портфолио» на каждой карточке читается не как честный
-- пробел, а как сломанный экран, поэтому до появления настоящих работ там
-- стоят стоковые снимки.
--
-- Снимки лежат в demo/portfolio и раздаются GitHub Pages этого репозитория,
-- их скачивает scripts/fetch-demo-portfolio.mjs. Имя файла — слаг услуги и
-- номер 1..N без пропусков, поэтому адрес собирается прямо в SQL. Автор и
-- ссылка на оригинал каждого файла записаны в demo/portfolio/sources.json.
--
-- На услугу приходится шесть профилей и от трёх до шести снимков: после
-- поиска каждый снимок дальше третьего проверялся глазами, и не по теме
-- выбрасывался. Профиль под номером k получает три снимка подряд, начиная с
-- k-го, по кругу. При шести снимках у каждого профиля своя обложка и своя
-- тройка; при трёх обложки повторяются, но порядок разный.
--
-- Правила Pexels требуют указывать фотографа рядом со снимком; подпись
-- впечатана в само изображение, поэтому работает и в уже собранном билде.
-- Заметки для проверяющего в App Store Connect говорят, что это заглушки.
--
-- Файл можно запускать повторно: сначала он снимает прежние демонстрационные
-- снимки — только те, что указывают на demo/portfolio, загруженные
-- пользователями не трогает, — и раздаёт заново.

DELETE FROM public.portfolio_items
WHERE file_url LIKE 'https://altynbekblessrng.github.io/ServiceApp/demo/portfolio/%';

WITH pool(slug, n) AS (VALUES
 ('accounting',5),('advocates',3),('analytics',3),('appliance-repair',4),('auto-electricians',6),('backend',3),
 ('banquet',6),('barbershops',4),('bars',6),('beauty-salons',5),('business-registration',5),('camps',6),
 ('car-rental',3),('car-selection',6),('car-wash',5),('caregivers',5),('catering',6),('cleaners',4),
 ('cleaning',6),('coffee-shops',6),('computer-clubs',5),('consulting',4),('cosmetology',6),('decorators',5),
 ('dentistry',5),('design',6),('detailing',6),('devops',3),('diagnostics',6),('driving',6),
 ('driving-schools',6),('dry-cleaning',4),('education-centers',6),('electrical',3),('equipment-rental',4),('finishing',5),
 ('frontend',4),('furniture-assembly',4),('glamping',5),('guides',3),('handyman',3),('hookah-lounges',4),
 ('hosts',5),('hotels',6),('installers',6),('interior-cleaning',6),('karaoke',4),('language-schools',6),
 ('law-firms',3),('lawyers',3),('makeup-artists',6),('marketing',6),('massage',4),('mechanics',6),
 ('mobile',6),('mobile-repair',6),('musicians',5),('nail-artists',5),('nightclubs',6),('notaries',3),
 ('nurses',5),('outdoor-instructors',5),('photo-studios',6),('photographers',6),('physical-therapy',5),('pizzerias',6),
 ('plumbing',5),('pubs',6),('recreation',6),('rehabilitation',3),('repair',3),('restaurants',6),
 ('sanatoriums',6),('service-stations',5),('smm',6),('spa',5),('stylists',5),('tire-service',6),
 ('tire-specialists',3),('tour-organizers',6),('trainers',6),('transfers',6),('travel-agents',6),('tutors',3),
 ('ui-ux',4),('upholstery-cleaning',6),('videographers',6)
),
ranked AS (
  -- У демонстрационного профиля Taptym услуг три; берём одну, чтобы снимков
  -- не стало девять.
  SELECT DISTINCT ON (pr.id) pr.id AS pid, s.slug
  FROM public.profiles pr
  JOIN public.provider_services ps ON ps.provider_id = pr.id
  JOIN public.services s ON s.id = ps.service_id
  WHERE pr.role IN ('specialist','venue')
  ORDER BY pr.id, ps.service_id
),
numbered AS (
  SELECT r.pid, r.slug, pool.n,
         (row_number() OVER (PARTITION BY r.slug ORDER BY r.pid) - 1)::INT AS k
  FROM ranked r
  JOIN pool ON pool.slug = r.slug
)
INSERT INTO public.portfolio_items (owner_id, file_url, thumbnail_url, file_type,
                                    in_feed, is_pinned, is_hero, is_hidden, created_at)
SELECT nb.pid,
       'https://altynbekblessrng.github.io/ServiceApp/demo/portfolio/' || nb.slug || '-' || (((nb.k + j) % nb.n) + 1) || '.jpg',
       'https://altynbekblessrng.github.io/ServiceApp/demo/portfolio/' || nb.slug || '-' || (((nb.k + j) % nb.n) + 1) || '.jpg',
       'image', FALSE, FALSE, j = 0, FALSE,
       -- Экран профиля сортирует по дате от новых к старым, а заведение берёт
       -- первый снимок как обложку, поэтому обложка получает самую свежую дату.
       NOW() - ((j * 4 + 1 + (abs(hashtext(nb.pid::TEXT)) % 30)) || ' days')::INTERVAL
FROM numbered nb
CROSS JOIN generate_series(0, 2) AS j;
