# Architecture — Agentforce in Healthcare CRM

Author: Rishi Gullapalli (rishisfdc9-daaku)
Status: Fictional prototype. Demo logic is real JavaScript; Salesforce
code is scaffolding, not deployed; integrations are mocked/interfaces only.

## System diagram (markdown)

```
                    ┌─────────────────────────┐
                    │   Member / Support Agent │
                    │  (demo: browser console) │
                    └────────────┬────────────┘
                                 │ fictional case text / question
                                 ▼
              ┌──────────────────────────────────────┐
              │        TRUST LAYER (first)           │
              │  RedactionService: mask phone / SSN- │
              │  like / member-ID / email patterns   │
              │  Consent check: fail closed if unclear│
              └────────────┬─────────────────────────┘
                           │ redacted text only
              ┌────────────┴─────────────────────────┐
              │                                      │
      ┌───────▼────────┐  ┌──────────▼──────────┐  ┌▼──────────────────┐
      │  Triage Agent  │  │ Summarisation Agent │  │ Conversational    │
      │  urgency +     │  │ extractive summary  │  │ Agent (retrieval) │
      │  category +    │  │ from case history   │  │ KB-101 … KB-106   │
      │  confidence +  │  └──────────┬──────────┘  │ + citations /     │
      │  routing queue │             │             │ "I don't know"    │
      └───────┬────────┘             │             └─────────┬───────┘
              │                      │                       │
              └────────────┬─────────┴───────────┬───────────┘
                           ▼                     ▼
              ┌──────────────────────────────────────────────┐
              │   Escalation & Governance Agent              │
              │   Escalate if: P1, confidence < 70%,         │
              │   sensitive topic, member asked, chat        │
              │   fallback, high-risk w/o approval,          │
              │   consent unclear, PHI unredacted            │
              │   → Human Review / Clinical Escalation queue │
              │   → Human override (logged, with reason)     │
              └───────────────────┬──────────────────────────┘
                                  ▼
              ┌──────────────────────────────────────────────┐
              │   Audit Trail (every step, append-only)      │
              │   actor, action, timestamp, confidence,      │
              │   citations, override — who decided what     │
              └──────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │  Salesforce (FUTURE, not   │
                    │  deployed): Case, Person   │
                    │  Account, Care Plan, Audit │
                    │  Log, Knowledge, Data Cloud│
                    │  (governed, consent-gated) │
                    └────────────────────────────┘
   External systems (EHR / benefits / claims): INTERFACES ONLY in this
   prototype. No live calls, no credentials, no real data.
```

## Data flow — end to end
1. Member/agent submits a fictional case in the demo console.
2. Redaction runs FIRST. Masked text is what every later step sees.
3. Triage classifies urgency, category, confidence, reasons, queue.
4. Summarisation builds an extractive summary from the redacted history.
5. If the member chats, retrieval searches the mock knowledge base;
   a good match answers with citations, a weak match escalates.
6. Escalation & Governance checks all triggers. Any trigger → human queue.
7. A human can override urgency/queue, with a reason, logged in the audit.
8. Every step writes an audit entry. The demo panel shows this live and
   lets the user download it as text.

## Own agent runtime (custom-built, not just a platform configuration)

The agents in this project are instances of a small agent runtime I
wrote in `core/agent.js`, not platform agent settings:

```
Task input
  -> Input guardrails (injection, PHI, diagnosis/dosage patterns)
  -> Plan: visible, fixed tool list for the task type
  -> Act: tool by tool, each with a reasoning sentence, a result,
     and a confidence, recorded in memory and in the trace
  -> Output guardrails after EVERY tool call
  -> Confidence gate: below 70%, or high-risk without human review,
     the agent escalates instead of proceeding
```

