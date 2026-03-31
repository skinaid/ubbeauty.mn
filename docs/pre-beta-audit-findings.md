# Pre-beta audit findings

Audit date: 2025-03-22. Based on actual codebase inspection.

## Main user flows

1. **Auth**: `/login` → OTP email → `/auth/callback` → redirect to intended page or `/dashboard`
2. **Org setup**: `/setup-organization` → create org → `/dashboard`
3. **Dashboard**: view pages, sync status, AI reports, manual sync, regenerate
4. **Billing**: `/pricing` (checkout) → QPay → webhook → activation; `/billing` (invoices/status)
5. **Meta**: `/pages` → Connect Meta → select pages → sync/analysis
6. **Internal ops**: `/internal/ops` (allowlisted) → overview, orgs, jobs, billing

---

## BLOCKER

### 1. Login `next` param never passed to magic link — **FIXED**

| Field | Detail |
|-------|--------|
| **Files** | `src/modules/auth/actions.ts`, `src/components/auth/login-form.tsx`, `src/app/(public)/login/page.tsx` |
| **Why** | User sees "After sign-in you will continue to: /billing" but magic link always goes to `/auth/callback?next=/dashboard`. User always lands on `/dashboard`, not the intended page. |
| **Fix** | Pass `next` from login page to form (hidden input); use in `emailRedirectTo` in `loginWithOtpAction`. |
| **Confidence** | High |

---

## SHOULD_FIX_BEFORE_BETA

### 2. Auth callback: no error message on session exchange failure

| Field | Detail |
|-------|--------|
| **Files** | `src/app/auth/callback/route.ts` |
| **Why** | When `exchangeCodeForSession` fails (expired/invalid code), redirect to `/login` with no query. User sees generic login form and doesn't know why. |
| **Fix** | Redirect to `/login?error=session_expired` (or similar) and render that in login page. |
| **Confidence** | Medium |

### 3. Pricing page: no nav for logged-in users

| Field | Detail |
|-------|--------|
| **Files** | `src/app/(public)/pricing/page.tsx` |
| **Why** | Pricing uses `(public)` route group; dashboard layout (with nav) only wraps `(dashboard)/*`. Logged-in user on `/pricing` has no header—can only return via "Billing" link in content. |
| **Fix** | Add "Dashboard" or "← Back to app" link for logged-in users when `user && organization`. |
| **Confidence** | Medium |

### 4. `/internal/ops` not in middleware protected paths

| Field | Detail |
|-------|--------|
| **Files** | `src/lib/supabase/middleware.ts` |
| **Why** | Unauthenticated user hitting `/internal/ops` is allowed by middleware, then layout redirects to dashboard → login. Extra round-trip. |
| **Fix** | Add `/internal` to `PROTECTED_PREFIXES`. |
| **Confidence** | Low (cosmetic; security still enforced by layout) |

### 5. Meta connect API: wrong redirect when org not found

| Field | Detail |
|-------|--------|
| **Files** | `src/app/api/meta/connect/route.ts` |
| **Why** | `requireCurrentUserOrganization` throws "Organization not found"; catch redirects to `/login` for all errors. User with session but no org (edge case) would see login instead of `/setup-organization`. |
| **Fix** | In catch, if error message is "Organization not found", redirect to `/setup-organization`; else `/login`. |
| **Confidence** | Low (rare edge case) |

---

## SAFE_TO_DEFER

### 6. No loading skeletons

| Field | Detail |
|-------|--------|
| **Files** | All pages |
| **Why** | Server-rendered pages show nothing until data loads. No explicit loading UI. |
| **Fix** | Add `loading.tsx` where helpful; or accept for pre-beta. |
| **Confidence** | N/A |

### 7. Limited form validation (client-side)

| Field | Detail |
|-------|--------|
| **Files** | Forms (login, create-org, checkout, etc.) |
| **Why** | Most validation is server-side. Email has `type="email"` and `required`; org name has `maxLength`. No regex for email format. |
| **Fix** | Add Zod or similar if needed; server already validates. |
| **Confidence** | N/A |

### 8. Responsive layout

| Field | Detail |
|-------|--------|
| **Files** | All components |
| **Why** | Inline styles, no mobile breakpoints. Works on desktop. |
| **Fix** | Add responsive utilities if mobile is pre-beta target. |
| **Confidence** | N/A |

### 9. `/settings` in middleware but no route

| Field | Detail |
|-------|--------|
| **Files** | `src/lib/supabase/middleware.ts` |
| **Why** | `PROTECTED_PREFIXES` includes `/settings` but no `/settings` page exists. Harmless. |
| **Fix** | Remove when confirmed unused, or add stub page. |
| **Confidence** | N/A |

---

## Verified as OK

- **Auth/session**: Middleware refreshes session; `getCurrentUser` used in layouts/pages. OTP flow correct (after next-param fix).
- **Org ownership**: RPCs `bootstrap_organization_subscription`, `set_meta_page_selected`, etc. use `is_org_owner()`. Server actions validate org where needed.
- **Service role**: Only in server modules; never in client bundles.
- **Billing actions**: `startPaidPlanCheckoutAction` validates org ownership before checkout.
- **Sync/analysis retry**: `retrySyncJobAction` validates job belongs to user's org.
- **Error display**: Forms show `state.error`; billing/page errors surfaced. OperationalHealthBanner shows failed sync/analysis.
- **Empty states**: Dashboard, billing, pages show "No X yet" messages.
