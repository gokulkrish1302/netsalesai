import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Deletes ALL of the signed-in rep's account data:
 * action plans, activity, accounts, and sync runs.
 * RLS scopes every delete to the current rep.
 */
export const clearMyAccountData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    // Look up rep_email (tables use rep_email, not user id).
    const { data: rep, error: repErr } = await supabase
      .from("reps")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    if (repErr) throw new Error(repErr.message);
    if (!rep?.email) throw new Error("Rep profile not found");
    const email = rep.email;

    // account_action_plans cascades from accounts, but delete explicitly to
    // also clear any orphans and return a count.
    const plans = await supabase
      .from("account_action_plans")
      .delete({ count: "exact" })
      .eq("rep_email", email);
    if (plans.error) throw new Error(plans.error.message);

    const activity = await supabase
      .from("activity")
      .delete({ count: "exact" })
      .eq("rep_email", email);
    if (activity.error) throw new Error(activity.error.message);

    const accounts = await supabase
      .from("accounts")
      .delete({ count: "exact" })
      .eq("rep_email", email);
    if (accounts.error) throw new Error(accounts.error.message);

    const syncs = await supabase
      .from("sync_runs")
      .delete({ count: "exact" })
      .eq("rep_email", email);
    if (syncs.error) throw new Error(syncs.error.message);

    return {
      deletedAccounts: accounts.count ?? 0,
      deletedPlans: plans.count ?? 0,
      deletedActivity: activity.count ?? 0,
      deletedSyncRuns: syncs.count ?? 0,
    };
  });
