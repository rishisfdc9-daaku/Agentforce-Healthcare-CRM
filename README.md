# Agentforce in Healthcare CRM — AI Agents for Case Triage and Support

Author: Rishi Gullapalli (rishisfdc9-daaku)

> **Disclaimer — please read first:** This is a **fictional prototype**,
> not medical advice, not a real healthcare system, and not deployed
> anywhere. All members, cases, and knowledge articles are invented mock
> data. No real patient data, credentials, or secrets are used anywhere
> in this project. **If you have a medical emergency, call emergency
> services (e.g. 911 in the US) or go to your nearest emergency
> department, and contact a human clinician — do not rely on this demo.**

## Why I built this
I wanted to show what responsible AI in healthcare support actually looks
like — not just automation, but trust, accuracy, and accountability. The
agents here are designed to explain themselves, admit uncertainty, hand
over to humans early, and leave an audit trail for every decision. In
healthcare, a fast wrong answer is worse than a slower honest one, and
every design choice in this project follows from that.

## How to open / run the demo
No build step. No install. No server needed for the demo itself:

1. Open `demo/index.html` in any modern browser (double-click it, or
   serve the project folder with any static server).
2. Click a pre-loaded example case (claim denied, chest pain, medication
   ran out, reschedule, benefits question, or a vague message), or write
   your own fictional case.
3. Click **Run Triage Agent** — see urgency, category, confidence,
   reasons/keywords, routing queue, SLA target, and escalation decision.
4. Read the extractive case summary and toggle the PHI masked view
   (try including a fake phone like 555-123-4567 or MEM-123456 to see
   redaction work).
5. Ask the conversational agent a question — answers cite mock articles
   (KB-101 … KB-106). Ask something uncovered and watch it say
   "I don't know — escalating to a human" instead of guessing.
6. Try a **human override** (change urgency/queue with a reason) and
   watch it appear in the audit trail panel. Download the audit as text.
7. Scroll to **section 5, Pre-deployment guard** and click
   **Run pre-deployment guard** — see the guardian checks, the
   developer report, the remediation plan, the re-guard, and the
   deployment verdict. Try ticking "Simulate a PHI leak" to watch the
   guard block, the remediation agent auto-fix it (output re-redaction),
   and the re-guard pass — then try "Simulate an escalation gap" to
   watch a high-risk patch stay pending until a human approves it by
   name, and deployment stay blocked until the code itself is changed.
   Click **Download developer report** for the full markdown report.

## End-to-end flow
```
Submit fictional case
  → PHI redaction (masked text is what agents see)
  → Triage Agent (urgency P1–P4, category, confidence, reasons, queue)
  → Summarisation Agent (extractive summary from case history)
  → Conversational Agent (knowledge retrieval + citations, or fallback)
  → Escalation & Governance Agent (P1 / <70% confidence / sensitive /
     member request / chat fallback → human queue)
  → Human override (optional, logged with reason)
  → Audit trail (every step: actor, action, time, confidence, citations)
```

## Guarded deployment flow — before anything deploys

This is the part I added so the health CRM is guarded carefully, with
no open or hidden bugs slipping into a release unnoticed:

```
Case pipeline (above)
  → GUARDIAN (Pre-Deployment Guardian Agent, own agent)
      runs everything: triage accuracy, escalation coverage,
      PHI leak scan, prompt-injection / unsafe-output scan,
      consent fail-closed, audit completeness, citation checks,
      and hidden-bug edge cases (empty, null, vague, very long inputs)
  → Developer issue report (severity, location, evidence, why it
      matters for healthcare safety, suggested fix, owner)
  → REMEDIATION agent (own agent)
      safe, low-risk fixes applied automatically in the model
      (output re-redaction, audit logging, citation fallback)
      high-risk fixes (triage rules, escalation triggers, consent
      rules) become patch proposals requiring a NAMED human approval
      — never silently auto-deployed
  → RE-GUARD (guardian re-runs, with applied fixes verified)
  → DEPLOYMENT GATE
      deploy allowed only if no Critical/High issues remain
      after re-guard, and any Medium/Low issues have a recorded
      human approval. Otherwise: DEPLOY BLOCKED.
```

Important, stated plainly: this guard does **not** guarantee zero
bugs. No guard can. It guarantees that the checks listed above were
run, the results were written down, a blocked deployment cannot
proceed silently, and a safety-critical fix cannot be auto-deployed
without a human. The goal is a smooth, soft-working solution for
healthcare CRMs — soft in the sense that failures land on a human
review queue with a clear report, not on a member with a wrong answer.

Try it in the demo (section 5) or in Node:
```bash
node -e "var P = require('./core/predeploy'); console.log(JSON.stringify(P.runGuardedDeployment({}), null, 2));"
```

## Own agent framework — I built my own agent, not just a platform configuration

Salesforce Agentforce is a strong platform, and a real org would use
it for managed agents, Prompt Builder, Data Cloud, and the Trust
Layer. But the agents in this project are **my own, built from
scratch in code** — see `agents/own-agent-framework.md` for the full
design:

- `core/agent.js` — an `Agent` class with a goal, instructions,
  planning, tool use, memory/context, reasoning steps, guardrails,
  confidence scoring, and human escalation. Deterministic and
  reproducible, so every decision can be tested.
