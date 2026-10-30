# Triage Agent — Agentforce in Healthcare CRM

Author: Rishi Gullapalli (rishisfdc9-daaku)
Status: Design + working demo logic in `../core/triage.js` and `../core/urgency.js`. Not deployed.

## Purpose
Read a new member support case and decide, transparently: how urgent is it for
support routing, what is it about, which queue should own it, and how confident
are we? I designed this agent to be the front door, not the decision-maker of
last resort — its job is to get the right case to the right human fast, and to
admit uncertainty loudly.

This is support triage only. It does not diagnose, does not recommend
treatment, and never replaces emergency services or a clinician.

## Inputs
- Case Subject and Description (free text, fictional in the demo)
- Optional flags: caller flagged emergency, member requested a human
- Redacted text from RedactionService (PHI masked before triage, not after)

## Outputs
- Urgency: P1 Critical / P2 High / P3 Medium / P4 Low, with SLA target
  (P1: 15 min, P2: 60 min, P3: 8 hours, P4: 24 hours — support response targets)
- Category: Benefits, Claims, Appointment, Care Coordination, General Enquiry
- Confidence score (0–100) + the keywords/reasons that drove the decision
- Routing queue + routing reason
- `requiresHumanReview` boolean

## Guardrails
- P1 safety keywords (chest pain, difficulty breathing, self-harm, overdose,
  and similar) always force P1 + human clinical escalation, no matter what
  else the message says.
- Confidence below 70% forces human review. The agent never silently acts on
  a guess it is not confident about.
- Sensitive topics (mental health, self-harm, abuse, serious illness hints)
  force human review even at high confidence.
- No PHI in the triage output beyond the masked case text.
- Every decision is written to the audit trail with agent name, confidence,
  and timestamp.

## Confidence thresholds
- ≥ 70%: agent routing may proceed, human still reviews P1/sensitive cases.
- < 70%: human review queue, agent routing is a suggestion only.
- No signal at all (very short/vague case): confidence drops toward 30–40%,
  which correctly escalates rather than misclassifying.

## Failure modes — and what I do about them
| Failure | Mitigation |
|---|---|
| Under-triage of a real emergency | Conservative P1 keyword list + emergency flag override + human escalation |
| Over-triage flooding humans | Category + confidence scoring keeps routine cases in bot-assisted queues |
| Vague case misclassified | Low confidence → human review, not a confident wrong queue |
| Keyword gaming / ambiguous language | Human override control; audit shows exact keywords so a supervisor can spot it |
| Bias across member groups | Evaluation bias check in `core/evaluation.js`: same content, different names must not change urgency |
| Model drift over time | Labelled fictional eval set + accuracy reporting before any change ships |

## What I would change before production
Replace keyword scoring with a governed Agentforce model, but keep the same
contract: urgency, category, confidence, reasons, and the 70% human-review
threshold must remain visible and auditable. A more powerful model must not
mean a less explainable decision.
