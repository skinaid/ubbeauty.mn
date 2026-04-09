# Clinic OS Execution Backlog

This document turns the 10 highest-priority initiatives into an executable engineering backlog.

## Epic 1: Product docs and route alignment

Goal:
- remove ambiguity between legacy MarTech and clinic OS direction

Stories:
- rewrite README around clinic OS
- align architecture, roadmap, and smoke docs
- define canonical route map and module ownership

Tasks:
- [ ] Update README product language
- [x] Rewrite `docs/product-scope.md`
- [x] Rewrite `docs/architecture.md`
- [x] Rewrite `roadmap.md`
- [x] Rewrite clinic-oriented smoke checklist
- [ ] Add route ownership table to docs

## Epic 2: Operational dashboard

Goal:
- turn `/dashboard` into the main daily command center

Stories:
- today appointments summary
- pending confirmations
- treatment queue summary
- payment collection summary

Tasks:
- [ ] Replace foundation copy with live clinic metrics
- [ ] Add today/this week appointment counts
- [ ] Add no-show / cancellation indicators
- [ ] Add revenue and checkout snapshot
- [ ] Add quick actions for front desk

## Epic 3: Real POS checkout surface

Goal:
- replace placeholder `/checkout` with a usable POS experience

Stories:
- active cart selection
- service and add-on lines
- payment collection flow
- receipt and completion states

Tasks:
- [ ] Define checkout state model for route-level POS
- [ ] Load active checkout drafts
- [ ] Render cart and totals
- [ ] Support partial/full payment UI
- [ ] Add refund / void affordances where appropriate
- [ ] Link billing and checkout surfaces coherently

## Epic 4: Front desk scheduling

Goal:
- make `/schedule` a true appointment operations screen

Stories:
- calendar/day view
- reschedule flow
- check-in / arrival flow
- no-show recovery

Tasks:
- [ ] Add day timeline or calendar layout
- [ ] Add reschedule action
- [ ] Add appointment notes and reason visibility
- [ ] Add arrival/check-in optimized controls
- [ ] Add no-show follow-up support

## Epic 5: Clinic onboarding wizard

Goal:
- make clinic go-live setup guided and measurable

Stories:
- branch setup
- staff setup
- service setup
- opening hours setup
- public profile readiness

Tasks:
- [ ] Create guided setup flow
- [ ] Add readiness checklist
- [ ] Show public profile preview and publish state
- [ ] Surface missing dependencies before go-live

## Epic 6: Booking confirmation and reminder architecture

Goal:
- strengthen booking reliability after request submission

Stories:
- confirmation state
- reminder jobs
- reschedule links
- duplicate prevention

Tasks:
- [ ] Define appointment reminder lifecycle
- [ ] Add confirmation status handling
- [ ] Add reminder job foundation
- [ ] Add booking duplicate and collision protections
- [ ] Add clinic-side follow-up states

## Epic 7: Patient CRM enrichment

Goal:
- make patient records useful beyond simple timelines

Stories:
- tags and preferences
- contraindications and flags
- marketing-consent / contactability
- repeat-visit context

Tasks:
- [ ] Extend patient schema and UI
- [ ] Add CRM metadata editing
- [ ] Add follow-up tasks / reminders
- [ ] Improve patient detail summary cards

## Epic 8: Treatment evidence workflow

Goal:
- complete treatment records with proof and outcomes

Stories:
- before/after images
- richer consent proof
- outcome review
- provider templates

Tasks:
- [ ] Add upload/storage flow for treatment evidence
- [ ] Link assets to treatment records
- [ ] Add before/after presentation in patient timeline
- [ ] Add reusable treatment templates

## Epic 9: Clinic-domain test suite

Goal:
- raise confidence in the clinic operating loop

Stories:
- booking tests
- appointment transition tests
- checkout/payment tests
- patient/treatment integration tests

Tasks:
- [ ] Add tests for `modules/clinic/public-actions.ts`
- [ ] Add tests for `modules/clinic/scheduling.ts`
- [ ] Add tests for appointment transition actions
- [ ] Add tests for checkout/payment clinic flows
- [ ] Add route-level smoke regression coverage where practical

## Epic 10: Clinic release checklist

Goal:
- make the clinic product releasable and supportable

Stories:
- launch checklist
- operational runbook
- smoke checklist
- beta acceptance criteria

Tasks:
- [ ] Rewrite private beta runbook around clinic flows
- [ ] Add clinic launch acceptance checklist
- [ ] Add seeded demo scenario for QA
- [ ] Define beta sign-off gates

## Recommended build order

1. Epic 1
2. Epic 2
3. Epic 5
4. Epic 4
5. Epic 7
6. Epic 8
7. Epic 3
8. Epic 6
9. Epic 9
10. Epic 10
