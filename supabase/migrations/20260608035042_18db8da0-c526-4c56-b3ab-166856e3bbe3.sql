CREATE TABLE public.dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_email TEXT NOT NULL,
  name TEXT NOT NULL,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboards TO authenticated;
GRANT ALL ON public.dashboards TO service_role;

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps see their own dashboards" ON public.dashboards
  FOR SELECT TO authenticated USING (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps insert their own dashboards" ON public.dashboards
  FOR INSERT TO authenticated WITH CHECK (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps update their own dashboards" ON public.dashboards
  FOR UPDATE TO authenticated USING (rep_email = (auth.jwt() ->> 'email')) WITH CHECK (rep_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Reps delete their own dashboards" ON public.dashboards
  FOR DELETE TO authenticated USING (rep_email = (auth.jwt() ->> 'email'));

CREATE INDEX dashboards_rep_email_idx ON public.dashboards(rep_email);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_dashboards_updated_at
  BEFORE UPDATE ON public.dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();