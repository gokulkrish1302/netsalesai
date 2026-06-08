import { useEffect, useRef } from "react";
import { useAuth } from "@/state/AuthContext";
import { useApp } from "@/state/AppStore";
import { supabase } from "@/integrations/supabase/client";
import type { Account, CloudStatus, Industry, PipelineStage, Region } from "@/lib/types";

// Map a DB row → Account shape used by the scoring engine.
// DB stores a partial schema; sensible defaults fill the rest so scoring still runs.
function rowToAccount(row: {
  id: string;
  account_name: string;
  device_age: number | null;
  storage_utilization: number | null;
  it_budget: number | null;
  renewal_days: number | null;
  status: string | null;
  rep_email: string;
}): Account {
  return {
    id: row.id,
    accountName: row.account_name,
    salesRep: row.rep_email,
    industry: "Tech" as Industry,
    region: "West" as Region,
    companySize: "—",
    deviceModel: "—",
    deviceAgeYears: Number(row.device_age ?? 0),
    endOfLife: Number(row.device_age ?? 0) >= 5,
    storageCapacityTB: 0,
    utilizationPct: Number(row.storage_utilization ?? 0),
    itBudgetUSD: Number(row.it_budget ?? 0),
    cloudStatus: "none" as CloudStatus,
    contractRenewalDays: Number(row.renewal_days ?? 365),
    annualRevenue: 0,
    lastContactDate: null,
    pipelineStage: (row.status as PipelineStage) ?? "not_contacted",
    dataSource: "active_iq",
    sourceTimestamp: new Date().toISOString(),
  };
}

/**
 * Bridges Supabase data into the in-memory AppStore for the signed-in rep:
 * - Loads accounts (filtered to rep_email by RLS). Empty result = keep mock fallback.
 * - Loads stored scoring weights; persists changes back.
 * - Mirrors call logs / notes into the `activity` table.
 */
export function DbSync() {
  const { rep } = useAuth();
  const {
    state,
    scoredAccounts,
    addImportedAccounts,
    setWeights,
  } = useApp();
  const lastWeightsKey = useRef<string>("");
  const initialWeightsLoaded = useRef(false);
  const loadedForEmail = useRef<string | null>(null);

  // Load DB accounts + weights once per rep
  useEffect(() => {
    if (!rep) return;
    if (loadedForEmail.current === rep.email) return;
    loadedForEmail.current = rep.email;
    initialWeightsLoaded.current = false;

    (async () => {
      const [{ data: accts }, { data: w }] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, account_name, device_age, storage_utilization, it_budget, renewal_days, status, rep_email")
          .eq("rep_email", rep.email),
        supabase
          .from("rep_weights")
          .select("weights")
          .eq("rep_email", rep.email)
          .maybeSingle(),
      ]);

      if (accts && accts.length > 0) {
        const mapped = accts.map(rowToAccount);
        addImportedAccounts(mapped);
      }
      if (w?.weights) {
        setWeights(w.weights as unknown as typeof state.weights);
        lastWeightsKey.current = JSON.stringify(w.weights);
      } else {
        lastWeightsKey.current = JSON.stringify(state.weights);
      }
      initialWeightsLoaded.current = true;
    })();
  }, [rep, addImportedAccounts, setWeights, state.weights]);

  // Persist weights on change (debounced)
  useEffect(() => {
    if (!rep || !initialWeightsLoaded.current) return;
    const key = JSON.stringify(state.weights);
    if (key === lastWeightsKey.current) return;
    lastWeightsKey.current = key;
    const t = setTimeout(() => {
      supabase
        .from("rep_weights")
        .upsert({ rep_email: rep.email, weights: state.weights as unknown as Record<string, number>, updated_at: new Date().toISOString() })
        .then(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [state.weights, rep]);

  // Best-effort: log new call logs to activity table
  const lastCallLogId = useRef<string | null>(null);
  useEffect(() => {
    if (!rep) return;
    const all = Object.values(state.callLogs).flat();
    const latest = all[0];
    if (!latest || latest.id === lastCallLogId.current) return;
    lastCallLogId.current = latest.id;
    const acct = scoredAccounts.find((a) => a.id === latest.accountId);
    if (!acct) return;
    supabase
      .from("activity")
      .insert({
        account_name: acct.accountName,
        action_taken: `Call · ${latest.outcome}`,
        date: latest.date,
        notes: latest.notes,
        rep_email: rep.email,
      })
      .then(() => {});
  }, [state.callLogs, rep, scoredAccounts]);

  return null;
}
