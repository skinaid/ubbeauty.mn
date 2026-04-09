# System Clone Playbook

This project can be reused as a strong SaaS foundation, but it is not yet a neutral template.
Today it is tightly coupled to:

- MarTech branding and legal copy
- Meta/Facebook page analytics as the datasource
- QPay as the payment provider
- AI reporting on synced social metrics

If you want to turn it into a new system, use the repo in three layers.

## 1. Reuse As-Is

These parts are already generic enough to keep with minimal change:

- Auth foundation: `src/modules/auth`, `src/app/auth`, `src/components/auth`
- Organization / tenant model: `src/modules/organizations`, setup flow, protected dashboard shell
- Admin structure: `src/app/admin`, `src/modules/admin`
- Subscription foundation: `src/modules/subscriptions`
- Internal ops / audit patterns: `src/app/internal`, `src/modules/ops-audit`
- Shared UI primitives: `src/components/ui`
- Supabase client wrappers: `src/lib/supabase`

## 2. Rebrand First

These are the fastest wins before deeper product changes:

- App identity and legal metadata
- Public marketing copy
- Login screen branding
- Support email / company name / domain references
- Logo assets under `public/brand/`

Start by editing:

- `src/config/app.ts`
- `src/app/page.tsx`
- `src/app/(public)/login/page.tsx`
- `src/app/(public)/privacy/page.tsx`
- `src/app/(public)/terms/page.tsx`
- `public/brand/logo.svg`
- `README.md`

## 3. Replace Product-Specific Engines

These areas define what the system actually does. They are the main work for a new product.

### Datasource Layer

Current implementation:

- `src/modules/meta`
- `src/lib/meta`
- `src/modules/sync`
- `src/app/api/meta`
- `src/app/auth/google/route.ts` and related callback flows only if your new system still needs third-party OAuth

What to do:

- Keep the authorization pattern
- Replace Meta-specific API calls with your new provider or internal datasource
- Rename sync jobs and normalized metrics tables to match the new domain

### Billing Layer

Current implementation:

- `src/modules/billing`
- `src/app/api/webhooks/qpay`
- `src/components/billing`
- `docs/billing-qpay.md`

What to do:

- Keep invoice / transaction / verification flow patterns
- Swap QPay client and webhook verification for your payment provider
- Review plan currency, invoice states, and callback semantics

### AI / Analysis Layer

Current implementation:

- `src/modules/ai`
- dashboard insight components under `src/components/ai`

What to do:

- Keep the async job, quota, and persistence patterns
- Replace prompt construction, metric readers, and signals with your new domain logic

### Brand Manager Layer

Current implementation:

- `src/modules/brand-managers`
- `src/components/brand-managers`
- routes under `src/app/(dashboard)/brand-managers`

This is already a second product concept inside the repo. Decide early whether your new system:

- keeps this feature and adapts it
- removes it entirely
- promotes it to the main product direction

## Database Impact

For a real clone, review Supabase schema in this order:

1. `supabase/migrations/202603220001_phase2_auth_org.sql`
2. `supabase/migrations/202603220002_phase3_subscriptions.sql`
3. `supabase/migrations/202603220004_phase4_meta_foundation.sql`
4. `supabase/migrations/202603220005_phase5_meta_sync.sql`
5. `supabase/migrations/202603220006_phase6_ai_analysis.sql`
6. `supabase/migrations/202603220008_phase7_billing_qpay.sql`
7. `supabase/migrations/202603310001_brand_managers.sql`
8. `supabase/migrations/202603310002_brand_visual_assets.sql`

Recommended approach:

- Keep auth, organization, membership, plans, subscriptions, usage counter foundations
- Fork or rewrite Meta, sync, analytics, and QPay tables to match the new business domain
- Avoid carrying old table names into a new product if the meaning changes

## Practical Clone Sequence

1. Duplicate the repo into a new folder/repository.
2. Replace app identity in `src/config/app.ts` and logo assets.
3. Remove or hide public pages that describe the old MarTech product.
4. Decide whether the new system still needs:
   - third-party OAuth
   - external sync jobs
   - AI reports
   - subscription billing
5. Keep only the modules that match the new product.
6. Rename database tables and routes before production data exists.
7. Rewrite the dashboard around the new core workflow.
8. Update `.env.example` for the new integrations.
9. Run `npm run typecheck`, `npm run lint`, `npm run test`.

## Recommended Next Step

The safest next engineering move is to convert this repo into a reusable core by doing two follow-up passes:

- Pass 1: centralize all remaining brand/product constants
- Pass 2: isolate Meta, QPay, and AI behind provider-style interfaces

Once those are done, cloning this into a new system becomes much cheaper and less risky.
