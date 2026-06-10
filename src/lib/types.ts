export type CloudStatus = "active_cloud" | "hybrid" | "licensed_not_deployed" | "none";
export type PipelineStage =
  | "not_contacted"
  | "contacted"
  | "meeting_scheduled"
  | "proposal_sent"
  | "closed";
export type Category = "HOT" | "WARM" | "COLD" | "NOT_READY";
export type Industry =
  | "Tech"
  | "Finance"
  | "Healthcare"
  | "Retail"
  | "Manufacturing"
  | "Government";
export type Region = "West" | "East" | "Central" | "EMEA" | "APAC";

export type DataSource = "active_iq" | "excel_import";

export interface Account {
  id: string;
  accountName: string;
  salesRep: string;
  industry: Industry;
  region: Region;
  companySize: string;
  deviceModel: string;
  deviceAgeYears: number;
  endOfLife: boolean;
  storageCapacityTB: number;
  utilizationPct: number;
  itBudgetUSD: number;
  cloudStatus: CloudStatus;
  contractRenewalDays: number;
  annualRevenue: number;
  lastContactDate: string | null;
  pipelineStage: PipelineStage;
  dataSource?: DataSource;
  sourceTimestamp?: string;
  missingFields?: string[];
  netappModels?: string[];
  ontapVersion?: string;
  clusterCount?: number;
  storageArchitecture?: "Single Node" | "HA Pair" | "Cluster";
  riskCountHigh?: number;
  riskCountMedium?: number;
  itBudgetEstimated?: boolean;
  lastSyncedAt?: string;
}

export interface Weights {
  deviceAge: number;
  utilization: number;
  budget: number;
  cloud: number;
  industry: number;
  renewal: number;
}

export interface ScoreBreakdown {
  deviceAge: number;
  utilization: number;
  budget: number;
  cloud: number;
  industry: number;
  renewal: number;
}

export interface ScoreReasons {
  deviceAge: string;
  utilization: string;
  budget: string;
  cloud: string;
  industry: string;
  renewal: string;
}

export interface ScoredAccount extends Account {
  score: number;
  category: Category;
  breakdown: ScoreBreakdown;
  reasons: ScoreReasons;
  delta: number;
}

export type Urgency = "this_week" | "this_month" | "this_quarter";
export type ActionPlanStatus =
  | "not_contacted"
  | "contacted"
  | "meeting_scheduled"
  | "proposal_sent"
  | "won"
  | "lost";

export interface ActionPlanActivity {
  id: string;
  type: "note" | "call" | "email" | "status";
  text: string;
  createdAt: string;
}

export interface ActionPlanEntry {
  accountId: string;
  urgency: Urgency;
  status: ActionPlanStatus;
  createdAt: string;
  closedAt?: string;
  decidingFactor?: string;
  nextStepOverride?: string;
  activities: ActionPlanActivity[];
}

export interface CallLog {
  id: string;
  accountId: string;
  date: string;
  duration: string;
  outcome: string;
  notes: string;
  nextAction: string;
  createdAt: string;
}

export interface StageHistoryEntry {
  stage: PipelineStage;
  date: string;
}
