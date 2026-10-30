# Own Agent Framework — Agentforce in Healthcare CRM

Author: Rishi Gullapalli (rishisfdc9-daaku)
Status: Working code in `../core/agent.js`, `../core/tools.js`, and
`../core/agents.js`. Not deployed. Fictional prototype only.

## Why I built my own agent, instead of only configuring a platform agent

Salesforce Agentforce is a strong platform, and in a real org I would
use it — for managed agents, Prompt Builder, Data Cloud, and the Trust
Layer. But a platform configuration is not, by itself, proof that I
understand how an agent works, and it is hard to test in isolation:
its planning, tool selection, and guardrails live behind settings and
service calls.

So I built the agent itself, by hand, in this codebase:

- An `Agent` class (`core/agent.js`) with a goal, instructions, tools,
  memory, a visible plan, reasoning steps, guardrails, a confidence
  score, and human escalation.
- Tools (`core/tools.js`) as named, testable functions the agent calls
  — triage, summarisation, retrieval, redaction, escalation, audit,
  guardian checks, and remediation. The agent never does work "in its
  head"; it calls a tool, and the trace shows the call and the result.
- Agent instances (`core/agents.js`): triage, conversational,
  summarisation, guardian, and remediation agents, all built from the
  same class, each with its own instructions, tools, and guardrails.

Salesforce Apex/LWC in this project is now an integration layer: it
outlines how a real org would call this own-agent logic, record its
issues, and gate a deployment. The agent is not "just an Agentforce
configuration" — the reasoning, planning, tool orchestration, and
guardrails are code here, and they run in the browser demo and in Node
tests without any platform service.

## How it plans and acts

1. **Input guardrails first.** Injection language, and any input that
   fails a guardrail, stops the agent before any tool runs. It escalates,
   with the reason in the trace.
2. **Plan, visibly.** The plan is a fixed, auditable list of tool
   steps for the task type (triage, chat, guard, remediate). No hidden
   planner, no model call to explain later.
3. **Act, tool by tool.** Each step logs a reasoning sentence, calls
   the tool, and records the result and confidence in memory.
4. **Output guardrails on every result.** A tool result that leaks PHI,
   invents a diagnosis or dosage, or drops a required citation is
   rejected, not accepted.
5. **Confidence as a gate.** Below 70%, or for any high-risk result
   that requires human review, the agent escalates instead of
   proceeding. The trace says exactly which step escalated and why.
6. **Memory, in session only.** The agent remembers steps in the
   current run (capped at 50 entries) so a reviewer can follow the
   whole chain. Nothing is persisted to a real system in this demo.

## How it is guarded

- Guardrails run before planning and after every tool call.
- High-risk tools are marked `risk: 'high'` in `core/tools.js`, so the
  runtime knows to require human review for their results.
- The Pre-Deployment Guardian (`core/guardian.js`) is itself run by a
  guardian agent instance, and the Remediation Agent is another
  instance — the same framework guards and fixes itself, with the same
  trace, instead of a separate, untested safety script.
- No agent in this framework can silently auto-deploy a safety-critical
  change. See `agents/remediation-agent.md` and
  `agents/predeployment-guardian-agent.md`.

## How this differs from using only a platform agent

| | Platform agent only | Own agent in this project |
|---|---|---|
| Planning | Service-managed, opaque | Explicit tool list, in code, in tests |
| Tool calls | Configured actions | Named functions in `core/tools.js`, each testable |
| Guardrails | Platform policies (valuable, and used in a real org) | Code guardrails here, plus the same policies in a real org |
| Confidence / escalation | Platform behaviour | 70% threshold, visible in code and trace |
| Testing | Mostly via the platform | Node tests run the exact same code as the demo |
| Portability | Tied to the platform | Logic can be called from Apex, LWC, or any JS host |

In a real org, the right answer is usually both: this own agent logic
for the parts I must own and test, plus Agentforce / Trust Layer /
Data Cloud for managed scale, identity, and platform guardrails. This
project proves the first half, and TODO.md lists the second half as
future integration work — it does not claim the second half is done.

## What this framework deliberately does NOT do

- No live model call, no hidden reasoning, no diagnosis or treatment.
- No silent learning from real member data (there is none here).
- No auto-deployment of clinical or safety-critical changes.
- No claim that it guarantees zero bugs — the guardian catches and
  reports issues, and a human still decides on safety-critical fixes.
