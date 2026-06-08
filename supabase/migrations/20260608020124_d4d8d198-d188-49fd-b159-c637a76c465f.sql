
-- Reps profile table (admin-provisioned, linked to auth.users by id)
CREATE TABLE public.reps (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reps TO authenticated;
GRANT ALL ON public.reps TO service_role;
ALTER TABLE public.reps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reps can view their own profile" ON public.reps
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Reps can update their own profile" ON public.reps
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  score NUMERIC,
  status TEXT,
  priority_badge TEXT,
  device_age NUMERIC,
  storage_utilization NUMERIC,
  it_budget NUMERIC,
  renewal_days INTEGER,
  rep_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX accounts_rep_email_idx ON public.accounts(rep_email);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reps see their own accounts" ON public.accounts
  FOR SELECT TO authenticated USING (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps insert their own accounts" ON public.accounts
  FOR INSERT TO authenticated WITH CHECK (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps update their own accounts" ON public.accounts
  FOR UPDATE TO authenticated USING (rep_email = (auth.jwt() ->> 'email')) WITH CHECK (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps delete their own accounts" ON public.accounts
  FOR DELETE TO authenticated USING (rep_email = (auth.jwt() ->> 'email'));

-- Activity table
CREATE TABLE public.activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  rep_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_rep_email_idx ON public.activity(rep_email);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity TO authenticated;
GRANT ALL ON public.activity TO service_role;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reps see their own activity" ON public.activity
  FOR SELECT TO authenticated USING (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps insert their own activity" ON public.activity
  FOR INSERT TO authenticated WITH CHECK (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps update their own activity" ON public.activity
  FOR UPDATE TO authenticated USING (rep_email = (auth.jwt() ->> 'email')) WITH CHECK (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps delete their own activity" ON public.activity
  FOR DELETE TO authenticated USING (rep_email = (auth.jwt() ->> 'email'));

-- Per-rep scoring weights
CREATE TABLE public.rep_weights (
  rep_email TEXT PRIMARY KEY,
  weights JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_weights TO authenticated;
GRANT ALL ON public.rep_weights TO service_role;
ALTER TABLE public.rep_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reps read own weights" ON public.rep_weights
  FOR SELECT TO authenticated USING (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps upsert own weights" ON public.rep_weights
  FOR INSERT TO authenticated WITH CHECK (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps update own weights" ON public.rep_weights
  FOR UPDATE TO authenticated USING (rep_email = (auth.jwt() ->> 'email')) WITH CHECK (rep_email = (auth.jwt() ->> 'email'));
