## Goal

Stop hardcoding the action plan in `src/lib/actionPlans.ts`. Generate the full plan (executive summary, recommended products, talking points, outreach timeline, ROI copy, industry objections) with Lovable AI per account, cache the result in Supabase, and let the rep regenerate on demand.

## 1. Database — cache table

New table `public.account_action_plans` (one row per account, owned by the rep):

- `account_id uuid` (FK → `accounts.id`, on delete cascade) — primary key
- `rep_email text not null`
- `plan jsonb not null` — full `ActionPlan` shape (summary, products[], talkingPoints[], timeline[], roiLow/High/Pct, objections[])
- `model text not null` — e.g. `google/gemini-3-flash-preview`
- `inputs_hash text not null` — sha1 of the account fields fed to the model, so we can detect when an account has changed
- `created_at`, `updated_at` (with the existing `update_updated_at_column` trigger)

RLS: a rep can select/insert/update/delete only rows where `rep_email = current_rep_email()`. Service role full access. GRANTs to `authenticated` + `service_role`.

## 2. Server functions — `src/lib/actionPlan.functions.ts`

Both guarded by `requireSupabaseAuth` and the rep is resolved via `current_rep_email()`.

- `getOrGenerateActionPlan({ accountId })`
  1. Load the account row, verify it belongs to the caller.
  2. Compute `inputs_hash` from the scoring-relevant fields (name, industry, region, device model/age, utilization, IT budget, renewal days, category, score, cloud status, ontap/version, models).
  3. Look up the cached row. If it exists **and** `inputs_hash` matches, return `plan` immediately.
  4. Otherwise call Lovable AI Gateway via the existing `src/lib/ai-gateway.server.ts` helper using `google/gemini-3-flash-preview` with `Output.object({ schema })` (Zod) so we get a typed JSON `ActionPlan` back. System prompt = "You are a NetApp enterprise storage sales strategist…". User prompt = a compact account brief built from the row.
  5. Upsert into `account_action_plans` and return the new plan.
  - On gateway 402 / 429 / failure: surface a clear error string; the UI falls back to a "Regenerate" prompt (no silent hardcoded fallback).

- `regenerateActionPlan({ accountId })` — same as above but skips the cache hit and always calls the model.

The Zod schema mirrors the existing `ActionPlan` interface so the rest of the UI stays unchanged.

## 3. UI wiring

- `src/lib/actionPlans.ts`
  - Delete `buildActionPlan`, `buildIndustryObjections`, `INDUSTRY_OBJECTIONS`, the per-category hardcoded blocks, and `buildUrgencyTimeline`'s fixed action strings.
  - Keep `URGENCY_LABEL`, `estimateDealSize`, `suggestNextStep`, the `ActionPlan` type, and the `buildAccountSummary` helper signature (still useful as a fallback skeleton when a plan hasn't been generated yet, e.g. shows just numeric facts).
  - Add a tiny `emptyPlan()` placeholder used only while loading.

- `src/components/modals/ActionPlanModal.tsx`
  - On open, call `getOrGenerateActionPlan` via `useServerFn` + `useQuery` keyed by `accountId`.
  - States: loading (skeleton), error (message + Retry), success (renders `plan` exactly as today).
  - Add a "Regenerate" button next to Copy/Print that calls `regenerateActionPlan` and invalidates the query.

- `src/routes/action-plans.$accountId.tsx`
  - Same `useQuery` for the plan; the Playbook tab (talking points / objections / timeline) reads from the AI plan instead of `buildActionPlan(...)` / `buildIndustryObjections(...)` / `buildUrgencyTimeline(...)`.
  - The Overview tab keeps `buildAccountSummary` + `estimateDealSize` as deterministic numeric facts, but also shows the AI executive summary above them.
  - Loading skeleton inside each section; error block with Retry.

## 4. Out of scope

- No changes to scoring, urgency selection, deal-size math, suggestNextStep heuristics, stakeholders/files/activity tabs, or styling.
- No background pre-generation — plans are generated on first open per account, then cached until the account's inputs change.

## Files

- **Migration:** create `public.account_action_plans` + RLS + grants.
- **New:** `src/lib/actionPlan.functions.ts` (server functions + Zod schema + prompt builder).
- **Edited:** `src/lib/actionPlans.ts` (strip hardcoded content, keep helpers), `src/components/modals/ActionPlanModal.tsx`, `src/routes/action-plans.$accountId.tsx`.

## Cost / behaviour notes

- Model: `google/gemini-3-flash-preview` (fast, low credit usage).
- ~1 generation per account per meaningful change, served from cache otherwise. Rep can force a refresh with the Regenerate button.
- Failures surface as in-UI errors (no silent fallback to the old hardcoded templates, so the user always knows when AI is unavailable).
