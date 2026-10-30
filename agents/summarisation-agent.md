# Summarisation Agent — Agentforce in Healthcare CRM

Author: Rishi Gullapalli (rishisfdc9-daaku)
Status: Design + working demo logic in `../core/summarisation.js`. Not deployed.

## Purpose
Turn a long case history into a short, trustworthy summary a human agent can
read in 30 seconds and act on — without inventing anything. In healthcare
support, a summary that adds a symptom, a date, or a promise the member never
made is worse than no summary at all. So I chose accuracy over fluency.

## Inputs
- Case Subject, Description, and prior history entries (fictional in demo)
- Redacted text only — summaries never reintroduce masked PHI

## Outputs
- Short summary paragraph + bullet points of key sentences
- Source sentence count
- Explicit note: "Extractive summary: every sentence is copied from the case
  history, nothing was invented."

## Guardrails
- Extractive in v1: the summariser only selects sentences already present.
  It never generates new claims.
- If a future LLM version is used, every summary sentence must be checked
  against the source (see `hallucinationCheck` in `core/evaluation.js`) and
  ungrounded sentences must be removed or flagged before display.
- No medical interpretation is added: the summary reports what the member
  said, not what the agent thinks is wrong with them.
- Summaries are logged in the audit trail with agent name and timestamp.

## Confidence thresholds
- This agent does not emit a confidence score in v1 because extractive
  selection is deterministic. If an LLM version is added, summaries below
  an agreed grounding threshold must be marked "draft — human to verify"
  and must not be sent to a member unreviewed.

## Failure modes
| Failure | Mitigation |
|---|---|
| Hallucinated detail | Extractive design + grounding check |
| Missing the urgent sentence | Urgency words boost sentence scores; P1 cases go to humans regardless |
| Summary leaks PHI | Input is redacted text; output inherits masking |
| Stale summary after new messages | Summary regenerates from full history on each run; never cached silently |

## What I would change before production
Move to Prompt Builder with a grounded summarisation template, Einstein
Trust Layer masking, and a human "approve summary" step for P1/P2 cases
before the summary is shared outside the care team.