Tools (`core/tools.js`) wrap the real `core/` modules — redact,
triage, summarise, answer-from-knowledge, escalate-check,
consent-check, audit-log, run-guardian-checks,
build-remediation-plan, apply-safe-fixes. Agents (`core/agents.js`):
triage, conversational, summarisation, guardian, and remediation.
Salesforce Apex (`OwnAgentService.cls`) is an integration contract
for calling this logic from an org; it is not the agent itself. See
`agents/own-agent-framework.md` for the full design and for how this
differs from using only a platform agent.

## Pre-deployment guard — guarded deployment, before anything deploys

This is the safety net that sits between "the model works in the demo"
and "the model is deployed", so the health CRM is guarded carefully
and failures land softly, on a human review queue, not on a member:

```
Case pipeline (above)
  -> GUARDIAN (own guardian agent, core/guardian.js)
       triage accuracy, escalation coverage, PHI leak scan,
       prompt-injection / unsafe-output scan, consent fail-closed,
       audit completeness, citation checks, hidden-bug edge cases
  -> Developer issue report (core/issue-report.js)
       severity, location, evidence, why it matters, fix, owner
  -> REMEDIATION agent (own remediation agent, core/remediation.js)
       safe fixes applied automatically in the model
       high-risk fixes = patch proposals, named human approval required
  -> RE-GUARD (guardian re-runs, applied fixes verified)
  -> DEPLOYMENT GATE (core/predeploy.js)
       BLOCKED if any Critical/High issue remains after re-guard
       Medium/Low alone need a recorded human approval
       "Deploy allowed" in this model means the gate passed —
       it does NOT deploy to any real system
```

Simulated faults (`simulateFaults`) exist only so the guard can be
proven to block in tests and in the demo. They are labelled as
simulated everywhere, and a clean deployment run uses none. The guard
does not guarantee zero bugs — it guarantees the checks above were
run, the results were written down, and a blocked deployment cannot
proceed silently. See `agents/predeployment-guardian-agent.md` and
`agents/remediation-agent.md`.

## Trust-layer / governance design
This is the part I care most about, because it is what separates a demo
from something a healthcare team could actually trust:

- **Redaction before reasoning.** Agents never see raw PHI-like patterns.
- **Explainable decisions.** Triage outputs reasons/keywords, not just a label.
- **Confidence as a gate.** Below 70% → human. Not a suggestion, a rule.
- **"I don't know" as a success.** Retrieval fallback escalates instead
  of hallucinating policy or medical answers.
- **Extractive summaries.** No invented facts in the first version.
- **Human override, logged.** Humans can correct the agent, and that
  correction is itself auditable — accountability runs both ways.
- **Consent fails closed.** Unclear consent = no profile, no integration,
  ask a human.
- **Audit everything.** Actor, action, time, confidence, citations,
  override. If it is not in the audit trail, it did not happen.
- **Evaluation built in.** `core/evaluation.js` covers triage accuracy,
  summary grounding (hallucination check), and a basic bias check
  (same content, different names → same triage). These run in tests.
- **Separation of concerns.** Support data (Case), member data (Person
  Account), care coordination (Care Plan), and governance (Audit Log)
  are separate objects with separate access — see `salesforce/data-model.md`.

## What is NOT in this architecture (deliberately)
- No live EHR / benefits / claims connections.
- No real patient data, no credentials, no secrets.
- No diagnosis, treatment recommendation, or medical advice path.
- No silent auto-resolution of P1 or sensitive cases.
- No model that can change a governance threshold without a code/docs
  change and a test — thresholds are constants, reviewed in change control.

## File map
- `demo/` — working browser console (no build step), including section 5, the pre-deployment guard UI
- `core/` — reusable logic + tests (the demo uses these same modules), including the own-agent runtime (`agent.js`, `tools.js`, `agents.js`) and the guarded deployment modules (`guardian.js`, `issue-report.js`, `remediation.js`, `predeploy.js`)
- `agents/` — agent design docs, including own-agent framework, guardian agent, and remediation agent
- `prompts/` — Prompt Builder-style templates (not deployed, not the core)
- `salesforce/` — Apex scaffolding, LWC scaffolding, data model, including guardian / remediation / own-agent integration classes
