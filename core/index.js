/**
 * Agentforce in Healthcare CRM — core orchestration.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * This is the end-to-end flow the demo runs, in one readable place:
 *   redact -> triage -> route -> summarise -> (chat) -> escalate? -> audit
 *
 * WHY orchestration is explicit: when a case goes wrong, the first
 * question is always "which step decided that?" Keeping the pipeline
 * in this order, with an audit entry at each step, means that question
 * has an answer. Nothing here calls a real EHR, benefits, or claims
 * system — those are interfaces in salesforce/classes, not live calls.
 */
(function (global) {
  'use strict';

  function load(name, file) {
    if (typeof require !== 'undefined') { try { return require(file); } catch (e) {} }
    return global[name];
  }

  var Redaction = load('AgentforceRedaction', './redaction');
  var Triage = load('AgentforceTriage', './triage');
  var Summarisation = load('AgentforceSummarisation', './summarisation');
  var Retrieval = load('AgentforceRetrieval', './retrieval');
  var Escalation = load('AgentforceEscalation', './escalation');
  var Consent = load('AgentforceConsent', './consent');
  var Audit = load('AgentforceAudit', './audit');
  var AgentMod = load('AgentforceAgent', './agent');
  var Tools = load('AgentforceTools', './tools');
  var Agents = load('AgentforceAgents', './agents');
  var Guardian = load('AgentforceGuardian', './guardian');
  var IssueReport = load('AgentforceIssueReport', './issue-report');
  var Remediation = load('AgentforceRemediation', './remediation');
  var Predeploy = load('AgentforcePredeploy', './predeploy');

  function processCase(caseInput, auditLog) {
    var audit = auditLog || (Audit && Audit.createAuditLog());
    var redacted = Redaction.redact(caseInput.description || '');
    audit.log('RedactionService', 'PHI redaction applied', redacted.redactions.length ? 'Redacted: ' + redacted.redactions.join(', ') : 'No sensitive patterns found');

    var triage = Triage.triageCase({ subject: caseInput.subject, description: redacted.masked, flaggedEmergency: !!caseInput.flaggedEmergency });
    audit.log('Triage Agent', 'Case triaged', triage.urgencyLabel + ' | ' + triage.category + ' | confidence ' + triage.confidence + '% | queue: ' + triage.queue);

    var summary = Summarisation.summariseCase({ subject: caseInput.subject, description: redacted.masked, history: caseInput.history || [] });
    audit.log('Summarisation Agent', 'Case summary generated', summary.bulletPoints.length + ' key sentences selected (extractive)');

    var escalation = Escalation.shouldEscalate(triage, { memberRequestedHuman: !!caseInput.memberRequestedHuman });
    if (escalation.escalate) audit.log('Escalation & Governance Agent', 'Escalated to human review', escalation.reasons.join('; '));
    else audit.log('Escalation & Governance Agent', 'No escalation needed', 'Confidence above threshold, no sensitive flags');

    var consent = Consent.checkConsent({ memberConsented: true, actionIsHighRisk: triage.urgency === 'P1', humanApproved: !escalation.escalate || !!caseInput.humanApproved, containsPHI: redacted.redactions.length > 0, redactionApplied: true });

    return { redacted: redacted, triage: triage, summary: summary, escalation: escalation, consent: consent, audit: audit };
  }

  // Guarded deployment pipeline (new in the guarded model):
  //   redact -> triage -> summarise -> chat -> escalate -> audit
  //     -> GUARDIAN -> developer report -> REMEDIATION -> re-guard -> GATE
  // processCase() above is intentionally unchanged, so existing demo
  // and tests keep working. runGuardedDeployment() is the deployment
  // path, and it is the only path that can say "deploy allowed".
  function runGuardedDeployment(input) {
    if (Predeploy && Predeploy.runGuardedDeployment) return Predeploy.runGuardedDeployment(input);
    return { deployAllowed: false, deployment: { allowed: false, reason: 'Pre-deployment gate module not loaded.' } };
  }

  var api = { processCase: processCase, runGuardedDeployment: runGuardedDeployment, Redaction: Redaction, Triage: Triage, Summarisation: Summarisation, Retrieval: Retrieval, Escalation: Escalation, Consent: Consent, Audit: Audit, Agent: AgentMod, Tools: Tools, Agents: Agents, Guardian: Guardian, IssueReport: IssueReport, Remediation: Remediation, Predeploy: Predeploy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
