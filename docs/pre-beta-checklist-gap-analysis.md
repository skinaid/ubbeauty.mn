# Pre-beta checklist gap analysis

Based on `docs/manual-smoke-test-checklist.md` and codebase inspection.

---

## BLOCKER

### 1. Auth callback: open redirect via `next` param

| Field | Detail |
|-------|--------|
| **Affected flow** | 1.5, 1.6 — auth callback redirect after successful session exchange |
| **Files** | `src/app/auth/callback/route.ts` |
| **Why** | `next` is read from request URL and used in `new URL(next, request.url)` without validation. A crafted link (e.g. phishing) could redirect users to an external site after auth. |
| **Fix** | Validate `next` is a relative path: `startsWith("/")` and `!startsWith("//")`. Fallback to `/dashboard` if invalid. |
| **Confidence** | High |

---

## SHOULD_FIX_BEFORE_BETA

### 2. Auth callback: no code — no error feedback

| Field | Detail |
|-------|--------|
| **Affected flow** | 1.7 (adjacent) — user lands on `/auth/callback` without `code` |
| **Files** | `src/app/auth/callback/route.ts` |
| **Why** | Redirect to `/login` with empty search; user gets no explanation (e.g. broken email link). |
| **Fix** | Redirect to `/login?error=missing_code` so login page can show a message. |
| **Confidence** | Medium |

### 3. Meta connect: "Organization not found" → wrong redirect

| Field | Detail |
|-------|--------|
| **Affected flow** | 3c.2 — Connect Meta Account when user has no org |
| **Files** | `src/app/api/meta/connect/route.ts` |
| **Why** | `requireCurrentUserOrganization` throws "Organization not found"; catch redirects to `/login`. User with session but no org should go to `/setup-organization`. |
| **Fix** | On catch, if error message is "Organization not found", redirect to `/setup-organization`; else `/login`. |
| **Confidence** | Medium (edge case; pages page redirects before Connect, but direct API hit possible) |

---

## SAFE_TO_DEFER

### 4. Pricing: empty plans

| Field | Detail |
|-------|--------|
| **Affected flow** | 3e.1 |
| **Files** | `src/app/(public)/pricing/page.tsx` |
| **Why** | If `getPublicActivePlans` returns `[]`, pricing shows header but no plan cards. Assumption: plans seeded for beta. |
| **Fix** | Add "No plans configured" empty state if `plans.length === 0`. |
| **Confidence** | Low |

### 5. Auth callback: env vars missing

| Field | Detail |
|-------|--------|
| **Affected flow** | 1.5 |
| **Files** | `src/app/auth/callback/route.ts` |
| **Why** | When `NEXT_PUBLIC_SUPABASE_URL` or `anonKey` missing, redirect to `/login` with no error. |
| **Fix** | Add `?error=config` or similar. |
| **Confidence** | Low (deploy-time failure) |

### 6. Mobile / responsive

| Field | Detail |
|-------|--------|
| **Affected flow** | 6.1–6.4 |
| **Files** | All pages |
| **Why** | No explicit breakpoints; relies on defaults. Checklist expects basic usability at 375px. |
| **Fix** | Add viewport meta, test at 375px; add `flexWrap` where needed (some already present). |
| **Confidence** | Low |

### 7. Internal ops / error boundaries

| Field | Detail |
|-------|--------|
| **Affected flow** | 2.7 |
| **Files** | Internal ops pages |
| **Why** | Unhandled DB/network errors surface as Next.js error page. |
| **Fix** | Add error boundaries or try/catch where appropriate. |
| **Confidence** | Low |
