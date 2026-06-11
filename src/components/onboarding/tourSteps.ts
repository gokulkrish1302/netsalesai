import type { DriveStep } from "driver.js";

export const tourSteps: DriveStep[] = [
  {
    popover: {
      title: "Welcome to NetApp Sales Intelligence",
      description:
        "Let's take a quick tour of your workspace. You can skip anytime and replay it later from the help button in the top bar.",
      side: "over",
      align: "center",
    },
  },
  // Sidebar
  {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: "Dashboard",
      description:
        "Your daily command center — KPIs, top priority accounts, renewals, and the morning briefing.",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-accounts"]',
    popover: {
      title: "Accounts",
      description:
        "Browse your full portfolio in filterable swimlanes (Hot, Warm, Cold, Not Ready).",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-leaderboard"]',
    popover: {
      title: "Leaderboard",
      description: "Track team rankings and individual rep performance.",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-action-plans"]',
    popover: {
      title: "Action Plans",
      description:
        "AI-suggested next steps and talking points for each account.",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-renewals"]',
    popover: {
      title: "Renewals",
      description: "Contracts expiring soon, sorted by urgency.",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-imports"]',
    popover: {
      title: "Imports",
      description: "Bring in accounts via CSV upload or live Active IQ sync.",
      side: "right",
    },
  },
  {
    element: '[data-tour="nav-settings"]',
    popover: {
      title: "Settings",
      description: "Team management, integrations, and account preferences.",
      side: "right",
    },
  },
  // Top bar
  {
    element: '[data-tour="global-search"]',
    popover: {
      title: "Global search",
      description: "Jump to any account, plan, or rep with ⌘ K.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="sync-btn"]',
    popover: {
      title: "Active IQ sync",
      description: "Pull the latest telemetry from NetApp Active IQ on demand.",
      side: "bottom",
    },
  },
  // Dashboard widgets
  {
    element: '[data-tour="morning-briefing"]',
    popover: {
      title: "Morning Briefing",
      description:
        "An AI-generated summary of what changed since you last signed in — utilization spikes, new renewals, fresh risks, and your top priorities.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="stat-strip"]',
    popover: {
      title: "Portfolio at a glance",
      description: "Key KPIs across your territory, updated in real time.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="ranked-list"]',
    popover: {
      title: "Top Priority Accounts",
      description:
        "Your top accounts ranked by composite score — start here every morning.",
      side: "right",
    },
  },
  {
    element: '[data-tour="renewal-radar"]',
    popover: {
      title: "Renewal Radar",
      description:
        "Contracts approaching expiry. Click any row to open the account.",
      side: "left",
    },
  },
  {
    element: '[data-tour="ranked-list"]',
    popover: {
      title: "Ranked Accounts",
      description:
        "Every account ordered by score. Click one to open the detail panel — we'll show you what's inside next.",
      side: "right",
    },
  },
  // Account detail (opened programmatically)
  {
    element: '[data-tour="account-detail"]',
    popover: {
      title: "Account detail panel",
      description:
        "Telemetry, score breakdown, competitive risks, and contact info — everything you need for a customer conversation.",
      side: "left",
    },
  },
  {
    element: '[data-tour="action-plan-btn"]',
    popover: {
      title: "AI Action Plan",
      description:
        "Generates a tailored outreach plan with talking points, recommended messaging, and the right cadence for this account.",
      side: "left",
    },
  },
  // Wrap up
  {
    popover: {
      title: "You're all set",
      description:
        "That's the tour. You can replay it anytime by clicking the help (?) button in the top bar. Happy selling!",
      side: "over",
      align: "center",
    },
  },
];
