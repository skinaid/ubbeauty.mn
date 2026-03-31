# Pre-beta flow audit: core business journey

Audit date: 2025-03-22. Traced from codebase.

## Flow summary

1. **Org setup** — `/setup-organization` → CreateOrganizationForm → `create_organization_with_starter` RPC
2. **Dashboard entry** — `/` or `/dashboard` → redirects by org; dashboard renders org, subscription, pages, entitlements
3. **Meta connect/select** — `/pages` → Connect → `/api/meta/connect` → Meta OAuth → callback → discovery; Select/Deselect → `set_meta_page_selected` RPC
4. **Sync / AI** — Page select triggers `initial_sync`; Manual sync / Regenerate AI use server actions + execute
5. **QPay checkout** — `/pricing` → StartPaidCheckoutForm → `createPaidPlanCheckout` → webhook → verification

---

## BLOCKER

### 1. Meta connect: all non-org errors redirect to `/login` with no feedback

| Field | Detail |
|-------|--------|
| **Affected flow** | 3. Meta connect |
| **Files** | `src/app/api/meta/connect/route.ts` |
| **Why** | When `createMetaOAuthUrl` throws (e.g. `getMetaEnv()` — missing `META_APP_ID`), catch redirects to `/login`. User is logged in → middleware sends them to `/dashboard`. Connect fails silently; no error shown. |
| **Fix** | On non-`OrgNotFoundError` errors, redirect to `/pages?meta=error&reason=connection_failed` so the error appears on the pages page. |
| **Confidence** | High |

---

## SHOULD_FIX_BEFORE_BETA

### 2. Pricing: empty plans — no feedback

| Field | Detail |
|-------|--------|
| **Affected flow** | 5. QPay checkout |
| **Files** | `src/app/(public)/pricing/page.tsx` |
| **Why** | If `getPublicActivePlans()` returns `[]` (seed not run), no plan cards; user sees no explanation. |
| **Fix** | Add `plans.length === 0` check; show "No plans configured. Contact support." |
| **Confidence** | Medium |

### 3. Org create: slug from non-ASCII-only name can be empty

| Field | Detail |
|-------|--------|
| **Affected flow** | 1. Org setup |
| **Files** | `src/modules/organizations/actions.ts` |
| **Why** | `toSlug` strips non-ASCII; name like "北京" yields `slug = ""`, rejected with "Please provide a valid organization name." Correct but unclear. |
| **Fix** | SAFE_TO_DEFER — current message is acceptable. |
| **Confidence** | Low |

---

## SAFE_TO_DEFER

### 4. Dashboard when subscription is null

| Field | Detail |
|-------|--------|
| **Affected flow** | 2. Dashboard |
| **Why** | Uses `subscription?.plan.name`; shows "Not configured". Entitlements return no access. Acceptable. |
| **Confidence** | N/A |

### 5. Sync/AI execute errors

| Field | Detail |
|-------|--------|
| **Affected flow** | 4. Sync / AI |
| **Why** | Actions catch and return error; forms display. |
| **Confidence** | N/A |

### 6. QPay not configured

| Field | Detail |
|-------|--------|
| **Affected flow** | 5. QPay checkout |
| **Why** | `createPaidPlanCheckout` throws; action returns `{ error: e.message }`. User sees message. |
| **Confidence** | N/A |
