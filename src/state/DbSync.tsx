import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/state/AuthContext";
import { useApp } from "@/state/AppStore";
import { supabase } from "@/integrations/supabase/client";
import type { Account, CloudStatus, Industry, PipelineStage, Region } from "@/lib/types";

function rowToAccount(row: {
  id: string;
  account_name: string;
  device_age: number | null;
  storage_utilization: number | null;
  it_budget: number | null;
  renewal_days: number | null;
  status: string | null;
  rep_email: string;
  cloud_status?: string | null;
  data_source?: string | null;
  last_synced_at?: string | null;
  netapp_models?: string[] | null;
  ontap_version?: string | null;
  cluster_count?: number | null;
  storage_architecture?: string | null;
  risk_count_high?: number | null;
  risk_count_medium?: number | null;
  it_budget_estimated?: boolean | null;
  industry?: string | null;
  region?: string | null;
  import_filename?: string | null;
  sales_rep?: string | null;
  company_size?: string | null;
  device_model?: string | null;
  end_of_life?: boolean | null;
  storage_capacity_tb?: number | null;
  annual_revenue?: number | null;
  last_contact_date?: string | null;
  pipeline_stage?: string | null;
}): Account {
  const cloud = (row.cloud_status as CloudStatus | null) ?? ("none" as CloudStatus);
  const deviceAge = Number(row.device_age ?? 0);
  return {
    id: row.id,
    accountName: row.account_name,
    salesRep: row.sales_rep ?? row.rep_email,
    industry: ((row.industry as Industry | null) ?? "Tech") as Industry,
    region: ((row.region as Region | null) ?? "West") as Region,
    companySize: row.company_size ?? "—",
    deviceModel: row.device_model ?? row.netapp_models?.[0] ?? "—",
    deviceAgeYears: deviceAge,
    endOfLife: row.end_of_life ?? deviceAge >= 5,
    storageCapacityTB: Number(row.storage_capacity_tb ?? 0),
    utilizationPct: Number(row.storage_utilization ?? 0),
    itBudgetUSD: Number(row.it_budget ?? 0),
    cloudStatus: cloud,
    contractRenewalDays: Number(row.renewal_days ?? 365),
    annualRevenue: Number(row.annual_revenue ?? 0),
    lastContactDate: row.last_contact_date ?? null,
    pipelineStage: ((row.pipeline_stage ?? row.status) as PipelineStage) ?? "not_contacted",
    dataSource: (row.data_source as "active_iq" | "excel_import" | null) ?? "excel_import",
    sourceTimestamp: row.last_synced_at ?? new Date().toISOString(),
    netappModels: row.netapp_models ?? undefined,
    ontapVersion: row.ontap_version ?? undefined,
    clusterCount: row.cluster_count ?? undefined,
    storageArchitecture: (row.storage_architecture as Account["storageArchitecture"]) ?? undefined,
    riskCountHigh: row.risk_count_high ?? undefined,
    riskCountMedium: row.risk_count_medium ?? undefined,
    itBudgetEstimated: row.it_budget_estimated ?? undefined,
    lastSyncedAt: row.last_synced_at ?? undefined,
    importFilename: row.import_filename ?? undefined,
  };
}

const ACCOUNT_COLUMNS =
  "id, account_name, device_age, storage_utilization, it_budget, renewal_days, status, rep_email, cloud_status, data_source, last_synced_at, netapp_models, ontap_version, cluster_count, storage_architecture, risk_count_high, risk_count_medium, it_budget_estimated, industry, region, import_filename, sales_rep, company_size, device_model, end_of_life, storage_capacity_tb, annual_revenue, last_contact_date, pipeline_stage";

/**
 * Bridges Supabase data into the in-memory AppStore for the signed-in rep.
 * Accounts in the store are a mirror of public.accounts filtered by rep_email
 * (RLS). Listens for "netapp:accounts-changed" to refetch after writes.
 */
export function DbSync() {
  const { rep, isAdmin } = useAuth();
  const { state, setAccounts, setWeights } = useApp();
  const lastWeightsKey = useRef<string>("");
  const initialWeightsLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!rep) return;
    const q = supabase.from("accounts").select(ACCOUNT_COLUMNS);
    const { data } = await (isAdmin ? q : q.eq("rep_email", rep.email));
    setAccounts((data ?? []).map(rowToAccount));
  }, [rep, isAdmin, setAccounts]);

  // Load DB accounts + weights on rep change
  useEffect(() => {
    if (!rep) {
      setAccounts([]);
      return;
    }
    initialWeightsLoaded.current = false;
    (async () => {
      await refresh();
      const { data: w } = await supabase
        .from("rep_weights")
        .select("weights")
        .eq("rep_email", rep.email)
        .maybeSingle();
      if (w?.weights) {
        setWeights(w.weights as unknown as typeof state.weights);
        lastWeightsKey.current = JSON.stringify(w.weights);
      } else {
        lastWeightsKey.current = JSON.stringify(state.weights);
      }
      initialWeightsLoaded.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rep, isAdmin]);

  // Listen for app-wide "accounts changed" events (imports, deletes, syncs)
  useEffect(() => {
    if (!rep) return;
    const handler = () => { void refresh(); };
    window.addEventListener("netapp:accounts-changed", handler);
    return () => window.removeEventListener("netapp:accounts-changed", handler);
  }, [rep, refresh]);

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
    const acct = state.accounts.find((a) => a.id === latest.accountId);
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
  }, [state.callLogs, rep, state.accounts]);

  return null;
}
