import type { ScoredAccount } from "./types";
import { formatCurrencyShort } from "./format";

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
