
-- === Finding 1: tighten function execution grants ===
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_rep_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_rep_email() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_rep_email() TO authenticated;

-- === Finding 2: scope ownership by stable auth.uid() instead of email ===
-- Ensure emails are unique in reps to prevent collisions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reps_email_unique'
  ) THEN
    ALTER TABLE public.reps ADD CONSTRAINT reps_email_unique UNIQUE (email);
  END IF;
END $$;

-- Add rep_id columns
ALTER TABLE public.accounts     ADD COLUMN IF NOT EXISTS rep_id uuid;
ALTER TABLE public.activity     ADD COLUMN IF NOT EXISTS rep_id uuid;
ALTER TABLE public.dashboards   ADD COLUMN IF NOT EXISTS rep_id uuid;
ALTER TABLE public.rep_weights  ADD COLUMN IF NOT EXISTS rep_id uuid;

-- Backfill rep_id from reps via email
UPDATE public.accounts     a SET rep_id = r.id FROM public.reps r WHERE a.rep_email = r.email AND a.rep_id IS NULL;
UPDATE public.activity     a SET rep_id = r.id FROM public.reps r WHERE a.rep_email = r.email AND a.rep_id IS NULL;
UPDATE public.dashboards   d SET rep_id = r.id FROM public.reps r WHERE d.rep_email = r.email AND d.rep_id IS NULL;
UPDATE public.rep_weights  w SET rep_id = r.id FROM public.reps r WHERE w.rep_email = r.email AND w.rep_id IS NULL;

-- Default rep_id to auth.uid() so client inserts populate it automatically
ALTER TABLE public.accounts    ALTER COLUMN rep_id SET DEFAULT auth.uid();
ALTER TABLE public.activity    ALTER COLUMN rep_id SET DEFAULT auth.uid();
ALTER TABLE public.dashboards  ALTER COLUMN rep_id SET DEFAULT auth.uid();
ALTER TABLE public.rep_weights ALTER COLUMN rep_id SET DEFAULT auth.uid();

-- Delete any orphaned rows that couldn't be backfilled to satisfy NOT NULL
DELETE FROM public.accounts    WHERE rep_id IS NULL;
DELETE FROM public.activity    WHERE rep_id IS NULL;
DELETE FROM public.dashboards  WHERE rep_id IS NULL;
DELETE FROM public.rep_weights WHERE rep_id IS NULL;

ALTER TABLE public.accounts    ALTER COLUMN rep_id SET NOT NULL;
ALTER TABLE public.activity    ALTER COLUMN rep_id SET NOT NULL;
ALTER TABLE public.dashboards  ALTER COLUMN rep_id SET NOT NULL;
ALTER TABLE public.rep_weights ALTER COLUMN rep_id SET NOT NULL;

-- Replace email-based rep policies with uid-based ones

-- accounts
DROP POLICY IF EXISTS "Reps see their own accounts"    ON public.accounts;
DROP POLICY IF EXISTS "Reps insert their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Reps update their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Reps delete their own accounts" ON public.accounts;
CREATE POLICY "Reps see their own accounts"    ON public.accounts FOR SELECT TO authenticated USING (rep_id = auth.uid());
CREATE POLICY "Reps insert their own accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (rep_id = auth.uid());
CREATE POLICY "Reps update their own accounts" ON public.accounts FOR UPDATE TO authenticated USING (rep_id = auth.uid()) WITH CHECK (rep_id = auth.uid());
CREATE POLICY "Reps delete their own accounts" ON public.accounts FOR DELETE TO authenticated USING (rep_id = auth.uid());

-- activity
DROP POLICY IF EXISTS "Reps see their own activity"    ON public.activity;
DROP POLICY IF EXISTS "Reps insert their own activity" ON public.activity;
DROP POLICY IF EXISTS "Reps update their own activity" ON public.activity;
DROP POLICY IF EXISTS "Reps delete their own activity" ON public.activity;
CREATE POLICY "Reps see their own activity"    ON public.activity FOR SELECT TO authenticated USING (rep_id = auth.uid());
CREATE POLICY "Reps insert their own activity" ON public.activity FOR INSERT TO authenticated WITH CHECK (rep_id = auth.uid());
CREATE POLICY "Reps update their own activity" ON public.activity FOR UPDATE TO authenticated USING (rep_id = auth.uid()) WITH CHECK (rep_id = auth.uid());
CREATE POLICY "Reps delete their own activity" ON public.activity FOR DELETE TO authenticated USING (rep_id = auth.uid());

-- dashboards
DROP POLICY IF EXISTS "Reps see their own dashboards"    ON public.dashboards;
DROP POLICY IF EXISTS "Reps insert their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Reps update their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Reps delete their own dashboards" ON public.dashboards;
CREATE POLICY "Reps see their own dashboards"    ON public.dashboards FOR SELECT TO authenticated USING (rep_id = auth.uid());
CREATE POLICY "Reps insert their own dashboards" ON public.dashboards FOR INSERT TO authenticated WITH CHECK (rep_id = auth.uid());
CREATE POLICY "Reps update their own dashboards" ON public.dashboards FOR UPDATE TO authenticated USING (rep_id = auth.uid()) WITH CHECK (rep_id = auth.uid());
CREATE POLICY "Reps delete their own dashboards" ON public.dashboards FOR DELETE TO authenticated USING (rep_id = auth.uid());

-- rep_weights
DROP POLICY IF EXISTS "Reps read own weights"   ON public.rep_weights;
DROP POLICY IF EXISTS "Reps upsert own weights" ON public.rep_weights;
DROP POLICY IF EXISTS "Reps update own weights" ON public.rep_weights;
CREATE POLICY "Reps read own weights"   ON public.rep_weights FOR SELECT TO authenticated USING (rep_id = auth.uid());
CREATE POLICY "Reps upsert own weights" ON public.rep_weights FOR INSERT TO authenticated WITH CHECK (rep_id = auth.uid());
CREATE POLICY "Reps update own weights" ON public.rep_weights FOR UPDATE TO authenticated USING (rep_id = auth.uid()) WITH CHECK (rep_id = auth.uid());

-- === Finding 3: explicit restrictive policies deny non-admins from mutating user_roles ===
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can update roles" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can delete roles" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
