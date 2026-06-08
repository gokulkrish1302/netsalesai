import type { ScoredAccount, Urgency, Industry } from "./types";
import { formatCurrencyShort } from "./format";

export const URGENCY_LABEL: Record<Urgency, string> = {
  this_week: "This Week",
  this_month: "This Month",
  this_quarter: "This Quarter",
};

export interface TimelineStep {
  day: number;
  label: string;
  action: string;
}

export function buildUrgencyTimeline(account: ScoredAccount, urgency: Urgency): TimelineStep[] {
  const days =
    urgency === "this_week"
      ? [1, 2, 4, 7]
      : urgency === "this_month"
        ? [1, 3, 7, 14]
        : [1, 7, 21, 45];
  const renewalStr = new Date(Date.now() + account.contractRenewalDays * 86_400_000).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" },
  );
  const actions = [
    `Send personalized intro email referencing the ${account.deviceModel} (${account.deviceAgeYears.toFixed(1)} yrs) and ${account.utilizationPct}% utilization.`,
    `Phone follow-up to schedule a 30-min discovery call. Lead with the ${renewalStr} renewal window.`,
    `Discovery meeting + BlueXP / Cloud Insights demo tailored to current workload mix.`,
    `Send proposal with ROI summary (${formatCurrencyShort(Math.round(account.itBudgetUSD * 0.12))}–${formatCurrencyShort(Math.round(account.itBudgetUSD * 0.28))}) aligned to renewal date.`,
  ];
  return days.map((d, i) => ({ day: d, label: `Day ${d}`, action: actions[i] }));
}

export function buildAccountSummary(account: ScoredAccount): string {
  const renewalStr = new Date(Date.now() + account.contractRenewalDays * 86_400_000).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
  const urgencyHook =
    account.contractRenewalDays <= 90
      ? `renewal closes in ${account.contractRenewalDays} days (${renewalStr})`
      : `renewal on ${renewalStr} gives a clear runway`;
  return `${account.accountName} scores ${account.score}/100 (${account.category}). Storage utilization sits at ${account.utilizationPct}% on a ${account.deviceAgeYears.toFixed(1)}-year-old ${account.deviceModel}, IT budget is ${formatCurrencyShort(account.itBudgetUSD)}, and the ${urgencyHook}. The combination of aging hardware, capacity pressure, and the upcoming contract inflection make this a priority touch.`;
}

const INDUSTRY_OBJECTIONS: Record<Industry, { objection: string; response: string }[]> = {
  Finance: [
    { objection: "Compliance and data residency are non-negotiable.", response: "BlueXP supports regional encryption, sovereign cloud regions, and audit logging — many of our largest financial customers run regulated workloads on it." },
    { objection: "We can't afford downtime during a migration.", response: "SnapMirror enables incremental, online cutovers — zero-downtime migrations are the standard pattern, not the exception." },
  ],
  Healthcare: [
    { objection: "HIPAA and PHI handling rules me out of cloud.", response: "Our cloud volumes are HIPAA-eligible with BAAs in place across AWS, Azure, and GCP. PHI stays encrypted at rest and in flight." },
    { objection: "Clinical apps can't tolerate latency variability.", response: "FlexCache and tiered storage keep hot data local — clinical IO stays predictable while cold data tiers to cloud." },
  ],
  Government: [
    { objection: "We require FedRAMP and air-gapped options.", response: "NetApp is FedRAMP authorized across multiple impact levels and supports GovCloud and on-prem-only deployments." },
    { objection: "Procurement cycles take 12+ months.", response: "Keystone subscription pricing fits existing OpEx vehicles and is on most federal contract schedules — we can align to your buying motion." },
  ],
  Tech: [
    { objection: "We're already cloud-native — why NetApp?", response: "BlueXP gives you portable data services across clouds without vendor lock-in. It complements your stack, not replaces it." },
    { objection: "We can just use native cloud storage.", response: "Native cloud storage gets expensive at scale. Cloud Volumes ONTAP cuts cloud storage TCO 30–50% with dedup, compression, and cloning." },
  ],
  Retail: [
    { objection: "Our peak season is non-negotiable — no risk.", response: "We run pilot migrations outside peak windows and use SnapMirror for cutover. Many retailers refresh between Q1 and Q3." },
    { objection: "Margins are thin — capex is hard to justify.", response: "Keystone OpEx subscription converts the conversation from capex to predictable monthly spend tied to actual consumption." },
  ],
  Manufacturing: [
    { objection: "Plant-floor systems can't be touched.", response: "Edge-to-core-to-cloud architecture leaves OT systems untouched while modernizing the data layer behind them." },
    { objection: "We don't have cloud skills in-house.", response: "BlueXP unifies on-prem and cloud under one console — your existing ONTAP admins manage cloud the same way they manage on-prem." },
  ],
};