- `core/tools.js` — the tools agents call: redact, triage,
  summarise, answer-from-knowledge, escalate-check, consent-check,
  audit-log, run-guardian-checks, build-remediation-plan, and
  apply-safe-fixes. Each tool is real code wrapping a `core/` module.
- `core/agents.js` — triage, conversational, summarisation,
  guardian, and remediation agents, all instances of the same
  `Agent` class, each with its own instructions, tools, and
  guardrails. The guardian and remediation agents guard and fix
  using the same framework they are built from.
- Salesforce Apex/LWC is an **integration layer** that can call this
  own-agent logic (`OwnAgentService.cls`,
  `PreDeploymentGuardianService.cls`,
  `RemediationAgentService.cls`) — it is not the agent itself.

Prompt Builder-style templates in `prompts/` remain templates, not
the core. The core is the custom agent runtime in `core/`.

## What is real vs mocked — plainly
| Piece | Status |
|---|---|
| Triage scoring, urgency rules, routing, extractive summary, knowledge retrieval, redaction, escalation, consent checks, audit, evaluation | **Real JavaScript logic** in `core/`, used by both the demo and the tests |
| Members, cases, knowledge articles (KB-101…KB-106), example data | **Mocked / fictional** — invented for the demo |
| EHR / benefits / claims integrations | **Mocked as interfaces only** — no live calls, no endpoints, no credentials |
| Salesforce Apex + LWC code | **Scaffolding, not deployed** — intended structure, with TODO wiring notes where a real org would connect it |
| Prompt templates | **Templates, not deployed** — Prompt Builder-style text, not live prompts |
| Own agent framework (`core/agent.js`, `core/tools.js`, `core/agents.js`) | **Real, runnable code** — Agent class, tool registry, and agent instances, tested in Node and in the demo. No live model or platform service is called. |
| Pre-deployment guardian, developer report, remediation, deployment gate | **Real, runnable code** — `core/guardian.js`, `core/issue-report.js`, `core/remediation.js`, `core/predeploy.js`, plus demo section 5 and Apex scaffolding. "Deploy allowed" in this model means the gate passed; it does NOT actually deploy to any real system. |
| Deployment / GitHub / LinkedIn / real healthcare use | **None claimed** — this project is local only unless someone deliberately deploys it later |

## Safety & privacy notes
- PHI safety is built in: `core/redaction.js` masks phone, SSN-like,
  email, and fictional member-ID patterns before any agent logic runs,
  and the demo shows masked vs original side by side.
- Triage is **support routing only**, not diagnosis or treatment advice.
- P1 / safety keywords always escalate to a human clinical queue.
- Confidence below 70% always escalates to human review.
- Summaries are extractive in v1 — no invented facts.
- Chat answers require a knowledge-base match and citations; otherwise
  the agent escalates instead of guessing.
- Consent checks fail closed: unclear consent = ask a human, do not proceed.
- Audit trail records actor, action, timestamp, confidence, citations,
  and human overrides.
- Nothing in this project should ever be fed real patient data without
  the compliance, clinical safety, and bias reviews listed in TODO.md.

## Run the tests
```bash
node core/tests/run-tests.js
node core/tests/guardian-tests.js
```
33 tests in total, all passing at the time of writing: 18 covering
triage, escalation, redaction, summarisation, retrieval, consent,
and evaluation, plus 15 covering the guardian (blocks on PHI leak
and escalation gap, passes clean, flags injection), the developer
report, remediation (safe fix applied, high-risk fix requires
approval, re-guard after safe fix), the deployment gate (no deploy
when blocked, deploy when clean, deploy after safe fix), and the
own-agent framework (tool trace, injection escalation, guardian /
remediation agent instances). They must all pass before considering
any change done — and the guardian itself must pass before any
deployment is considered, per the gate above.

## File list
```
README.md, ARCHITECTURE.md, TODO.md
demo/
  index.html, app.js, style.css
agents/
  triage-agent.md, summarisation-agent.md,
  conversational-agent.md, escalation-governance-agent.md,
  own-agent-framework.md, predeployment-guardian-agent.md,
  remediation-agent.md
prompts/
  triage-prompt.txt, summarisation-prompt.txt,
  conversational-prompt.txt, escalation-prompt.txt
core/
  triage.js, urgency.js, routing.js, summarisation.js, retrieval.js,
  redaction.js, consent.js, escalation.js, audit.js, evaluation.js,
  index.js
  agent.js, tools.js, agents.js
  guardian.js, issue-report.js, remediation.js, predeploy.js
  tests/run-tests.js, tests/guardian-tests.js
salesforce/
  classes/CaseTriageService.cls, CaseSummarisationService.cls,
    ConversationalAgentService.cls, EscalationService.cls,
    AuditLogService.cls, DataCloudUnificationService.cls (stub),
    GovernedIntegrationService.cls (interfaces only), RedactionService.cls,
    PreDeploymentGuardianService.cls, RemediationAgentService.cls,
    OwnAgentService.cls
  lwc/agentConsole/ (html, js, js-meta.xml)
  lwc/caseSummaryPanel/ (html, js, js-meta.xml)
  data-model.md
```

## About the author
Rishi Gullapalli — Salesforce Developer building toward AI Engineering
via Agentforce, Data Cloud, and governed AI agents. GitHub: rishisfdc9-daaku.
This project is a learning/prototype portfolio piece, written in my own
voice, with first-person comments explaining WHY each trust and safety
decision was made.
