# UbBeauty Clinic OS

UbBeauty is an appointment-led operating system for skin care and aesthetic clinics.

The product combines:
- a public clinic discovery and booking surface
- a private clinic workspace for operations
- platform billing, admin, and support tooling

## Current system status

Implemented foundations:
- Supabase Auth login flow
- organization bootstrap
- protected clinic workspace shell
- subscription and plan foundation
- QPay platform billing foundation
- clinic domain schema for locations, staff, services, patients, appointments, treatments, and checkout
- public clinic discovery and booking entry
- clinic workspace foundations for setup, scheduling, patients, treatments, and billing

Current gaps:
- dashboard is still foundation-level
- dedicated POS checkout route is still placeholder-level
- docs and release materials are being aligned from legacy MarTech wording to clinic OS wording
- clinic-domain automated test coverage needs expansion

## Main route groups

### Public

- `/`
- `/clinics`
- `/clinics/[slug]`
- `/book/[slug]`
- `/pricing`

### Clinic workspace

- `/dashboard`
- `/clinic`
- `/schedule`
- `/patients`
- `/treatments`
- `/billing`
- `/checkout`

### Platform admin / ops

- `/admin`
- `/internal/ops`

## Run locally

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - `cp .env.example .env.local`
   - fill Supabase and app URL variables
   - fill `SUPABASE_SERVICE_ROLE_KEY`
   - fill QPay variables if billing is being tested
   - optional: fill OpenAI variables
3. Apply migrations in `supabase/migrations/` in order
4. Seed plans from `supabase/seeds/`
5. Start app:
   - `npm run dev`

## Important docs

- [Product scope](./docs/product-scope.md)
- [Architecture](./docs/architecture.md)
- [Clinic MVP plan](./docs/clinic-saas-mvp1-plan.md)
- [Execution backlog](./docs/clinic-os-backlog.md)
- [Manual smoke checklist](./docs/manual-smoke-test-checklist.md)
- [Private beta launch notes](./docs/private-beta-launch.md)

## Notes

- Legacy MarTech modules still exist in the repo and should be treated as secondary to clinic OS development.
- Keep docs, route decisions, migrations, and release checklists synchronized as clinic workflows evolve.
