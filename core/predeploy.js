/**
 * Deployment Gate — Agentforce in Healthcare CRM.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * The full guarded flow, in one place:
 *   redact -> triage -> summarise -> chat -> escalate -> audit
 *     -> GUARDIAN (pre-deploy) -> developer report
 *     -> REMEDIATION agent -> re-guard -> DEPLOY GATE
 *
 * Gate rules (deliberately strict, and written down so they can be
 * challenged in review):
 *  - BLOCKED if any Critical or High issue remains unfixed AND
 *    unapproved. A human approval alone does NOT override Critical/High
 *    in this gate — the issue must be fixed and the re-guard must pass
 *    for it, or, for an approval-required patch, the patch must be
 *    approved AND its verification must pass on re-guard.
 *  - Medium/Low issues alone do not block, but deployment requires a
 *    named human approval recorded for them (humanApprovalForMediumLow).
 *  - If the guardian itself could not run, deployment is blocked.
 *
 * In this model, "deploy" means the gate returns deployAllowed=true
 * and a deployment record. It does NOT actually deploy code to
 * Salesforce, GitHub, or any real system — that would be a separate,
 * human-controlled step in a real org (see TODO.md).
 */
(function (global) {
  'use strict';

  function load(name, file) {
    if (typeof require !== 'undefined') { try { return require(file); } catch (e) {} }
    return global[name];
  }

  function runGuardedDeployment(input) {
    input = input || {};
    var Guardian = load('AgentforceGuardian', './guardian');
    var IssueReport = load('AgentforceIssueReport', './issue-report');
    var Remediation = load('AgentforceRemediation', './remediation');
    var Core = load('AgentforceCore', './index');

    var steps = [];
    // Step 1: run the normal case pipeline first (if a case was given),
    // so the guardian checks real outputs, not just unit fixtures.
    var caseResult = null;
    if (input.caseInput && Core && Core.processCase) {
      try {
        caseResult = Core.processCase(input.caseInput);
        steps.push('case-pipeline: processed case via core/index.js');
      } catch (e) {
        steps.push('case-pipeline: FAILED — ' + e.message);
      }
    }

    // Step 2: guardian
    var guardianInput = {
      caseText: input.caseText || (input.caseInput && input.caseInput.description) || '',
      agentOutput: input.agentOutput || '',
      simulateFaults: input.simulateFaults || [],
      appliedFixIds: []
    };
    var guardianResult = Guardian.runGuardian(guardianInput);
    steps.push('guardian: ' + guardianResult.verdict + ' (' + guardianResult.counts.failed + ' failed checks)');

    // Step 3: developer report
    var report = IssueReport.buildReport(guardianResult, { caseSubject: input.caseInput && input.caseInput.subject });
    steps.push('developer-report: built with ' + report.issueCount + ' issue(s)');

    // Step 4: remediation agent
    var plan = Remediation.buildRemediationPlan(guardianResult.issues);
    var applied = Remediation.applySafeFixes(plan, input.approvals || {});
    steps.push('remediation: ' + applied.applied.length + ' fix(es) applied/authorised, ' + applied.pending.length + ' pending approval');

    // Step 5: re-guard, with applied fixes taken into account.
    // For auto fixes, the guardian's concrete verification runs (e.g.
    // phi-leak re-redaction). For approval-required patches, the patch
    // is only counted as resolved if it was approved in this run.
    var fixIds = Remediation.appliedFixIds(plan);
    var reGuard = Guardian.runGuardian({
      caseText: guardianInput.caseText,
      agentOutput: guardianInput.agentOutput,
      simulateFaults: guardianInput.simulateFaults,
      appliedFixIds: fixIds
    });
    steps.push('re-guard: ' + reGuard.verdict + ' (' + reGuard.counts.failed + ' failed checks)');

    // Step 6: gate decision, from the RE-GUARD, not the first run.
    var remainingCriticalHigh = reGuard.issues.filter(function (i) { return i.severity === 'Critical' || i.severity === 'High'; });
    var remainingMediumLow = reGuard.issues.filter(function (i) { return i.severity === 'Medium' || i.severity === 'Low'; });
    var mediumLowApproved = remainingMediumLow.length === 0 || !!input.humanApprovalForMediumLow;
    var deployAllowed = remainingCriticalHigh.length === 0 && mediumLowApproved;
    // Special case: if the first run had no issues at all, the gate is
    // allowed without a separate Medium/Low approval (there is nothing
    // to approve).
    if (guardianResult.issues.length === 0) deployAllowed = true;

    var deployment = deployAllowed
      ? { allowed: true, record: 'Deployment record (model only): guardian passed on re-guard at ' + reGuard.runAt + ', issues resolved: ' + fixIds.join(', ') + (remainingMediumLow.length ? ', Medium/Low approved by: ' + (input.humanApprovalForMediumLow || 'recorded') : '') + '. No real system was deployed by this module.' }
      : { allowed: false, record: null, reason: remainingCriticalHigh.length ? 'Blocked by ' + remainingCriticalHigh.length + ' Critical/High issue(s) remaining after remediation: ' + remainingCriticalHigh.map(function (i) { return i.id; }).join(', ') : 'Blocked: Medium/Low issues require a named human approval before deployment.' };

    return {
      caseResult: caseResult,
      guardian: guardianResult,
      report: report,
      remediationPlan: plan,
      remediationApplied: applied,
      reGuard: reGuard,
      deployment: deployment,
      deployAllowed: deployAllowed,
      steps: steps
    };
  }

  var api = { runGuardedDeployment: runGuardedDeployment };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforcePredeploy = api;
})(typeof window !== 'undefined' ? window : globalThis);
