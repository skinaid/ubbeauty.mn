# Architecture

UbBeauty clinic operating system architecture.

## Overview

UbBeauty is a Next.js App Router SaaS platform for skin care and aesthetic clinics.

Current state:
- The system contains a legacy MarTech foundation for Meta sync, AI analysis, and subscription billing.
- The active product direction is a clinic operating system with a public discovery funnel and a private clinic workspace.

This document reflects both:
- the current implemented architecture
- the target clinic-first architecture the repo is moving toward

## Stack

- Next.js App Router
- Supabase Postgres + Auth + RLS
- QPay for platform billing and clinic payment rails
- OpenAI for optional AI capabilities

## Application surfaces

### Public surface

Routes:
- `/`
- `/clinics`
- `/clinics/[slug]`
- `/book/[slug]`
- `/pricing`
- auth/legal pages

Responsibilities:
- clinic discovery
- service comparison
- slot preview
- booking request entry

### Clinic workspace

Routes:
- `/dashboard`
- `/clinic`
- `/schedule`
- `/patients`
- `/patients/[patientId]`
- `/treatments`
- `/billing`
- `/checkout`

Responsibilities:
- clinic setup
- staff and service configuration
- appointment operations
- patient timeline
- treatment recording
- billing and POS

### Platform operations

Routes:
- `/admin/*`
- `/internal/ops/*`

Responsibilities:
- organization support
- billing review
- jobs and audit review
- system administration

## Current module map

```text
src/modules/
├── auth/              session and login helpers
├── organizations/     tenant resolution
├── subscriptions/     plans, entitlements, usage
├── billing/           QPay checkout, invoices, transitions, reconciliation
├── clinic/            clinic domain actions, public booking, scheduling, data access
├── admin/             system admin guards and actions
├── meta/              legacy Meta connection and token management
├── sync/              legacy sync jobs
├── ai/                legacy analytics/AI jobs
└── ops-audit/         operator audit recording
```

## Clinic domain architecture

### Public booking flow

Implemented today:
- public clinic summaries and detail fetch from `modules/clinic/public.ts`
- booking request submission in `modules/clinic/public-actions.ts`
- availability suggestions from `modules/clinic/scheduling.ts`

Target:
- slot locking or stronger booking collision handling
- reminder automation
- booking confirmation and reschedule experience

### Clinic setup flow

Implemented today:
- create locations
- create staff
- create services
- create availability rules

Primary entry:
- `/clinic`

Target:
- guided onboarding wizard
- publish state / booking readiness score
- richer clinic profile and promotions management

### Appointment operations

Implemented today:
- public booking request creation
- front desk appointment creation
- status transitions
- upcoming and recent appointment views

Primary entry:
- `/schedule`

Target:
- true calendar and timeline layout
- reschedule workflows
- reminder states
- no-show recovery tooling

### Patient CRM

Implemented today:
- patient list
- patient timeline
- patient detail composed from appointments, treatments, and checkouts

Target:
- segmentation and tags
- contraindications / flags
- follow-up tasks
- repeat visit workflows

### Treatment workflow

Implemented today:
- completed visit queue
- treatment record creation
- recent treatment history
- checkout handoff entry

Target:
- before/after evidence
- treatment templates
- consent artifact handling
- richer follow-up plan execution

### Billing and POS

Implemented today:
- platform subscription billing is robust
- clinic checkout draft / payment / refund foundation exists in `/billing`
- dedicated `/checkout` POS route is still placeholder-level

Target:
- full operational POS screen
- cart-based checkout
- split and partial payment UX
- print/share receipt workflows

## Key architectural risk

The biggest current risk is not missing tables. It is partial workflow completion across multiple surfaces:

- docs and product language still reference the legacy MarTech product
- some clinic workflows are implemented only as foundations
- POS is not complete on its dedicated route
- test coverage is much stronger for billing and legacy modules than for clinic workflows

## Architectural priorities

1. Finish the clinic core loop:
   public booking -> schedule -> treatment -> checkout -> payment
2. Make the dashboard operational, not descriptive.
3. Move long-running and automation-style work toward background execution.
4. Keep legacy MarTech modules isolated until explicitly retired.
