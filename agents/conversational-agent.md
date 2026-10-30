# Conversational Agent — Agentforce in Healthcare CRM

Author: Rishi Gullapalli (rishisfdc9-daaku)
Status: Design + working demo logic in `../core/retrieval.js`. Not deployed.

## Purpose
Answer member questions from an approved knowledge base, with citations, in
plain language — and know when to stop. The most important sentence this
agent can say is "I don't know — escalating to a human." A support bot that
guesses about benefits, claims, or care is not helpful; it is a liability.

## Inputs
- Member question (free text, fictional in demo)
- Mock knowledge base: KB-101 to KB-106 (benefits, claims, appointments,
  referrals, prescriptions, care coordination)
- Case context: urgency and category from the Triage Agent

## Outputs
- Answer in plain language
- Citations: article ID + title for every source used (e.g. KB-101)
- Confidence score
- `escalated` flag when no article matches well

## Guardrails
- Retrieval threshold: an article must score at or above the threshold to
  be cited. Below it, the agent escalates instead of answering.
- No medical advice: answers cover benefits, claims, scheduling, and
  process questions only. Symptom or treatment questions escalate to a
  human / direct the member to emergency services or their clinician.
- No invented policy numbers, amounts, or deadlines: if the article does
  not state an amount, the answer says "depends on your plan — ask a human
  to confirm" rather than inventing one.
- P1 cases never get a bot-only chat answer; they escalate immediately.
- No links, no self-promotion, no PHI in answers.

## Confidence thresholds
- Match score ≥ threshold (10 in demo logic): answer with citations.
- Below threshold: "I don't know" fallback + human escalation.
- P1 / sensitive: escalate regardless of match score.

## Failure modes
| Failure | Mitigation |
|---|---|
| Hallucinated policy answer | Retrieval-only answers + citation requirement + fallback |
| Confident answer from a weak match | Threshold + confidence shown to the member/agent |
| Member in crisis gets a generic answer | Triage P1 check runs before chat; crisis language escalates |
| Outdated article cited | Articles carry IDs so updates are traceable; production needs article ownership + review dates |
| Member trusts bot over clinician | Disclaimer + escalation wording + human handoff in every fallback |

## What I would change before production
Connect to real Salesforce Knowledge with Agentforce, add article freshness
checks, conversation context (with consent), and a human takeover button
that preserves the full chat transcript in the Case.
