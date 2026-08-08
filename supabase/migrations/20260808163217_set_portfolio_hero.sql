CREATE OR REPLACE FUNCTION public.set_my_portfolio_hero(p_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.portfolio_items
    WHERE id = p_item_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'portfolio_item_not_found';
  END IF;

  UPDATE public.portfolio_items
  SET is_hero = (id = p_item_id)
  WHERE owner_id = auth.uid()
    AND (is_hero OR id = p_item_id);
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_portfolio_hero(UUID)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_portfolio_hero(UUID)
TO authenticated;
