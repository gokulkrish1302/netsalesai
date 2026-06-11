CREATE POLICY "Admins manage all action plans" ON public.account_action_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reps delete own sync runs" ON public.sync_runs FOR DELETE TO authenticated USING (rep_email = public.current_rep_email());

CREATE POLICY "Admins delete sync runs" ON public.sync_runs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));