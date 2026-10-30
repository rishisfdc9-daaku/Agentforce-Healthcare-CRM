# TODO — Turning This Prototype Into a Real Salesforce Org

Author: Rishi Gullapalli (rishisfdc9-daaku)
Status: Planning checklist only. Nothing below is done, deployed, or live.
Do these in order — governance before integrations, always.

## 0. Guarded deployment — already modelled here, to be wired into CI before any real deployment
- [x] Own agent framework in `core/agent.js`, `core/tools.js`, `core/agents.js` — Agent class, tool registry, and triage / conversational / summarisation / guardian / remediation agent instances, tested in Node and in the demo.
- [x] Pre-deployment guardian in `core/guardian.js` — triage accuracy, escalation coverage, PHI leak, injection, consent fail-closed, audit completeness, citation, and hidden-bug edge cases, with a BLOCKED verdict on any Critical/High issue.
- [x] Developer issue report in `core/issue-report.js` — severity, location, evidence, why it matters, fix, owner; shown in demo section 5 and downloadable as markdown. No real email/SMS sending in this prototype.
- [x] Remediation agent in `core/remediation.js` — safe fixes auto-applied in the model, high-risk fixes as patch proposals requiring a named human approval, never silently auto-deployed.
- [x] Deployment gate in `core/predeploy.js` and demo section 5 — guardian → report → remediation → re-guard → deploy allowed only if no Critical/High remain and Medium/Low are human-approved.
- [x] Salesforce scaffolding: `PreDeploymentGuardianService.cls`, `RemediationAgentService.cls`, `OwnAgentService.cls`.
- [ ] Wire the guardian into CI in a real org: run `node core/tests/run-tests.js` and `node core/tests/guardian-tests.js` on every pull request, block merge on any Critical/High guardian issue, and store guardian issues as real records with owners and SLAs.
- [ ] Turn remediation patch proposals into real pull requests with diffs, tests, and reviewers; require two approvals for triage, escalation, or consent rule changes.
- [ ] Add a developer notification channel through the org's approved system (Task / Slack / email) — do not add real contact details or credentials to this prototype.
- [ ] Expand the guardian eval set with governed, consented test cases, and review guardian thresholds in change control — never change a threshold silently to make a test pass.

## 1. Salesforce org setup
- [ ] Create a Developer Edition / sandbox org (never prototype in production).
- [ ] Add the Apex classes in `salesforce/classes/` with `-meta.xml` files
      and deploy via Salesforce CLI / VS Code. Fix any compile issues
      against real Case fields before going further.
- [ ] Create the custom objects/fields in `salesforce/data-model.md`:
      Care_Plan__c, Audit_Log__c, and Case extensions (Urgency__c,
      Category__c, Triage_Confidence__c, Triage_Reasons__c,
      Routing_Queue__c, Requires_Human_Review__c, Consent_On_File__c).
- [ ] Deploy the LWCs (`agentConsole`, `caseSummaryPanel`) to Case
      record pages and test with fictional data only.
- [ ] Set up Case queues: Clinical Escalation (Human), Human Review
      Queue, Benefits & Coverage, Claims & Billing, Scheduling &
      Appointments, Care Coordination, General Member Support.

## 2. Agentforce setup (platform integration — the own agent in `core/` remains the core)
- [ ] Enable Agentforce / Einstein in the org; confirm licensing.
- [ ] Build the four agents from `agents/*.md` as Agentforce agents,
      keeping the same contracts: urgency, category, confidence,
      reasons, queue, citations, escalation triggers.
- [ ] Keep the own-agent runtime (`core/agent.js`, `core/tools.js`,
      `core/agents.js`) as the testable core, and use Agentforce /
      Trust Layer / Data Cloud for managed scale, identity, and
      platform guardrails — do not replace the own agent with a
      configuration that cannot be tested in isolation.
- [ ] Replace keyword triage with a governed model ONLY after the
      eval set in `core/tests/` is ported and passing — accuracy must
      not drop, and reasons must stay visible.
- [ ] Keep the 70% human-review threshold as a governed constant and
      record any change to it in change control.

## 3. Prompt Builder
- [ ] Create Prompt Builder templates from `prompts/*.txt` (triage,
      summarisation, conversational, escalation).
- [ ] Test each template against the fictional eval cases; check
      grounding (summaries) and citation behaviour (chat) before use.
- [ ] Version templates; never edit a live template without re-running evals.

## 4. Data Cloud
- [ ] Define consented identity resolution rules (see
      DataCloudUnificationService stub contract).
- [ ] Connect ONLY consented sources; verify unified profiles return
      masked display data, never raw identifiers, to agent views.
- [ ] Log every unified-profile access to Audit_Log__c.

## 5. Einstein Trust Layer
- [ ] Enable Trust Layer masking / toxicity / PII policies for all
      agent inputs and outputs.
- [ ] Confirm redaction in Apex + Trust Layer agree (test with the
      same fictional patterns used in `core/tests/`).
- [ ] Set up audit/feedback loop: Trust Layer logs reviewed monthly.

## 6. Human review queues & SLAs
- [ ] Staff the Human Review and Clinical Escalation queues; set SLA
      alerts (P1: 15 min, P2: 60 min, P3: 8 hrs, P4: 24 hrs).
- [ ] Train agents on overrides: every override needs a reason, and
      override patterns are reviewed (rubber-stamping must be visible).
- [ ] Add a "request a human" control members can actually find — not
      buried in a menu.

## 7. Real EHR / benefits / claims integrations
- [ ] Implement ONE interface at a time from GovernedIntegrationService
      (EHR, then benefits, then claims), behind Named Credentials.
- [ ] Each integration: consent check first, audit on every call,
      fail closed to a human on any error. No PHI in logs.
- [ ] Never copy clinical orders/diagnoses into Case free text — keep
      the separation in `data-model.md`.

## 8. Knowledge & content
- [ ] Replace mock KB-101…KB-106 with real, owned Salesforce Knowledge
      articles, each with an owner and review date.
- [ ] Add an article freshness check: stale articles are not cited
      until reviewed.

## 9. Compliance & safety review (before ANY real member use)
- [ ] Privacy/compliance review: HIPAA and organisational policy review
      of data flows, retention, audit access, and redaction.
- [ ] Clinical safety review: confirm no diagnosis/treatment path exists
      and P1 escalation wording directs members to emergency services.
- [ ] Bias & fairness review: run expanded evals (more names, languages,
      phrasings) and review escalation rates by group.
- [ ] Pilot with fictional + internal test cases first, then a small
      supervised pilot with human review of EVERY agent decision.
- [ ] Incident plan: what happens when the agent is wrong, who is
      notified, and how affected members are contacted by a human.

## 10. LinkedIn / portfolio (only after the above is honest)
- [ ] Do NOT claim deployment, live use, or real healthcare results
      until they are true and verifiable.
- [ ] Portfolio write-up may describe this prototype exactly as it is:
      a fictional, working demo + scaffolding, with trust/governance
      design — that is the honest story, and it is a strong one.
