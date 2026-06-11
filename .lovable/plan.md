## Goal

Make Excel imports permanent in Supabase, remove all mock data, and show a friendly empty state for new reps.

## 1. Persist Excel imports to Supabase

When the rep clicks **Populate** in `InlineImporter` (and `ImportAccountsModal`), upsert each selected account into `public.accounts` with `rep_email = current rep`.

Mapping `Account` → `accounts` columns:
- `account_name`, `industry`, `region`, `device_age`, `storage_utilization` (= utilizationPct), `it_budget` (= itBudgetUSD), `renewal_days` (= contractRenewalDays), `cloud_status`, `data_source = 'excel_import'`, `last_synced_at = now()`, `netapp_models`, `ontap_version`, `cluster_count`, `storage_architecture`, `score`, `priority_badge`, `status` (= pipelineStage).
- `customer_id = 'excel:' + sha1(filename + accountName)` so re-importing the same row updates instead of duplicating (uses existing `accounts_rep_customer_uniq` index).
- New column `import_filename text` on `accounts` so the ImportHistory list can group/delete by file.

Implementation:
- Migration: `ALTER TABLE public.accounts ADD COLUMN import_filename text;` (no new table needed).
- New file `src/lib/imports.functions.ts` with two server functions guarded by `requireSupabaseAuth`:
  - `saveImportedAccounts({ filename, accounts })` → upsert rows for the caller's rep_email (resolved via `current_rep_email()` SELECT or by passing the email from context).
  - `deleteImportedFile({ filename })` → delete all accounts where `rep_email = me AND import_filename = filename`.
- `InlineImporter.populate()` and `ImportAccountsModal` call `saveImportedAccounts`; on success they trigger a DbSync refresh (see §3) instead of `addImportedAccounts`.
- `ImportHistory` (currently driven by localStorage `state.importHistory`) now derives its list from the loaded DB accounts: group `scoredAccounts` by `import_filename` (only rows whose `dataSource === 'excel_import'`). The Trash button calls `deleteImportedFile`.

## 2. Remove all hardcoded mock data

In `src/state/AppStore.tsx`:
- Delete the `import { MOCK_ACCOUNTS } from "@/lib/mockAccounts"` and stop merging it into `accountsWithStages`. Accounts come only from `state.importedAccounts` (which DbSync hydrates from Supabase).
- Remove `importedAccounts` and `importHistory` from the localStorage snapshot — accounts are server-owned now. Keep weights / notes / call logs / action plans / deprioritized in localStorage as today (they're UI state, not the user's concern).
- Keep `mockAccounts.ts` file untouched on disk but unreferenced (safer than mass-deleting; can prune later).

## 3. DbSync becomes the single source of truth

Rewrite `src/state/DbSync.tsx` so it:
- On rep change, fetches `accounts` for the current rep (or all, for admins), maps with `rowToAccount`, and **replaces** the in-memory list via a new `setAccounts(accounts: Account[])` action (replacing the current additive `addImportedAccounts`).
- Subscribes to a `netapp:accounts-changed` window event dispatched after import / delete / Active IQ sync, and re-fetches.
- Updated `rowToAccount` reads the real `industry`, `region`, and `import_filename` columns instead of hardcoding `"Tech"` / `"West"`.

AppStore gains a `SET_ACCOUNTS` action + `setAccounts` callback used only by DbSync.

## 4. Empty state

In `src/routes/index.tsx` and `src/routes/accounts.tsx`, when `scoredAccounts.length === 0`, render a single centered card instead of the widgets / board:

> **Welcome to NetApp Cloud Compass.** Import your accounts via Excel or sync with Active IQ to get started.

Card includes two buttons: **Import Excel** (opens import modal) and **Go to Imports** (navigates to `/imports`). The dashboard heading + MorningBriefing still render above it.

## Out of scope

- No changes to scoring, Active IQ sync logic, or styling/colors.
- Action plans, notes, call logs stay in localStorage (UI scratch state, not the user's account data).
- No bulk migration of existing localStorage imports — once this ships, reps re-import from Excel; their old in-browser data is replaced by what's in Supabase.

## Files

- **Migration:** add `import_filename` column to `accounts`.
- **New:** `src/lib/imports.functions.ts`.
- **Edited:** `src/state/AppStore.tsx`, `src/state/DbSync.tsx`, `src/components/imports/InlineImporter.tsx`, `src/components/modals/ImportAccountsModal.tsx`, `src/components/accounts/ImportHistory.tsx`, `src/routes/index.tsx`, `src/routes/accounts.tsx`.
