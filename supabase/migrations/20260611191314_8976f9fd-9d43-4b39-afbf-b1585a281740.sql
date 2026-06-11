
CREATE TABLE public.account_action_plans (
  account_id uuid PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  rep_email text NOT NULL,
  plan jsonb NOT NULL,
  model text NOT NULL,
  inputs_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_action_plans TO authenticated;
GRANT ALL ON public.account_action_plans TO service_role;

ALTER TABLE public.account_action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps manage own action plans"
  ON public.account_action_plans
  FOR ALL
  TO authenticated
  USING (rep_email = public.current_rep_email())
  WITH CHECK (rep_email = public.current_rep_email());

CREATE TRIGGER update_account_action_plans_updated_at
  BEFORE UPDATE ON public.account_action_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
