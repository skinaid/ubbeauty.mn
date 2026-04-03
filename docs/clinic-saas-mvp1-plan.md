# UbBeauty Clinic SaaS MVP 1 Plan

## Product direction

UbBeauty is being repositioned from a MarTech analytics product into an appointment-led operating system for skin care and aesthetic clinics.

## MVP 1 outcome

The first version should let a clinic:

- create a public clinic profile
- publish services and staff
- accept online appointments
- manage patients and visit history
- record treatments in a structured way
- collect payments through billing and POS flows

The first version should let an end user:

- discover a clinic profile
- understand services and positioning
- book an appointment online

## Build order

1. Reframe the product language and route map
2. Add clinic domain schema foundations
3. Implement scheduling and online booking core
4. Add patient CRM
5. Add treatment records
6. Expand billing into clinic checkout and POS
7. Retire or isolate old MarTech-specific modules

## Route target

### Public

- `/`
- `/clinics`
- `/clinics/[slug]`
- `/book/[slug]`

### Clinic workspace

- `/dashboard`
- `/appointments`
- `/patients`
- `/treatments`
- `/billing`
- `/clinic`

### Platform admin

- `/admin`
- `/admin/organizations`
- `/admin/billing`
- `/admin/jobs`

## Data model target

- `organizations` remains the tenancy root in code for now and will represent clinics
- add `clinic_locations`
- add `staff`
- add `services`
- add `patients`
- add `appointments`
- add `appointment_status_history`
- add `treatment_records`
- add `invoice_items`
- add `payments`

## Technical notes

- Reuse Supabase Auth, memberships, subscriptions, and admin guard foundations
- Keep migrations additive until the clinic modules are stable
- Do not delete MarTech modules until replacement flows are live
- Move long-running sync-style operations toward background execution when appointment logic becomes real
