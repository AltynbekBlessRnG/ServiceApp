CREATE TABLE public.portfolio_likes (
  item_id UUID NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_id, user_id)
);

CREATE INDEX portfolio_likes_user_id_idx
ON public.portfolio_likes(user_id);

ALTER TABLE public.portfolio_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY portfolio_likes_read
ON public.portfolio_likes FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY portfolio_likes_insert_own
ON public.portfolio_likes FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY portfolio_likes_delete_own
ON public.portfolio_likes FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.portfolio_likes FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.portfolio_likes TO authenticated;
