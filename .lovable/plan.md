# Clear All Account Data

Add a destructive action in **Settings** that wipes the signed-in rep's accounts and all data derived from them.

## Scope of deletion (rep-scoped, via `auth.uid()`)

- `accounts` — all rows owned by the rep
- `account_action_plans` — cached AI plans for those accounts
- `activity` — call/email/outcome logs tied to those accounts
- `sync_runs` — the rep's import/sync history

Preserved: scoring weights, dashboards, team membership, auth, role.

## Server function

New `src/lib/settings.functions.ts`:

- `clearMyAccountData` — `createServerFn({ method: "POST" })` with `requireSupabaseAuth`.
  - Uses the request-scoped `supabase` client (RLS enforces rep ownership — no admin client needed).
  - Deletes in order: `account_action_plans` → `activity` → `accounts` → `sync_runs`, each filtered by `rep_id = context.userId` (or via account FK where applicable).
  - Returns `{ deletedAccounts, deletedPlans, deletedActivity, deletedSyncRuns }`.

## UI

New accordion section in `src/routes/settings.tsx` (below Team management, admin or not):

- Section header: "Danger zone" with `Trash2` icon, destructive tint.
- Body: short warning copy + red `Button variant="destructive"` labeled **Clear all my account data**.
- On click → shadcn `AlertDialog` (single confirm) listing what will be deleted, Cancel / Delete buttons.
- On confirm:
  - Call server fn via `useServerFn`.
  - Toast success with counts, or toast error.
  - Trigger a local refresh of `AppStore` accounts (re-fetch or `router.invalidate()`) so the UI empties immediately.

## Files

- create `src/lib/settings.functions.ts`
- edit `src/routes/settings.tsx` (add Danger Zone accordion item + dialog)

No schema changes, no new tables, no migration needed.
