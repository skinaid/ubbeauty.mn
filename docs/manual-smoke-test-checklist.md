# Manual smoke test checklist

Clinic OS oriented smoke checklist for UbBeauty.

## Prereqs

- Supabase project with all migrations applied
- plans seeded
- environment variables configured
- QPay sandbox credentials configured if billing paths are being tested
- demo clinic seed applied for localhost/browser smoke

## Automated browser smoke

- `npm run smoke:browser`
- uses localhost-only dev bootstrap to verify owner, front desk, provider, and billing flows
- configurable owner login email via `CLINIC_SMOKE_EMAIL`
- checks role-specific sidebar visibility and each role's primary focus page
- on `main` push, GitHub Actions `Clinic Browser Smoke` is treated as a required release gate

## 1. Authentication and workspace bootstrap

| # | Step | Expected |
|---|------|----------|
| 1.1 | Visit `/` while logged out | Public homepage loads |
| 1.2 | Visit `/dashboard` while logged out | Redirect to `/login?next=/dashboard` |
| 1.3 | Complete email OTP login | Redirect to intended page |
| 1.4 | New user completes org setup | Redirect to `/dashboard` |
| 1.5 | Existing user visits `/setup-organization` | Redirect to `/dashboard` |

## 2. Public discovery funnel

| # | Step | Expected |
|---|------|----------|
| 2.1 | Visit `/` | Consumer-first homepage loads |
| 2.2 | Visit `/clinics` | Clinic directory loads |
| 2.3 | Open a clinic detail page | Service, provider, and location context visible |
| 2.4 | Open `/book/[slug]` | Booking page loads with service-first form |
| 2.5 | Select a service | Suggested slot area updates |
| 2.6 | Submit valid booking request | Success message shown; appointment created |

## 3. Clinic setup

| # | Step | Expected |
|---|------|----------|
| 3.1 | Visit `/clinic` | Setup screen loads |
| 3.2 | Add a location | Location appears in list |
| 3.3 | Add a staff member | Staff appears in list |
| 3.4 | Add a service | Service appears in list |
| 3.5 | Add an availability rule | Rule appears in list |

## 4. Appointment operations

| # | Step | Expected |
|---|------|----------|
| 4.1 | Visit `/schedule` | Appointment workspace loads |
| 4.2 | Create admin appointment | Appointment appears in upcoming list |
| 4.3 | Change appointment status | Status transitions correctly |
| 4.4 | Public booking request appears in workspace | Appointment is visible to front desk |
| 4.5 | Completed appointment shows checkout handoff | Handoff path becomes available |

## 5. Patient CRM

| # | Step | Expected |
|---|------|----------|
| 5.1 | Visit `/patients` | Patient list loads |
| 5.2 | Open patient detail | Appointments, treatments, and checkouts are shown together |
| 5.3 | Booking request creates or updates patient | Timeline reflects new activity |

## 6. Treatment workflow

| # | Step | Expected |
|---|------|----------|
| 6.1 | Visit `/treatments` | Treatment queue loads |
| 6.2 | Complete a treatment record | Record appears in recent records |
| 6.3 | Create checkout draft from treatment handoff | Draft becomes visible in billing |

## 7. Billing and POS foundation

| # | Step | Expected |
|---|------|----------|
| 7.1 | Visit `/billing` | Subscription and clinic billing sections load |
| 7.2 | Capture clinic checkout payment | Payment updates checkout state |
| 7.3 | Refund a checkout | Refund ledger entry appears |
| 7.4 | Void a checkout | Status updates to voided |
| 7.5 | Visit `/checkout` | Placeholder POS route loads without crashing |

## 8. Platform billing

| # | Step | Expected |
|---|------|----------|
| 8.1 | Visit `/pricing` logged in | Plan cards and current subscription visible |
| 8.2 | Start QPay checkout | Invoice created and payment UI shown |
| 8.3 | Complete QPay payment | Subscription moves to active |
| 8.4 | Review `/billing` | Invoice, payment transaction, and billing event visible |

## 9. Admin and ops

| # | Step | Expected |
|---|------|----------|
| 9.1 | Visit `/admin` as authorized admin | Admin overview loads |
| 9.2 | Visit `/internal/ops` as authorized operator | Internal ops tools load |
| 9.3 | Review organizations, jobs, and billing screens | Pages render with current data |

## 10. Release sanity

| # | Step | Expected |
|---|------|----------|
| 10.1 | Main public pages are usable on mobile width | No broken layout |
| 10.2 | Main clinic workspace screens render without crashes | No blocking console or server errors |
| 10.3 | Booking -> schedule -> treatment -> billing loop can be completed end to end | Core workflow succeeds |
| 10.4 | `npm run smoke:browser` | 4 role scenarios pass locally or in CI |

## Quick regression subset

- Auth login and redirect
- Public booking submit
- Clinic setup add service
- Schedule status change
- Treatment record create
- Billing payment capture
