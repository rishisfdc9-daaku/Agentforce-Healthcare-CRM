# Escalation & Governance Agent — Agentforce in Healthcare CRM

Author: Rishi Gullapalli (rishisfdc9-daaku)
Status: Design + working demo logic in `../core/escalation.js`,
`../core/consent.js`, and `../core/audit.js`. Not deployed.

## Purpose
Decide when a human must take over, make sure that handoff actually happens,
and keep a record anyone can audit. I think of this agent as the conscience
of the system: the other agents try to help, this one makes sure they do not
overreach. Trust in healthcare AI comes less from clever answers and more
from visible limits — and this agent is where those limits live.

## Inputs
- Triage result (urgency, confidence, sensitive flag, human-review flag)
- Conversational result (answered vs fallback)
- Member request for a human
- Consent check result (consent recorded? human approval for high-risk action?)
- Human override requests

## Outputs
- Escalate: yes/no + reasons (every reason listed, not just the first)
- Target queue (Human Review Queue or Clinical Escalation)
- Human override record: who overrode, what changed, why, when
- Audit entries for every escalation and override

## Guardrails — escalation triggers (any one is enough)
1. P1 Critical urgency
2. Confidence below 70%
3. Sensitive topic detected
4. Triage flagged human review
5. Member requested a human
6. Conversational agent could not answer from the knowledge base
7. High-risk action without human approval
8. Consent unclear or PHI present without redaction

This list is deliberately overlapping. Redundancy here is a feature: if one
check misses a risk, another should catch it.

## Confidence thresholds
- Single threshold, visible everywhere: 70%. I chose 70% over a lower bar
  because support mistakes in healthcare cost more than an extra human
  review. The threshold is a constant (`CONFIDENCE_THRESHOLD`), not buried
  in model code, so a governance reviewer can find and challenge it.

## Consent and human-in-the-loop
- Consent checks fail closed: unclear consent = do not proceed, ask a human.
- High-risk actions (anything affecting care access, medication, or
  benefits decisions) require recorded human approval.
- Human override is a first-class action, not an admin backdoor: overrides
  are logged with the same detail as agent decisions.

## Failure modes
| Failure | Mitigation |
|---|---|
| Escalation lost / queue ignored | Audit entry at escalation time + SLA target on the case; production needs queue monitoring + alerts |
| Human rubber-stamps agent errors | Override requires a reason; audit makes rubber-stamping visible over time |
| Governance rules drift silently | Thresholds and triggers are constants/docs, reviewed in change control, covered by tests |
| Audit log tampered with | Append-only design intent; production: Salesforce audit object with restricted edit access |
| Bias in who gets escalated | Evaluation bias checks + regular review of escalation rates by queue/category |

## What I would change before production
Add Einstein Trust Layer policies, Data Cloud consent records, real human
review queues with SLAs and alerts, and a governance review cadence:
monthly review of escalation rates, override reasons, and eval results.
No governance rule should change without a recorded decision and a test.
