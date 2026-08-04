CREATE OR REPLACE FUNCTION public.submit_my_provider_verification()
RETURNS public.provider_verification_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_status public.provider_verification_status;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('specialist', 'venue') AND NOT is_banned
  ) THEN RAISE EXCEPTION 'provider_required'; END IF;

  SELECT status INTO v_status
  FROM public.provider_verifications
  WHERE provider_id = auth.uid()
  FOR UPDATE;

  IF v_status = 'approved' THEN RETURN v_status; END IF;

  INSERT INTO public.provider_verifications(provider_id, status, submitted_at)
  VALUES (auth.uid(), 'pending', NOW())
  ON CONFLICT (provider_id) DO UPDATE SET
    status = 'pending',
    submitted_at = NOW(),
    reviewed_at = NULL,
    reviewed_by = NULL,
    review_note = NULL;

  RETURN 'pending';
END;
$$;

DROP POLICY profiles_read ON public.profiles;
CREATE POLICY profiles_read
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR (SELECT public.is_admin())
  OR (
    NOT is_banned
    AND (
      role = 'client'
      OR EXISTS (
        SELECT 1 FROM public.provider_verifications verification
        WHERE verification.provider_id = profiles.id AND verification.status = 'approved'
      )
    )
  )
);

REVOKE ALL ON FUNCTION public.submit_my_provider_verification()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_my_provider_verification()
TO authenticated;
