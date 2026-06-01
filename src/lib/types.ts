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
