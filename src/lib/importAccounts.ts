import type { Account, CloudStatus, Industry, PipelineStage, Region } from "./types";
import * as XLSX from "xlsx";

const INDUSTRIES: Industry[] = ["Tech", "Finance", "Healthcare", "Retail", "Manufacturing", "Government"];
const REGIONS: Region[] = ["West", "East", "Central", "EMEA", "APAC"];
const CLOUD: CloudStatus[] = ["active_cloud", "hybrid", "licensed_not_deployed", "none"];

// Map common header variants -> canonical field
const HEADER_MAP: Record<string, keyof RawRow> = {
  "account name": "accountName",
  "account": "accountName",
  "company": "accountName",
  "company name": "accountName",
  "name": "accountName",
  "sales rep": "salesRep",
  "rep": "salesRep",
  "owner": "salesRep",
  "industry": "industry",
  "vertical": "industry",
  "region": "region",
  "geo": "region",
  "company size": "companySize",
  "size": "companySize",
  "employees": "companySize",
  "device model": "deviceModel",
  "model": "deviceModel",
  "device age": "deviceAgeYears",
  "device age years": "deviceAgeYears",
  "age": "deviceAgeYears",
  "end of life": "endOfLife",
  "eol": "endOfLife",
  "storage capacity tb": "storageCapacityTB",
  "storage tb": "storageCapacityTB",
  "capacity": "storageCapacityTB",
  "utilization": "utilizationPct",
  "utilization pct": "utilizationPct",
  "utilization %": "utilizationPct",
  "it budget": "itBudgetUSD",
  "budget": "itBudgetUSD",
  "it budget usd": "itBudgetUSD",
  "cloud status": "cloudStatus",
  "cloud": "cloudStatus",
  "contract renewal days": "contractRenewalDays",
  "renewal days": "contractRenewalDays",
  "renewal": "contractRenewalDays",
  "annual revenue": "annualRevenue",
  "revenue": "annualRevenue",
  "last contact": "lastContactDate",
  "last contact date": "lastContactDate",
  "pipeline stage": "pipelineStage",
  "stage": "pipelineStage",
};

interface RawRow {
  accountName?: string;
  salesRep?: string;
  industry?: string;
  region?: string;
  companySize?: string;
  deviceModel?: string;
  deviceAgeYears?: string | number;
  endOfLife?: string | boolean;
  storageCapacityTB?: string | number;
  utilizationPct?: string | number;
  itBudgetUSD?: string | number;
  cloudStatus?: string;
  contractRenewalDays?: string | number;
  annualRevenue?: string | number;
  lastContactDate?: string;
  pipelineStage?: string;
}

export interface ImportResult {
  accounts: Account[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
  totalRows: number;
}

function normalizeHeader(h: string): keyof RawRow | null {
  const k = String(h).trim().toLowerCase();
  return HEADER_MAP[k] ?? null;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,%\s]/g, "").replace(/[A-Za-z]/g, "");
    const n = parseFloat(cleaned);
    if (!Number.isNaN(n)) {
      if (/k$/i.test(v.trim())) return n * 1_000;
      if (/m$/i.test(v.trim())) return n * 1_000_000;
      if (/b$/i.test(v.trim())) return n * 1_000_000_000;
      return n;
    }
  }
  return fallback;
}
function bool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return /^(true|yes|y|1|eol)$/i.test(v.trim());
  if (typeof v === "number") return v === 1;
  return false;
}
function pickEnum<T extends string>(v: unknown, options: T[], fallback: T): T {
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  const exact = options.find((o) => o.toLowerCase() === t.toLowerCase());
  if (exact) return exact;
  return fallback;
}
function pickCloud(v: unknown): CloudStatus {
  if (typeof v !== "string") return "none";
  const t = v.trim().toLowerCase().replace(/\s+/g, "_");
  if (CLOUD.includes(t as CloudStatus)) return t as CloudStatus;
  if (/active|aws|azure|gcp/.test(t)) return "active_cloud";
  if (/hybrid/.test(t)) return "hybrid";
  if (/licens/.test(t)) return "licensed_not_deployed";
  return "none";
}
function pickStage(v: unknown): PipelineStage {
  if (typeof v !== "string") return "not_contacted";
  const t = v.trim().toLowerCase().replace(/\s+/g, "_");
  const valid: PipelineStage[] = ["not_contacted", "contacted", "meeting_scheduled", "proposal_sent", "closed"];
  if (valid.includes(t as PipelineStage)) return t as PipelineStage;
  if (/closed|won/.test(t)) return "closed";
  if (/proposal/.test(t)) return "proposal_sent";
  if (/meeting/.test(t)) return "meeting_scheduled";
  if (/contact/.test(t)) return "contacted";
  return "not_contacted";
}

