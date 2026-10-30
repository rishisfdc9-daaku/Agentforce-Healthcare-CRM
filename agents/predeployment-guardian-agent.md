# Pre-Deployment Guardian Agent — Agentforce in Healthcare CRM

Author: Rishi Gullapalli (rishisfdc9-daaku)
Status: Working code in `../core/guardian.js`, `../core/predeploy.js`,
and as an own-agent instance in `../core/agents.js` (guardian-agent).
Not deployed. Fictional prototype only.

## Purpose

Before any deployment takes place, this agent runs everything and
analyses it. If anything comes up on the way, it reads the issue,
writes it down with severity and evidence, and tells the developer —
it does not quietly proceed, and it does not hide a failure behind a
green checkmark.

I think of this agent as the gatekeeper, not a tester who reports to
someone else later. Deployment does not happen until this agent says
the gate is clear, or a human has approved the remaining Medium/Low
issues and the re-guard has passed.

## Inputs

- The current case pipeline result (redacted case, triage, summary,
  escalation, audit) — so the guardian checks real outputs, not only
  unit fixtures
- The agent output to be deployed (for PHI / unsafe-output scans)
- Optional simulated faults (`simulateFaults`) — test/demo aids only,
  labelled as simulated, used to prove the guard actually blocks
- Applied fix IDs from the remediation agent, for the re-guard run

## Outputs

- A structured issue list: id, name, severity (Critical/High/Medium/
  Low), location, evidence, suggested fix, owner
- Check counts: passed / failed, by severity
- A verdict: `BLOCKED — do not deploy` or `ALLOWED — no Critical/High
  issues`
- A developer issue report (see `../core/issue-report.js`)

## Checks — all deterministic, all runnable in Node or browser

1. Triage accuracy on labelled fictional cases (must be >= 60% in this
   model; the exact score is in the evidence so a reviewer can judge it)
2. Escalation coverage: P1, low confidence, sensitive topic, member
   request, and chat fallback must ALL escalate
3. Redaction / PHI leak: no raw phone, SSN-like, email, or member ID
   in redacted samples or in checked agent outputs
4. Prompt-injection / unsafe output: injection language is not
   followed; outputs invent no diagnosis or dosage
5. Consent fail-closed: high-risk action without human approval is
   not allowed
6. Audit completeness: a processed case leaves redaction, triage,
   summary, and escalation audit entries
7. Knowledge citation: answered chat cites; unknown chat escalates
   with no invented citation
8. Hidden-bug hunting: empty, null, vague, very long, and high-risk
   inputs must not throw and must fail safe (escalate / fallback)

## Deployment gate rules

- Any open Critical or High issue = BLOCKED. A human approval alone
  does not override Critical/High in this gate.
- Medium/Low issues alone do not block, but deployment requires a
  named human approval recorded for them.
- If the guardian itself could not run, deployment is blocked.
- After remediation, the guardian re-runs. Deployment is decided from
  the RE-GUARD, not the first run.

## Failure modes

| Failure | Mitigation |
|---|---|
| Guardian passes but a real bug slips through | The guard never claims zero bugs; it lists exactly what it checked. TODO.md adds eval expansion, bias review, and supervised pilot before any real use. |
| Guardian is skipped in a hurry | The deployment path in `core/predeploy.js` is the only path that can say "deploy allowed" in this model, and it always runs the guardian first. |
| Simulated fault is mistaken for a real failure | Simulated faults are labelled `SIMULATED FAULT` in evidence and in the developer report, and a clean run uses no simulated faults. |
| Issue is fixed but re-guard is not run | The gate decides from the re-guard only. A fix without a re-guard does not open the gate. |

## What I would change before production

Wire the guardian into CI (run on every pull request, block merge on
Critical/High), store issues as real objects with owners and SLAs,
notify the owning developer through the org's notification system
(Task / Slack / email via an approved channel — not in this demo),
and expand the eval set with real, governed, consented test cases.
Never let the guardian's thresholds change without change control and
a test, just like the triage threshold.
