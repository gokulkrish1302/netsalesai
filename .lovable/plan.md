# First-Login Walkthrough

A spotlight-style product tour that runs once when a sales rep logs in for the first time, then never auto-shows again (replayable from a small Help button in the top bar).

## What the user sees

1. Welcome modal: "Welcome to NetApp Sales Intelligence, [First name]" with a short intro and **Start tour** / **Skip** buttons.
2. A series of steps that dim the rest of the screen and highlight one element with a tooltip card (title, 1–2 sentence explanation, **Back / Next / Skip tour** controls, step counter like `3 / 12`).
3. Final step: "You're all set" confirmation, marks onboarding complete in the database.

## Tour steps (in order)

**Sidebar (navigate-and-explain — the tour highlights each nav item without leaving the dashboard):**
1. Dashboard — your daily command center.
2. Accounts — full portfolio, filterable swimlanes.
3. Leaderboard — rep rankings and team performance.
4. Action Plans — AI-suggested next steps per account.
5. Renewals — accounts with contracts expiring soon.
6. Imports — bring in accounts via CSV or Active IQ sync.
7. Settings — team, integrations, preferences.

**Dashboard widgets (on `/`):**
8. Morning Briefing — AI summary of what changed since last login.
9. Stat strip — portfolio KPIs at a glance.
10. Priority Matrix — accounts plotted by score vs urgency.
11. Renewal Radar — upcoming contract renewals.

**Account interaction:**
12. Ranked Accounts list — click any row to open the side detail panel (the tour opens it automatically to demonstrate).
13. Account Detail Panel — telemetry, risks, contacts.
14. Action Plan button — opens the AI-built plan with talking points and recommended outreach.

**Wrap-up:**
15. "Tour complete" card, with a note that the Help (?) button in the top bar replays it anytime.

## Technical design

**Library:** `driver.js` (lightweight, ~5kb, no React coupling, works by CSS selector). Avoids building custom spotlight/positioning logic.

**Completion tracking:**
- New column `onboarded_at timestamptz` on `public.reps` (migration, with proper GRANTs preserved).
- Server function `markOnboarded` (in `src/lib/onboarding.functions.ts`, uses `requireSupabaseAuth`) sets `onboarded_at = now()` for the current rep.
- `AuthContext` already loads the rep row; expose `rep.onboardedAt` so the client knows whether to auto-start.

**Trigger logic:**
- New `OnboardingTour` component mounted inside the root layout (after `RouteGate`).
- On mount, if `rep && !rep.onboardedAt && pathname === "/"`, start the tour.
- If the user lands on `/auth` or another page first, defer until they reach `/`.
- Calling `Skip` or completing the final step → calls `markOnboarded` and clears local state.

**Target selectors:**
- Add stable `data-tour="..."` attributes to the existing elements (sidebar links, MorningBriefing card, StatStrip, PriorityMatrix, RenewalRadar, RankedAccountsList first row, AccountDetailPanel, Action Plan button). No visual/style changes.
- Tour step 12 programmatically clicks the first ranked account to open the detail panel before highlighting it.

**Manual replay:**
- Small `HelpCircle` icon button in `TopBar` (next to Sync). Clicking starts the tour regardless of `onboarded_at`.

**Styling:** Override `driver.js` popover CSS to match the app's design tokens (rounded-xl, `--primary`, app font). No new colors introduced.

## Files

- New: `src/lib/onboarding.functions.ts`, `src/components/onboarding/OnboardingTour.tsx`, `src/components/onboarding/tourSteps.ts`, migration adding `reps.onboarded_at`.
- Edited: `src/routes/__root.tsx` (mount `OnboardingTour`), `src/state/AuthContext.tsx` (surface `onboardedAt`), `src/components/layout/Sidebar.tsx` + `TopBar.tsx` + dashboard widget files + `AccountDetailPanel.tsx` + `ActionPlanModal.tsx` trigger (add `data-tour` attributes only), `src/styles.css` (driver.js theme overrides), `package.json` (`driver.js`).

## Out of scope

- No changes to existing styling or color scheme.
- No analytics events for tour progress.
- No per-step gating or required interactions — user can skip at any time.
