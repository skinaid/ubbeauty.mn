# Task Template

Use this template whenever a new feature, improvement, refactor, or hardening task begins.

```md
# Task Brief

## Title

## Objective
What are we trying to achieve?

## Why this matters
What product, user, or operational problem does this solve?

## Success criteria
- 
- 
- 

## Scope
### In scope
- 
- 

### Out of scope
- 
- 

## Constraints
- 
- 

## Affected areas
- UI/pages:
- Backend flows:
- Database:
- AI/reporting:
- Docs/ops:

## Agents involved
- Coordinator
- 
- 

## Risks
- 
- 

## Validation plan
- 
- 

## Approval checkpoints
- 
- 
```

## Example

```md
# Task Brief

## Title
Homepage product-intro landing page

## Objective
Create a clean Mongolian homepage that explains what MarTech does for first-time visitors.

## Why this matters
The product is functional, but new visitors do not immediately understand the value or first step.

## Success criteria
- Logged-out users see a clear homepage at `/`
- Logged-in users still route to dashboard/setup correctly
- The page explains the product in under one screen and a half
- Primary CTA leads to login

## Scope
### In scope
- Hero
- Benefits
- How it works
- Final CTA

### Out of scope
- Full marketing site redesign
- Customer testimonials

## Constraints
- Mongolian copy
- Keep implementation lightweight
- Do not change auth behavior

## Affected areas
- UI/pages: `src/app/page.tsx`
- Backend flows: redirect logic only
- Database: none
- AI/reporting: none
- Docs/ops: optional README note

## Agents involved
- Coordinator
- Product
- Frontend
- QA

## Risks
- Logged-in redirect regression
- Copy becoming too long or too vague

## Validation plan
- Check logged-out homepage manually
- Check logged-in redirect behavior
- Check mobile layout

## Approval checkpoints
- Human reviews copy/tone
- Human approves push if needed
```
