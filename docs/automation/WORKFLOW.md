# Workflow

This file defines the standard development workflow for MarTech's multi-agent operating model.

## 1. Request intake

The human starts with a goal, for example:
- Improve onboarding clarity
- Add a billing feature
- Harden Meta sync retries
- Improve AI analysis quality

The coordinator converts that into a structured brief.

## 2. Task brief creation

Each new task should define:
- objective
- business reason
- success criteria
- constraints
- affected areas
- approval requirements

Use `TASK_TEMPLATE.md`.

## 3. Agent routing

The coordinator selects the smallest necessary set of agents.

### Examples
- Homepage polish → Product + Frontend + QA
- Sync retry redesign → Backend + Database + QA
- AI analysis improvement → AI + Backend + QA
- Launch prep → Product + QA + Docs

## 4. Analysis pass

Before implementation, the selected agents should answer:
- what is changing?
- what can break?
- what is the cleanest minimal path?
- what should stay out of scope?

## 5. Implementation pass

Implementation should prefer:
- small, coherent commits
- minimal architectural disruption
- consistency with existing patterns
- explicit handling of risky edges

## 6. QA pass

No feature is complete without verification.

The QA pass should produce:
- happy path checks
- edge case checks
- regression risks
- operator impact
- release confidence

## 7. Docs pass

If behavior, setup, operations, or expectations change, docs must be updated in the same work stream.

## 8. Human checkpoint

The human should be asked to approve when work includes:
- product behavior changes with visible UX impact
- pricing or billing changes
- auth / access changes
- database migrations with meaningful risk
- deployment / release actions

## 9. Completion format

A completed task should end with:
- what changed
- files changed
- risks / limits
- how it was checked
- whether anything remains for later

---

## Modes of operation

### Mode A — Guided feature mode
Best default mode.
- human gives direction
- coordinator routes work
- agents analyze/implement
- human approves important checkpoints

### Mode B — Release mode
Use for launch bundles and risky production changes.
- stronger QA
- stronger docs requirements
- explicit rollout and rollback thinking

### Mode C — Maintenance mode
Use for follow-up automation and periodic checks.
- docs drift
- release checklist reminders
- regression spot checks
- unresolved TODO review

---

## Guardrails

1. Do not start with too many agents.
2. Prefer the smallest competent squad.
3. Do not let one agent silently define product policy.
4. Do not treat code complete as task complete.
5. Keep the human informed at decision boundaries.
