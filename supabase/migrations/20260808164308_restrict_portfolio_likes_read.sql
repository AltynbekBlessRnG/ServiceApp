DROP POLICY portfolio_likes_read ON public.portfolio_likes;

CREATE POLICY portfolio_likes_read_own
ON public.portfolio_likes FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));
