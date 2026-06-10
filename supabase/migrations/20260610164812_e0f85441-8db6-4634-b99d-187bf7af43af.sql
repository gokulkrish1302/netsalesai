ALTER TABLE public.reps 
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS briefing_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS briefing_snapshot_at timestamptz;