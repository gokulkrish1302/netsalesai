ALTER TABLE public.account_action_plans
  ADD COLUMN IF NOT EXISTS stakeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS files jsonb NOT NULL DEFAULT '[]'::jsonb;