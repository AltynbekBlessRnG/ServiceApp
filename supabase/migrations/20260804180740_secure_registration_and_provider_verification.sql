CREATE TYPE public.provider_verification_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.provider_verifications (
  provider_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.provider_verification_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_note TEXT CHECK (char_length(review_note) <= 1000)
);

CREATE INDEX provider_verifications_pending_idx
ON public.provider_verifications(submitted_at)
WHERE status = 'pending';

-- Do not create application profiles for unconfirmed email addresses. OAuth
-- identities and other providers that arrive pre-confirmed are still handled
-- by the INSERT trigger.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL AND NEW.phone_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, full_name, city)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Пользователь'),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'city'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO private.profile_private (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
AFTER UPDATE OF email_confirmed_at, phone_confirmed_at ON auth.users
FOR EACH ROW
WHEN (
  (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  OR (OLD.phone_confirmed_at IS NULL AND NEW.phone_confirmed_at IS NOT NULL)
)
EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_initial_role(
  p_role public.account_role,
  p_city TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  UPDATE public.profiles
  SET role = p_role, city = COALESCE(NULLIF(BTRIM(p_city), ''), city)
  WHERE id = auth.uid() AND role IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'role_already_selected'; END IF;

  IF p_role = 'specialist' THEN
    INSERT INTO public.specialist_profiles(id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
    INSERT INTO public.provider_verifications(provider_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  ELSIF p_role = 'venue' THEN
    INSERT INTO public.venue_profiles(id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
    INSERT INTO public.provider_verifications(provider_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

INSERT INTO public.provider_verifications(provider_id)
SELECT id
FROM public.profiles
WHERE role IN ('specialist', 'venue')
ON CONFLICT (provider_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_review_provider(
  p_provider_id UUID,
  p_status public.provider_verification_status,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_required'; END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  IF char_length(COALESCE(p_note, '')) > 1000 THEN RAISE EXCEPTION 'note_too_long'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_provider_id AND role IN ('specialist', 'venue')
  ) THEN RAISE EXCEPTION 'provider_not_found'; END IF;

  INSERT INTO public.provider_verifications(
    provider_id, status, reviewed_at, reviewed_by, review_note
  )
  VALUES (
    p_provider_id, p_status, NOW(), auth.uid(), NULLIF(BTRIM(p_note), '')
  )
  ON CONFLICT (provider_id) DO UPDATE SET
    status = EXCLUDED.status,
    reviewed_at = EXCLUDED.reviewed_at,
    reviewed_by = EXCLUDED.reviewed_by,
    review_note = EXCLUDED.review_note;

  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(), 'review_provider_' || p_status::TEXT, 'profile', p_provider_id::TEXT,
    jsonb_build_object('status', p_status, 'note', NULLIF(BTRIM(p_note), ''))
  );
END;
$$;

CREATE OR REPLACE VIEW public.provider_search_view
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.city,
  p.role::TEXT AS provider_type,
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
  NULL::DOUBLE PRECISION AS latitude,
  NULL::DOUBLE PRECISION AS longitude,
  vp.distance_to_beach_m,
  COALESCE(AVG(r.rating) FILTER (WHERE NOT r.is_hidden), 0)::NUMERIC(3,2) AS avg_rating,
  COUNT(r.id) FILTER (WHERE NOT r.is_hidden) AS review_count
FROM public.profiles p
JOIN public.provider_verifications verification
  ON verification.provider_id = p.id AND verification.status = 'approved'
JOIN public.provider_services ps ON ps.provider_id = p.id
JOIN public.services s ON s.id = ps.service_id AND s.is_active
JOIN public.service_categories c ON c.id = s.category_id AND c.is_active
LEFT JOIN public.specialist_profiles sp ON sp.id = p.id
LEFT JOIN public.venue_profiles vp ON vp.id = p.id
LEFT JOIN public.reviews r ON r.target_id = p.id
WHERE NOT p.is_banned
  AND NOT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE auth.uid() IS NOT NULL
      AND (
        (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
        OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
      )
  )
GROUP BY p.id, c.slug, c.name, s.id, s.slug, s.name, ps.price_from, sp.price_start, sp.experience_years,
  sp.service_area, vp.price_from, vp.capacity, vp.location_zone, vp.distance_to_beach_m;

CREATE OR REPLACE FUNCTION public.create_appointment(
  p_provider_id UUID,
  p_service_id BIGINT,
  p_starts_at TIMESTAMPTZ,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR p_starts_at <= NOW() THEN
    RAISE EXCEPTION 'invalid appointment';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.provider_verifications
    WHERE provider_id = p_provider_id AND status = 'approved'
  ) THEN RAISE EXCEPTION 'provider_not_approved'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_provider_id::TEXT, 0));
  IF NOT EXISTS (
    SELECT 1 FROM public.provider_services
    WHERE provider_id = p_provider_id AND service_id = p_service_id
  ) THEN RAISE EXCEPTION 'provider does not offer service'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.provider_blocks
    WHERE provider_id = p_provider_id
      AND starts_at < p_starts_at + INTERVAL '1 hour'
      AND ends_at > p_starts_at
  ) THEN RAISE EXCEPTION 'slot is unavailable'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE provider_id = p_provider_id
      AND status IN ('pending', 'confirmed')
      AND starts_at < p_starts_at + INTERVAL '1 hour'
      AND COALESCE(ends_at, starts_at + INTERVAL '1 hour') > p_starts_at
  ) THEN RAISE EXCEPTION 'slot is unavailable'; END IF;
  INSERT INTO public.bookings(client_id, provider_id, service_id, kind, starts_at, message)
  VALUES (auth.uid(), p_provider_id, p_service_id, 'appointment', p_starts_at, NULLIF(BTRIM(p_message), ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_stay_booking(
  p_venue_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_guest_count INTEGER,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR p_starts_at < CURRENT_DATE OR p_ends_at <= p_starts_at OR p_guest_count <= 0 THEN
    RAISE EXCEPTION 'invalid stay booking';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.provider_verifications
    WHERE provider_id = p_venue_id AND status = 'approved'
  ) THEN RAISE EXCEPTION 'provider_not_approved'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_venue_id::TEXT, 0));
  IF NOT EXISTS (
    SELECT 1 FROM public.venue_profiles
    WHERE id = p_venue_id AND (capacity = 0 OR capacity >= p_guest_count)
  ) THEN RAISE EXCEPTION 'venue not found'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.provider_blocks
    WHERE provider_id = p_venue_id
      AND starts_at < p_ends_at AND ends_at > p_starts_at
  ) THEN RAISE EXCEPTION 'dates are unavailable'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE provider_id = p_venue_id
      AND status IN ('pending', 'confirmed')
      AND starts_at < p_ends_at
      AND COALESCE(ends_at, starts_at + INTERVAL '1 hour') > p_starts_at
  ) THEN RAISE EXCEPTION 'dates are unavailable'; END IF;
  INSERT INTO public.bookings(client_id, provider_id, kind, starts_at, ends_at, guest_count, message)
  VALUES (auth.uid(), p_venue_id, 'stay', p_starts_at, p_ends_at, p_guest_count, NULLIF(BTRIM(p_message), ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

ALTER TABLE public.provider_verifications ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_verifications;

CREATE POLICY provider_verifications_read
ON public.provider_verifications FOR SELECT
TO authenticated
USING (
  status = 'approved'
  OR provider_id = (SELECT auth.uid())
  OR (SELECT public.is_admin())
);

DROP POLICY specialist_profiles_read ON public.specialist_profiles;
CREATE POLICY specialist_profiles_read
ON public.specialist_profiles FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR (SELECT public.is_admin())
  OR EXISTS (
    SELECT 1 FROM public.provider_verifications verification
    WHERE verification.provider_id = specialist_profiles.id AND verification.status = 'approved'
  )
);

DROP POLICY venue_profiles_read ON public.venue_profiles;
CREATE POLICY venue_profiles_read
ON public.venue_profiles FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR (SELECT public.is_admin())
  OR EXISTS (
    SELECT 1 FROM public.provider_verifications verification
    WHERE verification.provider_id = venue_profiles.id AND verification.status = 'approved'
  )
);

DROP POLICY provider_services_read ON public.provider_services;
CREATE POLICY provider_services_read
ON public.provider_services FOR SELECT
TO authenticated
USING (
  provider_id = (SELECT auth.uid())
  OR (SELECT public.is_admin())
  OR EXISTS (
    SELECT 1 FROM public.provider_verifications verification
    WHERE verification.provider_id = provider_services.provider_id AND verification.status = 'approved'
  )
);

DROP POLICY portfolio_read ON public.portfolio_items;
CREATE POLICY portfolio_read
ON public.portfolio_items FOR SELECT
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
  OR (SELECT public.is_admin())
  OR (
    NOT is_hidden
    AND EXISTS (
      SELECT 1 FROM public.provider_verifications verification
      WHERE verification.provider_id = portfolio_items.owner_id AND verification.status = 'approved'
    )
  )
);

REVOKE ALL ON FUNCTION public.admin_review_provider(UUID, public.provider_verification_status, TEXT)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_provider(UUID, public.provider_verification_status, TEXT)
TO authenticated;

GRANT SELECT ON public.provider_verifications TO authenticated;