/** Parse an xlsx/csv ArrayBuffer into a normalized ImportResult. */
export function parseAccountsWorkbook(buffer: ArrayBuffer, filename: string): ImportResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) {
    return { accounts: [], errors: [{ row: 0, message: "Workbook has no sheets" }], warnings: [], totalRows: 0 };
  }
  const sheet = wb.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });

  const errors: ImportResult["errors"] = [];
  const warnings: ImportResult["warnings"] = [];
  const accounts: Account[] = [];
  const baseId = filename.replace(/\W+/g, "-").toLowerCase() + "-" + Date.now().toString(36);
  const uploadedAt = new Date().toISOString();

  rows.forEach((row, i) => {
    const rowNum = i + 2; // header is row 1
    const normalized: RawRow = {};
    for (const [k, v] of Object.entries(row)) {
      const field = normalizeHeader(k);
      if (field) (normalized as Record<string, unknown>)[field] = v;
    }

    const accountName = String(normalized.accountName ?? "").trim();
    if (!accountName) {
      errors.push({ row: rowNum, message: "Missing Account Name" });
      return;
    }
    if (accountName.length > 200) {
      errors.push({ row: rowNum, message: "Account Name too long (max 200 chars)" });
      return;
    }

    const renewal = Math.max(0, Math.min(2000, Math.round(num(normalized.contractRenewalDays, 365))));
    const ageYears = Math.max(0, Math.min(20, num(normalized.deviceAgeYears, 2)));
    const utilization = Math.max(0, Math.min(100, num(normalized.utilizationPct, 50)));
    const itBudget = Math.max(0, num(normalized.itBudgetUSD, 100_000));
    const storageTB = Math.max(0, num(normalized.storageCapacityTB, 50));
    const revenue = Math.max(0, num(normalized.annualRevenue, 50_000_000));

    if (!normalized.industry) warnings.push({ row: rowNum, message: `${accountName}: industry defaulted to Tech` });
    if (!normalized.region) warnings.push({ row: rowNum, message: `${accountName}: region defaulted to West` });
    if (!normalized.cloudStatus) warnings.push({ row: rowNum, message: `${accountName}: cloud status defaulted to none` });

    const missingFields: string[] = [];
    if (!normalized.industry) missingFields.push("Industry");
    if (!normalized.region) missingFields.push("Region");
    if (!normalized.companySize) missingFields.push("Company Size");
    if (!normalized.deviceModel) missingFields.push("Device Model");
    if (normalized.deviceAgeYears == null || normalized.deviceAgeYears === "") missingFields.push("Device Age");
    if (!normalized.cloudStatus) missingFields.push("Cloud Status");
    if (normalized.contractRenewalDays == null || normalized.contractRenewalDays === "") missingFields.push("Renewal Days");
    if (normalized.itBudgetUSD == null || normalized.itBudgetUSD === "") missingFields.push("IT Budget");
    if (!normalized.lastContactDate) missingFields.push("Last Contact Date");

    accounts.push({
      id: `imp-${baseId}-${i}`,
      accountName,
      salesRep: String(normalized.salesRep ?? "Unassigned").trim().slice(0, 100),
      industry: pickEnum(normalized.industry, INDUSTRIES, "Tech"),
      region: pickEnum(normalized.region, REGIONS, "West"),
      companySize: String(normalized.companySize ?? "Unknown").trim().slice(0, 80),
      deviceModel: String(normalized.deviceModel ?? "Unknown").trim().slice(0, 80),
      deviceAgeYears: ageYears,
      endOfLife: bool(normalized.endOfLife),
      storageCapacityTB: storageTB,
      utilizationPct: utilization,
      itBudgetUSD: itBudget,
      cloudStatus: pickCloud(normalized.cloudStatus),
      contractRenewalDays: renewal,
      annualRevenue: revenue,
      lastContactDate: normalized.lastContactDate ? String(normalized.lastContactDate).slice(0, 30) : null,
      pipelineStage: pickStage(normalized.pipelineStage),
      dataSource: "excel_import",
      sourceTimestamp: uploadedAt,
      missingFields,
    });
  });

  return { accounts, errors, warnings, totalRows: rows.length };
}

/** Build a sample workbook for the user to download. */
export function buildTemplateWorkbook(): ArrayBuffer {
  const headers = [
    "Account Name", "Sales Rep", "Industry", "Region", "Company Size",
    "Device Model", "Device Age Years", "End Of Life",
    "Storage Capacity TB", "Utilization %", "IT Budget USD", "Cloud Status",
    "Contract Renewal Days", "Annual Revenue", "Last Contact Date", "Pipeline Stage",
  ];
  const examples = [
    ["Acme Robotics", "Jordan Reyes", "Tech", "West", "8,000 employees",
      "AFF A400", 4.2, "No",
      350, 78, 620000, "hybrid",
      85, 1200000000, "2026-05-12", "contacted"],
    ["Riverstone Bank", "Alex Chen", "Finance", "East", "15,000 employees",
      "FAS8200", 6.1, "Yes",
      820, 91, 1500000, "none",
      45, 4500000000, "2026-04-30", "meeting_scheduled"],
    ["Aurora Healthcare", "Priya Shah", "Healthcare", "Central", "22,000 employees",
      "AFF C800", 2.4, "No",
      640, 64, 480000, "active_cloud",
      210, 3200000000, "2026-05-22", "not_contacted"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Accounts");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
