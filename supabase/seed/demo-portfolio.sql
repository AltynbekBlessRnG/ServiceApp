-- Раздаёт демонстрационным профилям снимки портфолио.
--
-- Пустая вкладка «Портфолио» на каждой карточке читается не как честный
-- пробел, а как сломанный экран, поэтому до появления настоящих работ там
-- стоят стоковые снимки: по три на услугу, одни и те же для двух профилей
-- одной услуги.
--
-- Снимки лежат в demo/portfolio и раздаются GitHub Pages этого репозитория,
-- их скачивает scripts/fetch-demo-portfolio.mjs. Имя файла — слаг услуги и
-- номер, поэтому адрес собирается прямо в SQL. Автор и ссылка на оригинал
-- каждого файла записаны в demo/portfolio/sources.json.
--
-- Правила Pexels требуют указывать фотографа рядом со снимком; подпись
-- впечатана в само изображение, поэтому работает и в уже собранном билде.
-- Заметки для проверяющего в App Store Connect говорят, что это заглушки.
--
-- Первый снимок помечен is_hero: карточка заведения берёт его как обложку.
-- in_feed оставлен false намеренно — лента показывает только видео.

INSERT INTO public.portfolio_items (owner_id, file_url, thumbnail_url, file_type,
                                    in_feed, is_pinned, is_hero, is_hidden, created_at)
SELECT p.pid,
       'https://altynbekblessrng.github.io/ServiceApp/demo/portfolio/' || p.slug || '-' || n || '.jpg',
       'https://altynbekblessrng.github.io/ServiceApp/demo/portfolio/' || p.slug || '-' || n || '.jpg',
       'image', FALSE, FALSE, n = 1, FALSE,
       NOW() - ((n * 3 + (abs(hashtext(p.pid::TEXT)) % 40)) || ' days')::INTERVAL
FROM (
  -- У демонстрационного профиля Taptym услуг три; берём одну, чтобы снимков
  -- не стало девять.
  SELECT DISTINCT ON (pr.id) pr.id AS pid, s.slug
  FROM public.profiles pr
  JOIN public.provider_services ps ON ps.provider_id = pr.id
  JOIN public.services s ON s.id = ps.service_id
  WHERE pr.role IN ('specialist','venue')
  ORDER BY pr.id, ps.service_id
) p
CROSS JOIN generate_series(1, 3) AS n
WHERE NOT EXISTS (SELECT 1 FROM public.portfolio_items pi WHERE pi.owner_id = p.pid);
