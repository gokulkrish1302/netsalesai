import { supabase } from "@/integrations/supabase/client";
import { scoreAccount, CATEGORY_META } from "@/lib/scoring";
import type { Account } from "@/lib/types";

// Stable per-file customer_id so re-imports upsert rather than duplicate.
async function customerId(filename: string, accountName: string): Promise<string> {
  const data = new TextEncoder().encode(`${filename}::${accountName}`);
  const buf = await crypto.subtle.digest("SHA-1", data);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `excel:${hex}`;
}

function accountToRow(a: Account, repEmail: string, filename: string, cid: string) {
  const scored = scoreAccount(a);
  return {
    rep_email: repEmail,
    account_name: a.accountName,
    customer_id: cid,
    score: scored.total,
    priority_badge: CATEGORY_META[scored.category].label,
    status: a.pipelineStage,
    device_age: a.deviceAgeYears,
    storage_utilization: Math.round(a.utilizationPct),
    it_budget: a.itBudgetUSD,
    it_budget_estimated: a.itBudgetEstimated ?? false,
    renewal_days: a.contractRenewalDays,
    cloud_status: a.cloudStatus,
    industry: a.industry,
    region: a.region,
    data_source: "excel_import",
    last_synced_at: new Date().toISOString(),
    netapp_models: a.netappModels ?? null,
    ontap_version: a.ontapVersion ?? null,
    cluster_count: a.clusterCount ?? null,
    storage_architecture: a.storageArchitecture ?? null,
    risk_count_high: a.riskCountHigh ?? 0,
    risk_count_medium: a.riskCountMedium ?? 0,
    import_filename: filename,
  };
}

export async function saveImportedAccounts(
  repEmail: string,
  filename: string,
  accounts: Account[],
): Promise<number> {
  if (!accounts.length) return 0;
  const rows = await Promise.all(
    accounts.map(async (a) => accountToRow(a, repEmail, filename, await customerId(filename, a.accountName))),
  );
  const { error } = await supabase
    .from("accounts")
    .upsert(rows, { onConflict: "rep_email,customer_id" });
  if (error) throw new Error(error.message);
  window.dispatchEvent(new CustomEvent("netapp:accounts-changed"));
  return rows.length;
}

export async function deleteImportedFile(repEmail: string, filename: string): Promise<void> {
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("rep_email", repEmail)
    .eq("import_filename", filename);
  if (error) throw new Error(error.message);
  window.dispatchEvent(new CustomEvent("netapp:accounts-changed"));
}
