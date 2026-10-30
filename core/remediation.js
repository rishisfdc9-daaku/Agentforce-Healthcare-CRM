/**
 * Remediation Agent — Agentforce in Healthcare CRM.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY remediation is split into two kinds of fix, and why that split
 * is the whole point: some fixes are safe, reversible, and low-risk —
 * re-redacting an output, restoring a missing audit log call, falling
 * back to escalation when a citation is missing. Those can be applied
 * automatically in this model, and the guardian re-runs to prove it.
 *
 * Other fixes change a safety rule itself — a triage keyword, an
 * escalation trigger, a consent rule, a threshold. Those are NOT
 * applied silently, even if I am in a hurry. They become a patch
 * proposal with a test case, and they need a named human developer
 * to approve them. Only then does the remediation agent mark them
 * as approved, and the gate re-runs the guardian with that patch's
 * test case to verify it. In a real org, "approved patch" means a
 * code change + test run in change control, not a silent override —
 * this model simulates that approval + verification step, and the
 * docs say so plainly.
 *
 * Fictional prototype only. No real patient data, no clinical change
 * is ever auto-deployed by this module.
 */
(function (global) {
  'use strict';

  // Map guardian issue -> remediation patch. fixKind: 'auto' | 'approval-required'
  var PATCHES = {
    'phi-leak': { title: 'Re-redact every agent output before display/storage', fixKind: 'auto', risk: 'Low — reversible, output-only, no rule change', patch: 'Add a final redaction pass on all agent outputs (core/redaction.js redact()) before they are shown or stored, and add the leaked pattern to the redaction tests.' },
    'audit-completeness': { title: 'Restore missing audit log call at each pipeline step', fixKind: 'auto', risk: 'Low — adds logging, changes no decision', patch: 'Re-add audit.log() calls for redaction, triage, summarisation, and escalation in core/index.js, and verify the audit text contains all four entries.' },
    'citation-check': { title: 'Fall back to escalation when an answer has no citation', fixKind: 'auto', risk: 'Low — makes the agent more conservative, never more confident', patch: 'In core/retrieval.js, return escalated=true whenever citations are empty, even if a weak match was found.' },
    'triage-accuracy': { title: 'Correct the triage rule for the failing labelled cases', fixKind: 'approval-required', risk: 'High — changes who is routed where, and how urgently', patch: 'PROPOSAL ONLY: review the failing labelled cases, adjust the keyword/scoring rule in core/triage.js, add each failing case as a regression test, and re-run the guardian. Requires named human approval before deployment.' },
    'escalation-coverage': { title: 'Restore the missing escalation trigger', fixKind: 'approval-required', risk: 'High — changes when a human must take over', patch: 'PROPOSAL ONLY: restore the missing trigger in core/escalation.js (P1 / low confidence / sensitive / member request / chat fallback), add a regression test per trigger, and re-run the guardian. Requires named human approval.' },
    'consent-fail-closed': { title: 'Restore fail-closed consent', fixKind: 'approval-required', risk: 'High — changes when the system may act without approval', patch: 'PROPOSAL ONLY: restore fail-closed consent in core/consent.js so a high-risk action without human approval is not allowed, add a regression test, and re-run the guardian. Requires named human approval.' },
    'prompt-injection': { title: 'Harden input sanitisation and keep the injection guardrail', fixKind: 'approval-required', risk: 'High — changes what input the agent will accept', patch: 'PROPOSAL ONLY: keep the injection guardrail in core/agent.js, sanitise pasted input before any tool runs, and add the injection phrase as a regression test. Requires named human approval; do not weaken the guardrail to make a test pass.' },
    'hidden-bugs-edge-cases': { title: 'Add a guard/fallback for the failing edge case', fixKind: 'auto', risk: 'Low — adds a safe fallback, never a silent decision', patch: 'Add a null/empty/long-input guard that returns a safe fallback and escalates, and add that edge case as a regression test.' }
  };

  function buildRemediationPlan(issues) {
    issues = issues || [];
    var patches = issues.map(function (iss) {
      var p = PATCHES[iss.id] || { title: 'Fix: ' + iss.name, fixKind: 'approval-required', risk: 'Unknown — treat as high-risk until reviewed', patch: iss.suggestion || 'Review and propose a fix, with a regression test.' };
      return {
        issueId: iss.id,
        issueName: iss.name,
        severity: iss.severity,
        title: p.title,
        fixKind: p.fixKind,
        risk: p.risk,
        patch: p.patch,
        suggestion: iss.suggestion,
        applied: false,
        approved: false,
        approvedBy: null
      };
    });
    return { patches: patches, autoCount: patches.filter(function (p) { return p.fixKind === 'auto'; }).length, approvalCount: patches.filter(function (p) { return p.fixKind === 'approval-required'; }).length };
  }

  // approvals: { issueId: approverName } — only approval-required patches
  // listed here, with a named approver, are marked approved. Auto patches
  // are applied regardless. Nothing is applied silently for high-risk.
  function applySafeFixes(plan, approvals) {
    plan = plan || { patches: [] };
    approvals = approvals || {};
    var applied = [];
    var pending = [];
    plan.patches.forEach(function (p) {
      if (p.fixKind === 'auto') {
        p.applied = true;
        applied.push(p);
      } else if (approvals[p.issueId]) {
        p.approved = true;
        p.approvedBy = approvals[p.issueId];
        p.applied = true; // approved patch is now authorised to be deployed with the remediation agent
        applied.push(p);
      } else {
        p.applied = false;
        pending.push(p);
      }
    });
    return { applied: applied, pending: pending, plan: plan };
  }

  function appliedFixIds(plan) {
    if (!plan || !plan.patches) return [];
    return plan.patches.filter(function (p) { return p.applied; }).map(function (p) { return p.issueId; });
  }

  // Sanitisers used by auto fixes, as real code, not just a flag.
  function sanitiseOutput(text) {
    var Redaction;
    if (typeof require !== 'undefined') { try { Redaction = require('./redaction'); } catch (e) {} }
    if (!Redaction) Redaction = global.AgentforceRedaction;
    if (!Redaction) return String(text || '');
    return Redaction.redact(String(text || '')).masked;
  }

  var api = { buildRemediationPlan: buildRemediationPlan, applySafeFixes: applySafeFixes, appliedFixIds: appliedFixIds, sanitiseOutput: sanitiseOutput, PATCHES: PATCHES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceRemediation = api;
})(typeof window !== 'undefined' ? window : globalThis);
