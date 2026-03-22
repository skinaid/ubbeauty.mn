# System admin bootstrap (`system_admins`)

## Schema (single source of truth)

Apply database changes **only** via the migration file:

`supabase/migrations/202603220012_system_admins.sql`

Use Supabase CLI (`supabase db push` / linked project) or paste that file’s contents into the SQL editor once — do not maintain a duplicate SQL snippet elsewhere.

## Runtime behavior

1. **Gate** (`requireSystemAdmin`): Loads the current user’s row from `system_admins`. If missing, calls `maybeBootstrapSystemAdmin` once per request path.

2. **Bootstrap** runs only when:
   - `COUNT(*)` on `system_admins` is **exactly zero**, and  
   - the user’s email is in `MARTECH_INTERNAL_OPS_EMAILS`.

3. **After the first row exists**, bootstrap never inserts again. New allowlisted users are **not** auto-added. They need a row in `system_admins` (manual insert or future tooling). The env var does **not** silently elevate anyone once the table is initialized.

4. **Concurrent requests (same user)**: Two parallel `/admin` loads can race on `INSERT`; on unique violation the code **re-fetches** by `user_id` so access still succeeds.

5. **Concurrent requests (different users, both allowlisted, empty table)**: Both may observe `COUNT = 0` and both may insert — rare, typically yields 2+ initial `super_admin` rows. Tightening this would require a DB-side lock/RPC (not in V1).

## Audit

Successful bootstrap writes `operator_audit_events` with `action_type = system_admin_bootstrap` (best-effort; failure does not block access).

## Remaining risks (Phase A)

| Risk | Mitigation / note |
|------|-------------------|
| Env var typo / empty allowlist | No bootstrap; admins must be created in DB. |
| Only “first wave” while table empty | Second allowlisted user is not auto-seeded after first row; document for operators. |
| Rare multi-row race on empty table | Acceptable for small teams; review `system_admins` after first deploy if needed. |
| `requireInternalOpsActor` (legacy `/internal/ops`) | Still env-only; does not read `system_admins`. Intentional during migration. |
