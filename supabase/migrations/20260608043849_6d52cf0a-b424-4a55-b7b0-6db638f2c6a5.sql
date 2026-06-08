
-- 1) Helper: get current user's rep email (SECURITY DEFINER, safe)
CREATE OR REPLACE FUNCTION public.current_rep_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.reps WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_rep_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_rep_email() TO authenticated;

-- 2) Replace email-from-JWT policies with rep-id-based ownership
-- accounts
DROP POLICY IF EXISTS "Reps see their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Reps insert their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Reps update their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Reps delete their own accounts" ON public.accounts;

CREATE POLICY "Reps see their own accounts" ON public.accounts
  FOR SELECT TO authenticated USING (rep_email = public.current_rep_email());
CREATE POLICY "Reps insert their own accounts" ON public.accounts
  FOR INSERT TO authenticated WITH CHECK (rep_email = public.current_rep_email());
CREATE POLICY "Reps update their own accounts" ON public.accounts
  FOR UPDATE TO authenticated USING (rep_email = public.current_rep_email()) WITH CHECK (rep_email = public.current_rep_email());
CREATE POLICY "Reps delete their own accounts" ON public.accounts
  FOR DELETE TO authenticated USING (rep_email = public.current_rep_email());

-- activity
DROP POLICY IF EXISTS "Reps see their own activity" ON public.activity;
DROP POLICY IF EXISTS "Reps insert their own activity" ON public.activity;
DROP POLICY IF EXISTS "Reps update their own activity" ON public.activity;
DROP POLICY IF EXISTS "Reps delete their own activity" ON public.activity;

CREATE POLICY "Reps see their own activity" ON public.activity
  FOR SELECT TO authenticated USING (rep_email = public.current_rep_email());
CREATE POLICY "Reps insert their own activity" ON public.activity
  FOR INSERT TO authenticated WITH CHECK (rep_email = public.current_rep_email());
CREATE POLICY "Reps update their own activity" ON public.activity
  FOR UPDATE TO authenticated USING (rep_email = public.current_rep_email()) WITH CHECK (rep_email = public.current_rep_email());
CREATE POLICY "Reps delete their own activity" ON public.activity
  FOR DELETE TO authenticated USING (rep_email = public.current_rep_email());

-- dashboards
DROP POLICY IF EXISTS "Reps see their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Reps insert their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Reps update their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Reps delete their own dashboards" ON public.dashboards;

CREATE POLICY "Reps see their own dashboards" ON public.dashboards
  FOR SELECT TO authenticated USING (rep_email = public.current_rep_email());
CREATE POLICY "Reps insert their own dashboards" ON public.dashboards
  FOR INSERT TO authenticated WITH CHECK (rep_email = public.current_rep_email());
CREATE POLICY "Reps update their own dashboards" ON public.dashboards
  FOR UPDATE TO authenticated USING (rep_email = public.current_rep_email()) WITH CHECK (rep_email = public.current_rep_email());
CREATE POLICY "Reps delete their own dashboards" ON public.dashboards
  FOR DELETE TO authenticated USING (rep_email = public.current_rep_email());

-- rep_weights
DROP POLICY IF EXISTS "Reps read own weights" ON public.rep_weights;
DROP POLICY IF EXISTS "Reps upsert own weights" ON public.rep_weights;
DROP POLICY IF EXISTS "Reps update own weights" ON public.rep_weights;

CREATE POLICY "Reps read own weights" ON public.rep_weights
  FOR SELECT TO authenticated USING (rep_email = public.current_rep_email());
CREATE POLICY "Reps upsert own weights" ON public.rep_weights
  FOR INSERT TO authenticated WITH CHECK (rep_email = public.current_rep_email());
CREATE POLICY "Reps update own weights" ON public.rep_weights
  FOR UPDATE TO authenticated USING (rep_email = public.current_rep_email()) WITH CHECK (rep_email = public.current_rep_email());

-- 3) Explicit admin-only INSERT/DELETE/UPDATE on user_roles
DROP POLICY IF EXISTS "Admins manage user_roles insert" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage user_roles update" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage user_roles delete" ON public.user_roles;

CREATE POLICY "Admins manage user_roles insert" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage user_roles update" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage user_roles delete" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4) Lock down SECURITY DEFINER function execution to authenticated only
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
