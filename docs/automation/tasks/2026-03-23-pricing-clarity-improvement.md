# Task Brief

## Title
Pricing clarity improvement

## Objective
Make MarTech pricing and billing entry points easier for first-time and signed-in users to understand, without changing the underlying billing behavior.

## Why this matters
The product foundation is now usable, but the current pricing and billing pages still read like implementation details rather than a clean customer-facing flow. This creates friction at a critical conversion step.

## Current state
- Public pricing exists at `src/app/(public)/pricing/page.tsx`
- Billing state exists at `src/app/(dashboard)/billing/page.tsx`
- Core billing logic already works through QPay invoice → payment verification → subscription activation
- The current copy and structure are technically correct, but still too internal/operational in tone for normal users

## Success criteria
- Pricing page clearly explains what each plan includes in customer language
- Users can understand the difference between plan selection and payment
- QPay flow is explained in a simpler, more reassuring way
- Logged-out and logged-in states both feel intentional and clear
- Billing page is easier to scan and better communicates subscription/payment status
- No billing behavior or state logic is changed in this task

## Scope
### In scope
- pricing page copy and information hierarchy
- plan card clarity
- public CTA clarity
- simple improvements to billing page presentation/copy
- clearer explanation of QPay payment flow
- minor UI polish if needed for readability

### Out of scope
- billing logic changes
- schema or migration changes
- QPay API behavior changes
- new pricing plans or plan economics
- full billing dashboard redesign

## Constraints
- Keep the implementation lightweight and aligned with current UI patterns
- Preserve all existing billing/business logic
- Prefer Mongolian customer-facing copy where appropriate
- Avoid over-marketing; prioritize clarity and trust

## Affected areas
- UI/pages: `src/app/(public)/pricing/page.tsx`, `src/app/(dashboard)/billing/page.tsx`
- Backend flows: none intended
- Database: none
- AI/reporting: none
- Docs/ops: update only if the new user-facing behavior needs documentation

## Agents involved
- Coordinator (`martech-coordinator`)
- Product / PM (`martech-pm`)
- Frontend (`martech-frontend`)
- QA (`martech-qa`)

## Risks
- Copy may become too long or too polished without increasing clarity
- UI polish could accidentally make billing states less explicit
- Public pricing and signed-in billing language could drift apart

## Validation plan
- Review pricing page as logged-out user
- Review pricing page as signed-in user with and without org/subscription context
- Review billing page scan-ability for active and bootstrap states
- Confirm no changes to checkout gating or billing state logic
- Check desktop and mobile readability

## Approval checkpoints
- Human reviews the revised pricing/billing tone and structure
- Human approves push after visual review if the change is substantial

## Squad mode
This task should use the **UI / onboarding improvement** workflow from `docs/automation/FIRST_WORKFLOWS.md`.

## Coordinator note
This is the first live task brief created under the MarTech squad operating model. It is intentionally scoped as a low-risk, user-facing clarity improvement to help establish the workflow before moving on to deeper backend or release automation.
