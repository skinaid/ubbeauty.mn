# UbBeauty Product Scope

Canonical product scope for the current system direction.

## Product definition

UbBeauty is an appointment-led operating system for skin care and aesthetic clinics.

The system has two connected surfaces:

1. A public marketplace and clinic microsite layer where end users:
   - discover clinics
   - compare services
   - see pricing and promotions
   - request bookings
2. A private clinic workspace where the clinic team:
   - configures branches, staff, services, and hours
   - manages appointments and patient history
   - records treatments
   - completes checkout and payment workflows

## Primary users

### End user

Needs to:
- find a clinic
- understand services and positioning
- check slot availability
- submit a booking request

### Front desk / manager

Needs to:
- manage the schedule
- confirm, reschedule, cancel, and complete appointments
- access patient context quickly
- hand visits into treatment and checkout

### Provider

Needs to:
- see upcoming patients
- capture structured treatment notes
- record follow-up instructions
- contribute to visit completion

### Cashier / owner

Needs to:
- create and manage checkout drafts
- collect payments
- process refunds and voids when needed
- track clinic revenue and subscription status

### Platform operator

Needs to:
- support organizations
- inspect jobs, billing, and audit trails
- manage plans and admin settings

## In scope now

- Authentication and organization bootstrap
- Subscription and platform billing foundation
- Public home, clinic directory, clinic detail, and booking entry
- Clinic setup for locations, staff, services, and availability rules
- Appointment creation and status transitions
- Patient timeline and patient detail views
- Treatment record creation
- Clinic checkout draft, payment capture, refund, and void support
- Admin and internal ops tooling

## Must become complete for MVP-complete clinic OS

- Clinic onboarding wizard
- Operational dashboard with live appointment and revenue signals
- Calendar-grade front desk scheduling
- Full patient CRM depth
- Before/after and treatment evidence workflow
- Real POS checkout experience
- Reminder and follow-up automation
- Clinic-domain QA, smoke tests, and release checklist

## Explicitly out of scope for current MVP-complete target

- Full hospital EMR
- Insurance workflows
- Inventory ERP
- Advanced accounting export
- Multi-country localization
- Marketplace payments from end users directly in the booking flow

## Current strategic constraint

The codebase still contains legacy MarTech modules and documents. These are allowed to remain only if:

- they do not block clinic OS progress
- they are clearly isolated from the new primary user journey
- new development prioritizes clinic operating workflows first

## Definition of done for the first complete product version

The product is considered complete for the first clinic-ready version when a clinic can:

1. Set itself up without manual database intervention.
2. Publish a public profile and accept booking requests.
3. Run front desk appointment operations daily in the product.
4. Maintain patient and treatment history in the product.
5. Complete checkout and payment workflows in the product.
6. Operate with support and audit tooling without ad-hoc SQL.
