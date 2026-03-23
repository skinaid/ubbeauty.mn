# Playbooks

This file defines reusable playbooks for common types of work in MarTech.

## 1. New feature playbook

Use when adding a visible user-facing or business-facing capability.

### Steps
1. Product agent defines the problem and acceptance criteria.
2. Coordinator selects the smallest relevant squad.
3. Specialist agent(s) inspect current code.
4. Implementation plan is produced before major edits.
5. Code changes are made in focused commits.
6. QA produces a validation checklist.
7. Docs are updated if behavior changed.
8. Coordinator summarizes outcome and risks.

### Minimum squad
- Coordinator
- Product
- relevant implementation agent
- QA

---

## 2. Hardening / reliability playbook

Use when improving correctness, resilience, or production safety.

### Examples
- retry logic
- idempotency
- billing safety
- auth correctness
- sync failure handling

### Minimum squad
- Coordinator
- Backend
- QA
- Database if data/state is touched

### Output should include
- failure modes addressed
- what remains unprotected
- rollback/containment notes

---

## 3. AI improvement playbook

Use when changing prompts, AI schemas, model output logic, or deterministic signal behavior.

### Minimum squad
- Coordinator
- AI / Prompt
- Backend
- QA

### Required outputs
- prompt/schema change summary
- validation changes
- fallback behavior
- example failure modes

---

## 4. UI polish playbook

Use when improving presentation, clarity, or conversion without major domain changes.

### Minimum squad
- Coordinator
- Product
- Frontend
- QA

### Required checks
- responsive behavior
- CTA clarity
- copy clarity
- visual consistency

---

## 5. Release playbook

Use when pushing a bundle of meaningful changes toward production.

### Minimum squad
- Coordinator
- QA
- Docs
- specialists responsible for touched systems

### Required outputs
- what changed
- user-visible impact
- operator-visible impact
- rollback / recovery notes
- release confidence statement

---

## First 30-day recommendation

For the next stage of MarTech, default to these playbooks:
- **New feature playbook** for product growth work
- **Hardening playbook** for billing, sync, auth, and AI safety
- **UI polish playbook** for onboarding and conversion work

Do not automate everything at once. Build the habit first, then automate recurring coordination later.