export function buildIndustryObjections(account: ScoredAccount) {
  return INDUSTRY_OBJECTIONS[account.industry] ?? INDUSTRY_OBJECTIONS.Tech;
}

export function estimateDealSize(account: ScoredAccount): { low: number; high: number } {
  const base = account.itBudgetUSD * (account.category === "HOT" ? 0.18 : account.category === "WARM" ? 0.12 : 0.06);
  return { low: Math.round(base * 0.7), high: Math.round(base * 1.4) };
}

export function suggestNextStep(noteText: string, fallback: string): string {
  const t = noteText.toLowerCase();
  if (/voicemail|left.*message|no answer/.test(t)) return "Try again at a different time of day; send a brief follow-up email referencing the voicemail.";
  if (/meeting (set|scheduled|booked)|calendar/.test(t)) return "Prep an agenda + tailored demo; share read-ahead materials 24 hours before.";
  if (/proposal|quote|pricing/.test(t)) return "Follow up in 3 business days; confirm proposal received and offer a walkthrough.";
  if (/budget|cfo|finance|procurement/.test(t)) return "Loop in your account exec to position Keystone OpEx and align to fiscal cycle.";
  if (/competitor|pure|dell|hpe|aws|azure/.test(t)) return "Build a side-by-side comparison; emphasize multi-cloud portability and TCO over 36 months.";
  if (/not interested|pass|busy|later/.test(t)) return "Move to a quarterly nurture cadence; send a relevant case study in 30 days.";
  if (/decision maker|cio|cto|vp|director/.test(t)) return "Request an exec briefing; bring a customer reference from the same industry.";
  if (/won|signed|closed/.test(t)) return "Mark status as Won and capture the deciding factor for the team.";
  return fallback;
}

export interface ActionPlan {
  executiveSummary: string;
  products: { name: string; description: string }[];
  talkingPoints: string[];
  timeline: { week: string; action: string }[];
  roiLow: number;
  roiHigh: number;
  roiPct: string;
  objections: { objection: string; response: string }[];
}

