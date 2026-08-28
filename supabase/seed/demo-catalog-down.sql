-- Убирает демонстрационные профили каталога, созданные demo-catalog.sql.
-- Удаление auth.users каскадом уносит профиль, услуги и всё остальное.
DELETE FROM auth.users WHERE email LIKE 'demo.%@example.com';
