ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS it_budget_estimated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cloud_status text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS data_source text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS netapp_models text[],
  ADD COLUMN IF NOT EXISTS ontap_version text,
  ADD COLUMN IF NOT EXISTS cluster_count integer,
  ADD COLUMN IF NOT EXISTS storage_architecture text,
  ADD COLUMN IF NOT EXISTS risk_count_high integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_count_medium integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_rep_customer_uniq
  ON public.accounts(rep_email, customer_id) WHERE customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  rep_email text not null,
  status text not null,
  account_count integer default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.sync_runs TO authenticated;
GRANT ALL ON public.sync_runs TO service_role;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reps see own syncs" ON public.sync_runs FOR SELECT TO authenticated
  USING (rep_email = current_rep_email() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Reps insert own syncs" ON public.sync_runs FOR INSERT TO authenticated
  WITH CHECK (rep_email = current_rep_email());
CREATE POLICY "Reps update own syncs" ON public.sync_runs FOR UPDATE TO authenticated
  USING (rep_email = current_rep_email()) WITH CHECK (rep_email = current_rep_email());