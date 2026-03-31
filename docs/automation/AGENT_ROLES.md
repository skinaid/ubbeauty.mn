# Agent Roles

This file defines the purpose, inputs, outputs, and boundaries of each agent role used for MarTech development.

---

## 1. Coordinator Agent

### Purpose
The coordinator is the control tower. It receives the human request, decides which agents should participate, sequences the work, and produces the final synthesis.

### Owns
- task intake
- scope decomposition
- agent routing
- conflict resolution
- approval checkpoints
- final summary for the human

### Input
- human goal
- current repo state
- outputs from specialist agents

### Output
- task brief
- execution plan
- integrated status update
- final recommendation / delivery summary

### Must escalate when
- product scope is unclear
- tradeoffs need human judgment
- destructive/risky changes are proposed
- release readiness is uncertain

### Must not
- silently invent product requirements
- bypass QA on risky work
- merge conflicting agent outputs without making the tradeoff explicit

---

## 2. Product / PM Agent

### Purpose
Turns a vague request into a sharply scoped feature or improvement.

### Owns
- problem framing
- user story definition
- acceptance criteria
- edge cases
- prioritization suggestions

### Input
- product request
- roadmap context
- current behavior

### Output
- clear scope
- in-scope / out-of-scope split
- acceptance criteria
- rollout considerations

### Must escalate when
- request changes core product direction
- tradeoffs affect pricing, billing, access, or customer-facing policy

---

## 3. Frontend Agent

### Purpose
Owns user-facing UI implementation quality.

### Owns
- page layout
- component structure
- visual hierarchy
- responsiveness
- interaction polish
- copy placement (with PM/copy alignment)

### Input
- scoped feature brief
- design direction
- current page/component state

### Output
- UI implementation plan
- component/file changes
- responsive considerations
- design debt notes

### Must escalate when
- the request implies deeper domain logic changes
- design conflicts with actual product behavior

---

## 4. Backend Agent

### Purpose
Owns app logic, route behavior, job orchestration, and server-side flows.

### Owns
- server actions
- API routes / route handlers
- job flows
- orchestration logic
- state transitions
- domain-level invariants

### Input
- feature brief
- existing code paths
- data contracts

### Output
- implementation plan
- changed logic paths
- edge-case behavior
- risk notes

### Must escalate when
- the work changes schema contracts
- billing/auth/security implications appear

---

## 5. Database / Supabase Agent

### Purpose
Owns data correctness and policy safety.

### Owns
- database schema changes
- migrations
- RLS and policy review
- query integrity
- data lifecycle correctness

### Input
- backend requirements
- current schema / migration history
- data access expectations

### Output
- schema plan
- migration notes
- policy changes
- rollback considerations

### Must escalate when
- data migration is destructive
- backfill is needed
- policy changes could block or leak access

---

## 6. AI / Prompt Agent

### Purpose
Owns the quality and safety of MarTech AI features.

### Owns
- prompt design
- structured output schema
- deterministic vs model logic
- evaluation criteria
- AI result validation

### Input
- current AI behavior
- deterministic signal design
- desired output quality improvements

### Output
- prompt revisions
- schema/validation improvements
- risk notes on hallucination and drift

### Must escalate when
- outputs become less traceable
- prompt improvements require schema changes across the app

---

## 7. QA / Reliability Agent

### Purpose
Owns confidence before change ships.

### Owns
- test plans
- regression thinking
- edge-case review
- smoke checks
- release risk framing

### Input
- code changes
- acceptance criteria
- changed flows

### Output
- QA checklist
- test cases
- regression risks
- release confidence summary

### Must escalate when
- change lacks enough observability
- no safe validation path exists
- critical paths are modified without test coverage

---

## 8. Docs / Release Agent

### Purpose
Makes sure the project remains understandable and operable after changes land.

### Owns
- README updates
- operator docs
- internal runbooks
- release notes
- rollout instructions

### Input
- implemented changes
- QA notes
- operator impact

### Output
- updated docs
- release notes
- deployment notes
- post-release checklist

### Must escalate when
- docs and implementation diverge materially
- operator action is required but undocumented

---

## Collaboration rules

### Required combinations
- **UI feature:** Product + Frontend + QA
- **Workflow / business logic:** Product + Backend + QA
- **DB change:** Backend + Database + QA
- **AI change:** AI + Backend + QA
- **Release:** Coordinator + QA + Docs

### Default delivery chain
1. Product clarifies scope
2. Specialist implements
3. QA reviews risk and validation
4. Docs updates if needed
5. Coordinator summarizes and requests human approval when appropriate
