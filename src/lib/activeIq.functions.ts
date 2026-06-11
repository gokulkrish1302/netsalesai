import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ENDPOINT = "https://activeiq.netapp.com/graphql";

type GqlResult<T> = { data?: T; errors?: Array<{ message: string }> };

async function gql<T>(token: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Active IQ HTTP ${res.status}`);
  const text = await res.text();
  let json: GqlResult<T>;
  try {
    json = JSON.parse(text) as GqlResult<T>;
  } catch {
    const snippet = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(`Active IQ returned non-JSON response (check ACTIVE_IQ_TOKEN): ${snippet}`);
  }
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new Error("Active IQ returned no data");
  return json.data;
}

const Q_CUSTOMERS = `query { customers { customers { id name } } }`;
const Q_SYSTEMS_FOR_CUSTOMER = `query($customerId: String!) {
  systems(customerId: $customerId) {
    systems {
      systemId serialNumber hostName osVersion platformType
      ... on ONTAPSystem { cluster { id name } }
    }
  }
}`;
const Q_AGGREGATES = `query { aggregates(pageSize: 100) { aggregates { id name isRoot capacity { usableKiB } system { serialNumber systemId } } } }`;
const Q_CAPACITY = `query($customerId: String) {
  ONTAPSystemCapacity(customerId: $customerId) {
    logical { usedKiB } physical { usedKiB }
  }
}`;
const Q_RISKS = `query { risks(pageSize: 200) { risks { riskId severity riskInstances { system { serialNumber systemId } } } } }`;
const Q_WORKLOAD = `query($customerId: String) {
  workloadSummary(customerId: $customerId) { systemCount volumeCount }
}`;

interface CustomerNode { id: string; name: string }
interface SystemNode {
  systemId: string;
  serialNumber: string;
  hostName?: string;
  osVersion?: string;
  platformType?: string;
  cluster?: { id: string; name: string } | null;
}
interface AggregateNode {
  capacity?: { usableKiB?: number | null } | null;
  system?: { serialNumber?: string | null; systemId?: string | null } | null;
}
interface RiskNode {
  severity?: string | null;
  riskInstances?: Array<{ system?: { serialNumber?: string | null } | null }> | null;
}

function parseOntapMajorMinor(v?: string): [number, number] | null {
  if (!v) return null;
  const m = v.match(/(\d+)\.(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
}

function archFor(count: number): "Single Node" | "HA Pair" | "Cluster" {
  if (count <= 1) return "Single Node";
  if (count === 2) return "HA Pair";
  return "Cluster";
}

function inferCloudStatus(systems: SystemNode[]): "active_cloud" | "hybrid" | "none" {
  // Heuristic: BlueXP-connected systems hint at hybrid/active. Without that field
  // here we treat presence of cluster info + multiple systems as hybrid candidate.
  const hasCluster = systems.some((s) => s.cluster?.id);
  if (hasCluster && systems.length >= 3) return "hybrid";
  return "none";
}

function industryWeight(industry?: string): number {
  switch (industry) {
    case "Healthcare":
    case "Finance":
    case "Tech":
      return 100;
    case "Manufacturing":
    case "Energy":
      return 75;
    case "Retail":
    case "Government":
      return 50;
    default:
      return 60;
  }
}

function renewalScore(days: number): number {
  if (days < 30) return 100;
  if (days <= 90) return 75;
  if (days <= 180) return 50;
  return 25;
}

function cloudScore(s: string): number {
  if (s === "active_cloud") return 100;
  if (s === "hybrid") return 75;
  if (s === "evaluating") return 50;
  return 25;
}

function categoryFor(score: number): "HOT" | "WARM" | "COLD" | "NOT_READY" {
  if (score >= 80) return "HOT";
  if (score >= 50) return "WARM";
  if (score >= 25) return "COLD";
  return "NOT_READY";
}

export const syncActiveIQ = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = process.env.ACTIVE_IQ_TOKEN;
    if (!token) throw new Error("ACTIVE_IQ_TOKEN is not configured");

    const { supabase, claims } = context;
    const repEmail = (claims?.email as string | undefined) ?? "";
    if (!repEmail) throw new Error("Missing rep email on session");

    const { data: run } = await supabase
      .from("sync_runs")
      .insert({ rep_email: repEmail, status: "running" })
      .select("id")
      .single();
    const runId = run?.id as string | undefined;

    try {
      // 1) Customers
      const customersRes = await gql<{ customers: { customers: CustomerNode[] } }>(token, Q_CUSTOMERS);
      const customers = customersRes.customers?.customers ?? [];

      // 2) Aggregates + Risks (global, indexed by serialNumber)
      const [aggsRes, risksRes] = await Promise.all([
        gql<{ aggregates: { aggregates: AggregateNode[] } }>(token, Q_AGGREGATES),
        gql<{ risks: { risks: RiskNode[] } }>(token, Q_RISKS),
      ]);
      const aggsBySerial = new Map<string, number>();
      for (const a of aggsRes.aggregates?.aggregates ?? []) {
        const serial = a.system?.serialNumber;
        if (!serial) continue;
        const kib = a.capacity?.usableKiB ?? 0;
        aggsBySerial.set(serial, (aggsBySerial.get(serial) ?? 0) + Number(kib));
      }
      const risksBySerial = new Map<string, { high: number; medium: number }>();
      for (const r of risksRes.risks?.risks ?? []) {
        const sev = (r.severity ?? "").toLowerCase();
        for (const inst of r.riskInstances ?? []) {
          const serial = inst.system?.serialNumber;
          if (!serial) continue;
          const cur = risksBySerial.get(serial) ?? { high: 0, medium: 0 };
          if (sev === "high") cur.high += 1;
          else if (sev === "medium") cur.medium += 1;
          risksBySerial.set(serial, cur);
        }
      }

      // 3) Per-customer enrichment
      const enriched: Array<{
        customer: CustomerNode;
        systems: SystemNode[];
        storageTB: number;
        utilizationPct: number;
        highRisks: number;
        mediumRisks: number;
        cloudStatus: "active_cloud" | "hybrid" | "none";
      }> = [];

      for (const c of customers) {
        const [sysRes, capRes] = await Promise.all([
          gql<{ systems: { systems: SystemNode[] } }>(token, Q_SYSTEMS_FOR_CUSTOMER, { customerId: c.id }),
          gql<{ ONTAPSystemCapacity: { logical?: { usedKiB?: number }; physical?: { usedKiB?: number } } | null }>(
            token,
            Q_CAPACITY,
            { customerId: c.id },
          ).catch(() => ({ ONTAPSystemCapacity: null })),
        ]);
        const systems = sysRes.systems?.systems ?? [];
        let totalUsableKiB = 0;
        let high = 0;
        let medium = 0;
        for (const s of systems) {
          if (s.serialNumber) {
            totalUsableKiB += aggsBySerial.get(s.serialNumber) ?? 0;
            const r = risksBySerial.get(s.serialNumber);
            if (r) {
              high += r.high;
              medium += r.medium;
            }
          }
        }
        const storageTB = totalUsableKiB / (1024 * 1024 * 1024); // KiB -> TiB
        const cap = capRes?.ONTAPSystemCapacity;
        const logicalKiB = cap?.logical?.usedKiB ?? 0;
        const physicalKiB = cap?.physical?.usedKiB ?? 0;
        const utilizationPct = physicalKiB > 0 ? Math.min(100, (logicalKiB / physicalKiB) * 100) : 0;
        enriched.push({
          customer: c,
          systems,
          storageTB: Math.max(0, storageTB),
          utilizationPct,
          highRisks: high,
          mediumRisks: medium,
          cloudStatus: inferCloudStatus(systems),
        });
      }

      // 4) Read existing accounts so we preserve manual IT budget (Excel imports)
      const { data: existing } = await supabase
        .from("accounts")
        .select("id, customer_id, it_budget, it_budget_estimated, renewal_days")
        .eq("rep_email", repEmail);
      const existingByCustomer = new Map<string, NonNullable<typeof existing>[number]>();
      for (const row of existing ?? []) {
        if (row.customer_id) existingByCustomer.set(row.customer_id, row);
      }

      // 5) Budget + score
      // First pass: compute estimated budget per account
      type Computed = {
        customerId: string;
        accountName: string;
        storageTB: number;
        utilizationPct: number;
        systemCount: number;
        cloudStatus: "active_cloud" | "hybrid" | "none";
        highRisks: number;
        mediumRisks: number;
        netappModels: string[];
        ontapVersion: string | null;
        clusterCount: number;
        storageArchitecture: "Single Node" | "HA Pair" | "Cluster";
        renewalDays: number;
        deviceAgeYears: number;
        itBudget: number;
        itBudgetEstimated: boolean;
      };
      const computed: Computed[] = enriched.map((e) => {
        const base = e.storageTB * 2000;
        let mult = 1;
        if (e.cloudStatus === "hybrid") mult += 0.2;
        if (e.cloudStatus === "active_cloud") mult += 0.3;
        mult += 0.15 * e.highRisks;
        const sysCount = e.systems.length;
        const sysMult = sysCount <= 5 ? 1 : sysCount <= 15 ? 1.5 : 2;
        const estimated = Math.round(base * mult * sysMult);

        const existingRow = existingByCustomer.get(e.customer.id);
        const useManual = existingRow && existingRow.it_budget != null && existingRow.it_budget_estimated === false;
        const itBudget = useManual ? Number(existingRow!.it_budget) : estimated;

        const models = Array.from(
          new Set(e.systems.map((s) => s.platformType).filter((x): x is string => !!x)),
        );
        const ontap = e.systems.map((s) => s.osVersion).find((v): v is string => !!v) ?? null;
        const clusterIds = new Set(e.systems.map((s) => s.cluster?.id).filter(Boolean) as string[]);
        const renewalDays = existingRow?.renewal_days ?? 365;
        // Approximate device age from ONTAP version: <9.10 → 7y, 9.10+ → 3y
        const mm = parseOntapMajorMinor(ontap ?? undefined);
        const isLegacy = mm ? mm[0] < 9 || (mm[0] === 9 && mm[1] < 10) : true;
        const deviceAgeYears = isLegacy ? 7 : 3;

        return {
          customerId: e.customer.id,
          accountName: e.customer.name,
          storageTB: e.storageTB,
          utilizationPct: e.utilizationPct,
          systemCount: sysCount,
          cloudStatus: e.cloudStatus,
          highRisks: e.highRisks,
          mediumRisks: e.mediumRisks,
          netappModels: models,
          ontapVersion: ontap,
          clusterCount: clusterIds.size || (sysCount > 0 ? 1 : 0),
          storageArchitecture: archFor(sysCount),
          renewalDays,
          deviceAgeYears,
          itBudget,
          itBudgetEstimated: !useManual,
        };
      });

      const maxBudget = Math.max(1, ...computed.map((c) => c.itBudget));

      const nowIso = new Date().toISOString();
      const rows = computed.map((c) => {
        // Score components
        const deviceAgeS = c.deviceAgeYears >= 7 ? 100 : Math.min(100, (c.deviceAgeYears / 7) * 100);
        const utilS = c.utilizationPct >= 90 ? 100 : (c.utilizationPct / 90) * 100;
        const budgetS = (c.itBudget / maxBudget) * 100;
        const cloudS = cloudScore(c.cloudStatus);
        const industryS = industryWeight(undefined); // unknown from Active IQ
        const renewalS = renewalScore(c.renewalDays);
        const score = Math.round(
          deviceAgeS * 0.2 +
            utilS * 0.15 +
            budgetS * 0.25 +
            cloudS * 0.25 +
            industryS * 0.1 +
            renewalS * 0.05,
        );
        return {
          rep_email: repEmail,
          account_name: c.accountName,
          customer_id: c.customerId,
          score,
          priority_badge: categoryFor(score),
          device_age: c.deviceAgeYears,
          storage_utilization: Math.round(c.utilizationPct),
          it_budget: c.itBudget,
          it_budget_estimated: c.itBudgetEstimated,
          renewal_days: c.renewalDays,
          cloud_status: c.cloudStatus,
          data_source: "active_iq",
          last_synced_at: nowIso,
          netapp_models: c.netappModels,
          ontap_version: c.ontapVersion,
          cluster_count: c.clusterCount,
          storage_architecture: c.storageArchitecture,
          risk_count_high: c.highRisks,
          risk_count_medium: c.mediumRisks,
        };
      });

      if (rows.length > 0) {
        const { error: upErr } = await supabase
          .from("accounts")
          .upsert(rows, { onConflict: "rep_email,customer_id" });
        if (upErr) throw new Error(upErr.message);
      }

      if (runId) {
        await supabase
          .from("sync_runs")
          .update({ status: "success", account_count: rows.length, finished_at: nowIso })
          .eq("id", runId);
      }

      return { ok: true as const, count: rows.length, syncedAt: nowIso };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (runId) {
        await supabase
          .from("sync_runs")
          .update({ status: "error", error_message: message, finished_at: new Date().toISOString() })
          .eq("id", runId);
      }
      throw new Error(message);
    }
  });

export const getLastSync = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, claims } = context;
    const repEmail = (claims?.email as string | undefined) ?? "";
    const { data } = await supabase
      .from("sync_runs")
      .select("status, account_count, finished_at, started_at, error_message")
      .eq("rep_email", repEmail)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });
