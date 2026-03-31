# System admin authorization (V1)

Single reference for how **`/admin/*`**, **`/internal/ops/*`**, **`MARTECH_INTERNAL_OPS_EMAILS`**, and **`system_admins`** interact in the shipped V1 control plane.

## Sources of truth

| Mechanism | Role |
|-----------|------|
| **`system_admins` (Postgres)** | Primary source for **who** is a system admin, **role** (`viewer` / `operator` / `super_admin`), and **status**. |
| **`MARTECH_INTERNAL_OPS_EMAILS`** | Comma-separated env allowlist. Used for **bootstrap** (empty table), **legacy internal ops pages** without a DB row, and **break-glass mutation** authority when the email matches (see below). |

## Route gates (read / browse)

| Surface | Guard | Who gets in |
|---------|--------|-------------|
| **`/admin/*`** | `requireSystemAdmin(minRole)` | Active row in `system_admins` with sufficient role, **or** one-time **bootstrap** (table empty + email in env allowlist). Does **not** grant access on env allowlist alone once the table has rows and the user has no row. |
| **`/internal/ops/*`** (transitional) | `requireInternalOpsActor()` | Env allowlist **or** any active `system_admins` row. Allowlisted users **without** a row may still use these pages. |

Unauthenticated users are redirected to **`/login`** for both (aligned as of stabilization).

## Mutations (operator actions)

Server actions (invoice re-verify, sync retry, analysis retry) use **`requireOperatorMutationActor()`**:

| Condition | Mutations allowed? |
|-----------|-------------------|
| Email in **`MARTECH_INTERNAL_OPS_EMAILS`** | **Yes** (full operator-equivalent; legacy / break-glass). |
| Active **`system_admins`** row with role **`operator`** or **`super_admin`** | **Yes**. |
| Active **`system_admins`** row with role **`viewer`** | **No** — redirect to `/admin?error=insufficient_permissions`. |

**Implication:** Mutation authority can still come from the env allowlist **without** a `system_admins` row. For long-term consistency, prefer adding operators to **`system_admins`** with the right role and tightening env usage to bootstrap/emergency only (cleanup, not required for V1 correctness).

## Dashboard “System admin” link

Shown when `isInternalOpsEmail(email) || hasActiveSystemAdminRecord(userId)` — approximates “might use ops tools”; exact access still depends on the route guard above.

## Audit

Operator actions record **`actor_email`** (normalized to lowercase from guards). Action type strings live in `operator_audit_events.action_type` (e.g. `invoice_payment_reverification`, `sync_job_retry`, `system_admin_bootstrap`). Naming is **descriptive snake_case**; no separate enum in app code in V1.

## Technical debt (accepted for V1)

- **`/internal/ops/*`** remains alongside **`/admin/*`** with overlapping data; canonical operator UX is **`/admin`**. Exact `/internal/ops` overview redirects to `/admin` (see `next.config.ts`).
- **Env allowlist** duplicates **DB** for some users — intentional until all operators are modeled in `system_admins`.
- **`requireInternalOpsActor`** is broader than **`requireSystemAdmin`** for **page** access (env without DB).

## Related docs

- Bootstrap and schema: `docs/admin-bootstrap.md`
- Idempotency / operator flows: `docs/operations/idempotency-checklist.md`
