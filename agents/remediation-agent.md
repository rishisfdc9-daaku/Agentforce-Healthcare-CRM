# Remediation Agent — Agentforce in Healthcare CRM

Author: Rishi Gullapalli (rishisfdc9-daaku)
Status: Working code in `../core/remediation.js`, and as an own-agent
instance in `../core/agents.js` (remediation-agent). Not deployed.
Fictional prototype only.

## Purpose

When the Pre-Deployment Guardian finds an issue, this agent builds a
fix for it, deploys that fix agent on the project in the model, and
then proves — by re-running the guardian — whether the fix worked.
That last part matters most to me: a fix that is not re-checked is
just a promise.

## How it decides what it may fix alone

**Safe, low-risk fixes — applied automatically in the model:**
- Re-redacting an agent output (output-only, reversible, no rule change)
- Restoring a missing audit log call (adds logging, changes no decision)
- Falling back to escalation when an answer has no citation (makes the
  agent more conservative, never more confident)
- Adding a guard/fallback for an edge case (safe fallback, never a
  silent decision)

**High-risk / safety-critical fixes — patch proposal only, human
approval required:**
- Correcting a triage rule (changes who is routed where, and how urgently)
- Restoring a missing escalation trigger (changes when a human must
  take over)
- Restoring fail-closed consent (changes when the system may act)
- Hardening input sanitisation / injection handling (changes what
  input the agent will accept)

For a high-risk fix, the remediation agent produces: the issue, the
proposed patch text, the risk, a regression test case, and a pending
status. It does NOT apply it silently, and it does NOT mark the issue
as fixed. A named human developer must approve it (approver name
recorded), and even then, in this model, the re-guard still checks the
simulated fault — because approving a patch is not the same as
actually changing the code. In a real org, the approved patch would be
implemented as a code change, tested, and then the re-guard would run
against the changed code. The demo and tests make that distinction
explicit, so approval is never mistaken for a fix.

## Flow

```
Guardian issues
  -> Remediation plan (auto vs approval-required, per issue)
  -> Apply safe fixes automatically
  -> High-risk patches stay pending until a human approves by name
  -> Re-guard (guardian re-runs, with applied fixes taken into account)
  -> Deployment gate decides from the re-guard:
       no Critical/High remaining (+ Medium/Low approved) = deploy allowed
       otherwise = BLOCKED
```

## Inputs / Outputs

- Inputs: guardian issue list, human approvals `{ issueId: approverName }`
- Outputs: remediation plan, applied list, pending list, and a
  sanitiser function (`sanitiseOutput`) that re-redacts output as real
  code, not just a flag

## Failure modes

| Failure | Mitigation |
|---|---|
| Auto fix makes things worse | Auto fixes are limited to output sanitisation, logging, and conservative fallbacks — they cannot change a routing or consent rule. |
| High-risk fix is rubber-stamped | Approval requires a named approver, recorded in the plan and in the deployment record. Rubber-stamping is visible in the audit, as with human overrides. |
| Fix applied but not verified | The gate decides from the re-guard only. No re-guard pass, no deploy. |
| Remediation agent itself has a bug | Its plan, applied, and pending lists are all plain data, shown in the demo and tested in `core/tests/guardian-tests.js`. |

## What I would change before production

Turn patch proposals into real pull requests with diffs, tests, and
reviewers; run the guardian in CI on the patched code; require two
approvals for any triage, escalation, or consent rule change; and
keep a remediation log per release so a reviewer can see what was
fixed, by whom, and what the re-guard said.
