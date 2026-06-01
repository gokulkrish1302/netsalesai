
# NetApp Cloud Migration Agent — Build Plan

A single-page React app (TanStack Start routes) for NetApp's sales team to triage cloud-migration accounts. Light mode only, Inter font, NetApp blue (#0067C5).

## Scope

6 pages + 3 modals + global nav, all driven by 20 mock accounts and a configurable scoring engine. No backend — state in React + localStorage.

## Architecture

```
src/
  routes/
    __root.tsx              ← sidebar + topbar shell, <Outlet/>
    index.tsx               ← Dashboard
    accounts.tsx            ← Accounts grid
    leaderboard.tsx
    renewals.tsx            ← Renewal Alerts
    settings.tsx
  lib/
    mockAccounts.ts         ← 20 hand-tuned accounts
    scoring.ts              ← 6-criterion scorer + category thresholds
    format.ts               ← $1.2M, %, days helpers
    emailTemplates.ts       ← 3 tones × 4 categories
    actionPlans.ts          ← 4 category templates
  state/
    AppStore.tsx            ← Context: accounts, weights, filters,
                              pipelineStages, notes, callLogs,
                              activeAccount, search
                            ← persists weights/stages/notes/calls to localStorage
  components/
    layout/Sidebar.tsx, TopBar.tsx, GlobalSearch.tsx
    common/ScoreBadge.tsx, CategoryPill.tsx, ScoreBar.tsx,
           ScoreGauge.tsx (SVG), RenewalCountdown.tsx,
           CompetitiveRiskBadge.tsx, Toast wrapper (sonner)
    dashboard/KpiRow.tsx, AlertBanner.tsx, FocusCard.tsx,
              CategoryDonut.tsx, TopAccountsBar.tsx, PriorityTable.tsx
    accounts/FilterBar.tsx, AccountCard.tsx, PipelineStageSelect.tsx
    detail/AccountDetailPanel.tsx (Sheet from right, 480px),
           ScoreBreakdown.tsx, PipelineStepper.tsx, NotesPanel.tsx,
           CallHistory.tsx
    modals/EmailModal.tsx, ActionPlanModal.tsx, LogCallModal.tsx
    renewals/UrgencyGroup.tsx
    leaderboard/LeaderboardTable.tsx (framer-motion reorder)
    settings/WeightSliders.tsx, BeforeAfterTop5.tsx
```

## Data model

`Account` matches the spec exactly. `mockAccounts.ts` is hand-crafted so scoring yields **5 HOT / 6 WARM / 5 COLD / 4 NOT READY**, ≥4 with renewal <60d, ≥3 with `endOfLife && cloudStatus==="none"`. I'll verify the distribution by running the scorer in a quick script before shipping.

## Scoring engine

Pure function `scoreAccount(account, weights)` returning `{ total, category, breakdown: { deviceAge, utilization, budget, cloud, industry, renewal }, reasons: {...plain-English strings} }`. Default weights match spec (20/15/25/25/10/5 = 100). Bands within each criterion are scaled by `weight/defaultWeight` so user-tuned weights stay proportional and the cap stays at 100. Categories: HOT ≥75, WARM ≥50, COLD ≥25, else NOT READY.

## Design system

Tokens added to `src/styles.css` as oklch equivalents of the hex palette, exposed as `--primary` (#0067C5), `--hot`, `--warm`, `--cold`, `--not-ready`, `--success`, `--warning`, plus surface/border. Inter loaded via Google Fonts in `__root.tsx` head. All components consume tokens (no raw hex in JSX). Card preset: `bg-card border rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)]`. Light mode only — no `.dark` overrides.

## Page-by-page

1. **Dashboard** — KPI row (4 cards), amber alert banner (only if any urgent), Focus Card for #1 account with 3 CTAs (opens modals), donut + horizontal bar (Recharts), Top 10 priority table with per-row Email/Plan/Log buttons.
2. **Accounts** — sticky filter bar (category pills, industry & region multi-select via Popover+Checkbox, sort select), 2-col card grid, inline pipeline-stage `<Select>` with green-flash animation on change, competitive-risk badge when applicable, 3 action buttons.
3. **Account Detail Panel** — Sheet from right, 480px, backdrop blur. SVG gauge animated via `stroke-dasharray`, 6 breakdown bars with reasons, intel grid, pipeline stepper (clickable forward, history list), notes textarea, call history, 4 action buttons. Triggered from any account anywhere (managed by `activeAccount` in store).
4. **Renewal Alerts** — 3 urgency groups (≤30 / 31-60 / 61-180), rows with countdown + last-contact + Email/Log buttons, pulsing red dot on never-contacted ≤60d.
5. **Leaderboard** — ranked table, 🥇🥈🥉 for top 3, hardcoded score deltas, toggle between Score/Renewal/Budget with `framer-motion`'s `LayoutGroup` for smooth reorder.
6. **Settings** — 6 sliders. Dragging one auto-normalizes the other five proportionally to keep sum=100. Live recompute of all account scores. Before/after top-5 panel. Reset button. Toast on change (debounced).

## Modals

- **Email** — auto-filled subject + body using account fields and category-specific 150-word templates (3 tones × 4 categories = 12 variants). Tone pills swap body. Copy-to-clipboard + `mailto:` link.
- **Action Plan** — 4 category templates with personalization tokens (account/device/budget/renewal). Sections: Exec Summary, Recommended Products, Talking Points, Outreach Timeline, ROI range, Objection Handling. `window.print()` with `@media print { body > *:not(.print-root) { display: none } }` plus a portal-rendered print root.
- **Log Call** — form (date, duration, outcome, notes, next action). Saves to `callLogs[accountId][]` in localStorage, surfaces in detail panel's Call History, fires toast.

## Global features

- **Sidebar**: collapsible 64↔220px, NetApp wordmark, 5 nav items, red badge count on Renewal Alerts when any ≤60d.
- **Top bar**: global search (filter-as-you-type dropdown, keyboard nav, ESC), Sync Active IQ button (spins icon 1.5s then toast), avatar initials.
- **Toasts**: sonner (already wired), bottom-right, 3s.
- **Routing**: Each page is its own TanStack route file with its own `head()` metadata. Sidebar uses `<Link>` with `activeProps`.
- **Responsive**: sidebar → bottom tab bar under `md`; grids collapse to 1 col; Sheet goes full-screen on mobile.

## Dependencies

Already present: shadcn/ui (sheet, select, dialog, popover, slider, checkbox), lucide-react, sonner, recharts. Need to add: `framer-motion` (leaderboard reorder + small animations).

## Verification before finishing

1. Run a Node script against `scoring.ts` + `mockAccounts.ts` to confirm 5/6/5/4 distribution, ≥4 urgent renewals, ≥3 competitive-risk accounts.
2. Visit `/`, `/accounts`, `/renewals`, `/leaderboard`, `/settings` in preview; open detail panel; open each modal; drag a weight slider; toggle pipeline stage; verify localStorage persistence on reload.
3. Confirm no raw hex in components — all via tokens.

## Out of scope

No auth, no backend, no Lovable Cloud, no real email sending (mailto only), no real PDF library (uses `window.print()`).
