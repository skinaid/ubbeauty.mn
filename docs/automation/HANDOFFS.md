# Agent Handoffs

This file standardizes what information must be passed between agents so work stays coherent.

## General rule
Every handoff should make the next agent faster, not merely busier.

A handoff should always contain:
- task title
- objective
- current state
- decisions already made
- open risks
- exact ask for the next agent

---

## Product → Frontend

### Include
- user problem
- desired user outcome
- acceptance criteria
- out-of-scope items
- copy or messaging direction

### Example ask
"Implement a clear first-visit homepage for logged-out users. Keep it short, in Mongolian, and route signed-in users to dashboard as before."

---

## Product → Backend

### Include
- behavior change required
- domain rules
- state transitions
- failure expectations
- what the user should see if things fail

---

## Backend → Database

### Include
- new or changed data shape
- read/write paths
- constraints
- expected policies
- migration safety notes

---

## Backend / Frontend → QA

### Include
- files changed
- critical paths affected
- happy path
- likely failure modes
- manual verification suggestions

### QA should return
- test checklist
- regression concerns
- confidence level
- go / needs work / blocked

---

## Any implementation agent → Docs

### Include
- what changed for humans/operators
- any new setup or configuration
- changed behavior worth documenting
- release notes summary

---

## Specialist agents → Coordinator

### Include
- concise conclusion
- what changed or should change
- risks
- unresolved questions
- whether human approval is needed

---

## Minimum handoff template

```md
### Handoff
- Task:
- Objective:
- Current state:
- Decisions made:
- Open risks:
- Exact next ask:
```
