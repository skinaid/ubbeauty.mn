# Manual smoke test checklist

Based on current MarTech MVP codebase. Run in order for first-time setup, or pick sections for regression.

**Prereqs:** Supabase project with migrations + plans seeded; Meta app (for Meta tests); QPay sandbox (for billing tests). Env vars set per README.

---

## 1. Sign in / session

| # | Step | Expected |
|---|------|----------|
| 1.1 | Visit `/` while logged out | Redirect to `/login` |
| 1.2 | Visit `/dashboard` while logged out | Redirect to `/login?next=/dashboard` |
| 1.3 | Enter valid email on login form, submit | "Check your email for the login link." |
| 1.4 | Enter empty or invalid email | "Email is required." or browser validation |
| 1.5 | Click magic link in email | Redirect to `/auth/callback`, then `/dashboard` (or `next` target) |
| 1.6 | Visit `/login?next=/billing`, complete magic link | Land on `/billing` after auth |
| 1.7 | Visit `/auth/callback?code=invalid&next=/billing` | Redirect to `/login?error=invalid_link&next=/billing`; see "The login link has expired or is invalid." |
| 1.8 | Click Sign out | Redirect to `/login`; session cleared |
| 1.9 | Visit `/dashboard` after sign out | Redirect to `/login?next=/dashboard` |

---

## 2. Navigation

| # | Step | Expected |
|---|------|----------|
| 2.1 | Logged in: header shows Dashboard, Billing, Pricing, Sign out | All links visible; Sign out works |
| 2.2 | Logged in (allowlisted email): header shows Internal ops | Link to `/internal/ops` in purple |
| 2.3 | Logged in: visit `/pricing` | See "← Dashboard" and "Billing" at top; links work |
| 2.4 | Logged out: visit `/pricing` | No dashboard nav; "Sign in" link in content |
| 2.5 | From dashboard: click Meta pages link | Go to `/pages` |
| 2.6 | From billing: click "← Back to pricing" | Go to `/pricing` |
| 2.7 | Internal ops: Overview → Organizations → Jobs → Billing → Dashboard | All sub-pages load; "← App dashboard" returns to `/dashboard` |
| 2.8 | Logged out: visit `/internal/ops` | Redirect to `/login?next=/internal/ops` (middleware) |

---

## 3. Core workflow

### 3a. Org setup (new user)

| # | Step | Expected |
|---|------|----------|
| 3a.1 | New user: complete magic link | Redirect to `/setup-organization` (no org yet) |
| 3a.2 | Enter org name, submit | "Creating..."; redirect to `/dashboard` |
| 3a.3 | Submit empty org name | "Organization name is required." |
| 3a.4 | User with org: visit `/setup-organization` | Redirect to `/dashboard` |

### 3b. Dashboard (post-setup)

| # | Step | Expected |
|---|------|----------|
| 3b.1 | Dashboard loads | Org name, subscription status, Meta pages link shown |
| 3b.2 | No pages selected | "No pages selected. Connect Meta and select pages on /pages." |
| 3b.3 | With selected pages | Page cards with sync status, metrics, Manual sync, Regenerate AI buttons |

### 3c. Meta connection & pages

| # | Step | Expected |
|---|------|----------|
| 3c.1 | Visit `/pages`, no Meta connection | "Connect Meta Account" link |
| 3c.2 | Click "Connect Meta Account" | Redirect to Meta OAuth; then back to `/pages` |
| 3c.3 | After successful Meta connect | `/pages?meta=success`; "Meta account connected successfully."; pages listed |
| 3c.4 | After Meta connect error | `/pages?meta=error&reason=...`; red error message |
| 3c.5 | Click Select on a page | Button shows "Deselect"; page becomes selected |
| 3c.6 | Click Deselect | Button shows "Select"; page deselected |
| 3c.7 | Hit plan page limit, try Select | Select disabled; "Page limit reached" message |

### 3d. Sync & AI

| # | Step | Expected |
|---|------|----------|
| 3d.1 | Select a page (triggers initial sync) | Sync job runs; status appears on dashboard |
| 3d.2 | Manual sync: click "Manual sync (PageName)" | "Syncing..."; then "Sync completed." or error |
| 3d.3 | Regenerate AI: click "Regenerate AI (no sync)" | "Regenerating..."; then success or error |
| 3d.4 | Exhaust manual sync quota | Button disabled; "Manual sync quota: X/Y today" |
| 3d.5 | Exhaust AI report quota | "AI report quota: X/Y this month" warning; Regenerate disabled |

### 3e. Billing (QPay)

| # | Step | Expected |
|---|------|----------|
| 3e.1 | Visit `/pricing` logged in with org | Current subscription; plan cards with Pay with QPay where applicable |
| 3e.2 | Click "Pay with QPay — Starter" (bootstrap) | Invoice created; QR / bank links / deeplinks shown |
| 3e.3 | Complete payment (sandbox) | Webhook fires; invoice → paid; subscription → active |
| 3e.4 | Visit `/billing` | Invoices, payment transactions, billing events listed |
| 3e.5 | Pending invoice | Status "pending"; verification attempt count if retried |

---

## 4. Create / Edit / Delete

| # | Step | Expected |
|---|------|----------|
| 4.1 | **Create org** (setup-organization form) | Org + owner membership + starter subscription created |
| 4.2 | **Create invoice** (Pay with QPay on pricing) | Invoice row; QPay request; checkout UI |
| 4.3 | **Edit page selection** (Select/Deselect on /pages) | `is_selected` toggled; dashboard updates |
| 4.4 | **Edit plan** (Select plan on pricing for free plan) | Subscription plan updated |
| 4.5 | **No delete flows** in product UI | Org, pages, subscriptions not deletable by user |

---

## 5. Error handling

| # | Step | Expected |
|---|------|----------|
| 5.1 | Login: invalid/expired magic link | Redirect to `/login?error=invalid_link`; error message shown |
| 5.2 | Org create: RPC error (e.g. slug collision) | Red error under form |
| 5.3 | Manual sync: page not found / token expired | "Sync failed." or specific error |
| 5.4 | Regenerate AI: quota exceeded | Error message; quota shown |
| 5.5 | Checkout: QPay error | "Checkout failed." or provider error |
| 5.6 | OperationalHealthBanner: failed sync/analysis | Red alert with job id, error snippet; retry guidance |
| 5.7 | Billing: invoice with `provider_last_error` | Error shown under invoice row |
| 5.8 | Retry sync (failed job): click Retry | "Retrying..."; job re-runs; success or error |

---

## 6. Mobile / responsive sanity

| # | Step | Expected |
|---|------|----------|
| 6.1 | View login page at 375px width | Form usable; no horizontal scroll |
| 6.2 | View dashboard at 375px | Content wraps; cards stack; links tappable |
| 6.3 | View pricing at 375px | Plan cards readable; buttons accessible |
| 6.4 | Header nav at 375px | Links wrap or remain usable |

---

## 7. Browser sanity

| # | Step | Expected |
|---|------|----------|
| 7.1 | Chrome: full login → dashboard flow | Works; no console errors |
| 7.2 | Firefox: same flow | Works |
| 7.3 | Safari: same flow | Works (cookies, redirects) |
| 7.4 | Incognito/private: magic link | Session created; redirect works |
| 7.5 | Disable JS: visit protected page | Server redirect to login works (middleware) |

---

## Quick regression (subset)

Run when doing small fixes:

- 1.1, 1.5, 1.8 — auth
- 2.1, 2.3, 2.7 — nav
- 3b.1 — dashboard
- 3c.5, 3c.6 — page selection
- 5.1 — auth error
- 5.8 — retry sync
