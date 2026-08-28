-- Карточка специалиста читает данные из provider_search_view, но во вьюхе не
-- было ни описания, ни собственной цены мастера. Из-за этого на профиле любого
-- специалиста стояло «Мастер не добавил описание», а цена была пустой, даже
-- когда и то и другое заполнено. Добавляем недостающие поля в конец списка.
CREATE OR REPLACE VIEW public.provider_search_view AS
 SELECT p.id,
    p.full_name,
    p.avatar_url,
    p.city,
    p.role::text AS provider_type,
    c.slug AS category_slug,
    c.name AS category_name,
    s.slug AS service_slug,
    s.id AS service_id,
    s.name AS service_name,
    COALESCE(ps.price_from, sp.price_start, vp.price_from, 0) AS price_from,
    sp.experience_years,
    sp.service_area,
    vp.capacity,
    vp.location_zone,
    NULL::double precision AS latitude,
    NULL::double precision AS longitude,
    vp.distance_to_beach_m,
    COALESCE(avg(r.rating) FILTER (WHERE NOT r.is_hidden), 0::numeric)::numeric(3,2) AS avg_rating,
    count(r.id) FILTER (WHERE NOT r.is_hidden) AS review_count,
    sp.bio,
    sp.price_start,
    vp.description AS venue_description
   FROM profiles p
     JOIN provider_verifications verification ON verification.provider_id = p.id AND verification.status = 'approved'::provider_verification_status
     JOIN provider_services ps ON ps.provider_id = p.id
     JOIN services s ON s.id = ps.service_id AND s.is_active
     JOIN service_categories c ON c.id = s.category_id AND c.is_active
     LEFT JOIN specialist_profiles sp ON sp.id = p.id
     LEFT JOIN venue_profiles vp ON vp.id = p.id
     LEFT JOIN reviews r ON r.target_id = p.id
  WHERE NOT p.is_banned AND NOT (EXISTS ( SELECT 1
           FROM blocks b
          WHERE auth.uid() IS NOT NULL AND (b.blocker_id = auth.uid() AND b.blocked_id = p.id OR b.blocker_id = p.id AND b.blocked_id = auth.uid())))
  GROUP BY p.id, c.slug, c.name, s.id, s.slug, s.name, ps.price_from, sp.price_start,
           sp.experience_years, sp.service_area, sp.bio,
           vp.price_from, vp.capacity, vp.location_zone, vp.distance_to_beach_m, vp.description;