export function buildActionPlan(account: ScoredAccount): ActionPlan {
  const renewalDate = new Date(Date.now() + account.contractRenewalDays * 86_400_000);
  const renewalStr = renewalDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const roiLow = Math.round(account.itBudgetUSD * 0.12);
  const roiHigh = Math.round(account.itBudgetUSD * 0.28);
  const roiPct = "18–32% TCO reduction over 36 months";

  if (account.category === "HOT") {
    return {
      executiveSummary: `${account.accountName} is a top-tier migration opportunity. The ${account.deviceModel} is ${account.deviceAgeYears.toFixed(1)} years old, storage sits at ${account.utilizationPct}%, and the support contract expires ${renewalStr}. Move fast: lock the architecture conversation before renewal closes.`,
      products: [
        { name: "NetApp BlueXP", description: "Unified control plane for hybrid and multi-cloud data services." },
        { name: "Cloud Volumes ONTAP", description: "Production-grade ONTAP in AWS, Azure, and Google Cloud." },
        { name: "Keystone Flex Subscription", description: "OpEx pricing tied to consumption — aligned to renewal cycle." },
      ],
      talkingPoints: [
        `Your ${account.deviceModel} is at end-of-support life — refresh window is ~90 days, not 12 months.`,
        `Renewal date (${renewalStr}) is the natural inflection point to convert capex into Keystone OpEx.`,
        `Active IQ telemetry shows ${account.utilizationPct}% utilization — capacity expansion is unavoidable in the next two quarters.`,
      ],
      timeline: [
        { week: "Week 1", action: "Executive briefing + technical deep dive with infrastructure architect." },
        { week: "Week 2", action: "BlueXP demo tailored to current workload mix, proposal scoped to renewal date." },
        { week: "Week 3", action: "Procurement review, security/compliance signoff, contract negotiation." },
      ],
      roiLow,
      roiHigh,
      roiPct,
      objections: [
        {
          objection: '"We just want to renew like-for-like and revisit cloud next year."',
          response: `Like-for-like locks in legacy economics for another 3 years. Renewing on Keystone keeps the door open quarterly, with no upfront capex.`,
        },
        {
          objection: '"AWS gave us a competing proposal."',
          response: `BlueXP runs natively inside AWS, Azure, and GCP. It's not NetApp vs cloud — it's NetApp on cloud with consistent data services, snapshots, and replication across all three.`,
        },
      ],
    };
  }

  if (account.category === "WARM") {
    return {
      executiveSummary: `${account.accountName} is a strong mid-term opportunity. Device age (${account.deviceAgeYears.toFixed(1)} yrs) and utilization (${account.utilizationPct}%) indicate a refresh in 6–12 months. Build the relationship now so we're the default choice at renewal (${renewalStr}).`,
      products: [
        { name: "NetApp BlueXP", description: "Single pane of glass for current on-prem plus future cloud workloads." },
        { name: "ONTAP One", description: "All-inclusive software bundle simplifies licensing across the fleet." },
        { name: "Cloud Insights", description: "Telemetry-driven cost and performance visibility — easy entry point." },
      ],
      talkingPoints: [
        `Storage at ${account.utilizationPct}% — modeling capacity over the next 18 months gives a clear refresh case.`,
        `Cloud Insights is a low-friction first step that builds trust before the larger architecture decision.`,
        `Aligning to renewal (${renewalStr}) gives the customer time to evaluate without urgency pressure.`,
      ],
      timeline: [
        { week: "Week 1", action: "Discovery call: current workloads, growth plans, cloud strategy." },
        { week: "Week 2–3", action: "Workshop on Cloud Insights trial; collect performance baseline." },
        { week: "Week 4", action: "Joint architecture review with proposed roadmap to renewal date." },
      ],
      roiLow,
      roiHigh,
      roiPct,
      objections: [
        {
          objection: '"We\'re not ready to evaluate alternatives yet."',
          response: `Cloud Insights is a 30-day trial — zero migration risk. It just gives your team better data for whatever decision you make.`,
        },
        {
          objection: '"Budget is committed for this fiscal year."',
          response: `Understood. Let's use the next two quarters to build the business case so it's shovel-ready when next year's budget opens.`,
        },
      ],
    };
  }

  if (account.category === "COLD") {
    return {
      executiveSummary: `${account.accountName} is a long-cycle nurture account. Refresh signals are weak today (utilization ${account.utilizationPct}%, ${account.deviceAgeYears.toFixed(1)}-yr device), but renewal (${renewalStr}) gives a 12+ month runway to position NetApp for the next cycle.`,
      products: [
        { name: "Cloud Insights", description: "Free tier — gets NetApp telemetry into their environment with no commitment." },
        { name: "BlueXP Free Edition", description: "Lets the team explore cloud data management without spend." },
        { name: "ONTAP Select", description: "Software-defined storage trial for dev/test workloads." },
      ],
      talkingPoints: [
        `Position NetApp as a strategic advisor, not a vendor — share industry benchmarks and best practices.`,
        `Free Cloud Insights tier removes objections and creates a touchpoint for quarterly check-ins.`,
        `Use the long horizon to map stakeholders and understand budget cycles for next year.`,
      ],
      timeline: [
        { week: "Week 1", action: "Send personalized industry benchmark report — no ask, just value." },
        { week: "Week 4", action: "Follow-up call: discuss findings, offer Cloud Insights free trial." },
        { week: "Week 8", action: "Quarterly check-in cadence established; map decision-makers." },
      ],
      roiLow,
      roiHigh,
      roiPct: "12–22% TCO reduction projected at next refresh cycle",
      objections: [
        {
          objection: '"We just refreshed — call us in two years."',
          response: `Totally fair. Our goal isn't to sell you something today — it's to be the obvious call when you do start evaluating. Mind if I keep you on quarterly updates?`,
        },
        {
          objection: '"We don\'t have a cloud strategy yet."',
          response: `Most of our best customers didn't either when we first met. Cloud Insights gives you data to start building one — no commitment required.`,
        },
      ],
    };
  }

  // NOT_READY
  return {
    executiveSummary: `${account.accountName} is not a near-term opportunity. The infrastructure is new (${account.deviceAgeYears.toFixed(1)} yrs), utilization is low (${account.utilizationPct}%), and budget is constrained (${formatCurrencyShort(account.itBudgetUSD)}). Recommended posture: low-touch nurture only.`,
    products: [
      { name: "Cloud Insights Free Tier", description: "Zero-cost telemetry entry point if they ever want it." },
      { name: "NetApp Newsletter", description: "Light-touch content nurture — no calls, just visibility." },
      { name: "Reference Architecture Library", description: "Self-service educational content for when they're ready." },
    ],
    talkingPoints: [
      `Don't push a deal — push value. A single helpful resource per quarter keeps you top-of-mind.`,
      `Watch for trigger events: leadership change, acquisition, sudden capacity growth.`,
      `Time spent here is better invested in HOT and WARM accounts this quarter.`,
    ],
    timeline: [
      { week: "Quarterly", action: "Single helpful email — industry report or reference architecture." },
      { week: "Annually", action: "One scheduled check-in call to reassess trajectory." },
      { week: "Trigger-based", action: "Reactivate immediately if utilization or budget shifts." },
    ],
    roiLow: 0,
    roiHigh: 0,
    roiPct: "Not modeled — account does not meet investment thresholds",
    objections: [
      {
        objection: '"Why are you contacting us if you don\'t think we\'re a fit?"',
        response: `We're not pitching anything today. Just keeping the door open and sharing one resource a quarter in case priorities change.`,
      },
      {
        objection: '"Take us off your list."',
        response: `Absolutely — fully respect that. Closing the loop in our CRM now.`,
      },
    ],
  };
}
