# Roadmap

This roadmap is now anchored to the clinic operating system direction.

## Phase outline

1. Product alignment
2. Public discovery and booking funnel
3. Clinic onboarding and setup
4. Front desk scheduling and appointment operations
5. Patient CRM and timeline depth
6. Treatment workflow and evidence capture
7. POS checkout and payment completion
8. Reporting, entitlements, and automation
9. Reliability, QA, and release readiness

## Current position

The codebase is between phases 2 and 7:

- Public discovery and booking are partially implemented.
- Clinic setup, appointments, patients, treatments, and billing foundations exist.
- Several surfaces still reflect a foundation or placeholder state.
- Documentation and release checklists still require alignment to the clinic OS product.

## Near-term priorities

1. Align product docs, route map, and release checklist with the clinic OS direction.
2. Turn the dashboard into a live operational surface.
3. Replace placeholder POS flows with a complete checkout experience.
4. Strengthen scheduling, reminders, and patient lifecycle workflows.
5. Add clinic-domain tests and smoke coverage.

## Working rules

- Prioritize clinic workflow completion over extending legacy MarTech capabilities.
- Keep migrations, docs, and route map synchronized with implementation.
- When a feature is only foundation-level, mark it clearly in docs and UI.
- Favor end-to-end workflow completion over shallow expansion into many modules.
