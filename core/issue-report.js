/**
 * Developer Issue Report — Agentforce in Healthcare CRM.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY this is a separate module: a guardian that finds problems but
 * does not tell the developer clearly — what failed, why it matters
 * for healthcare safety, what to fix, who owns it — is just a red
 * light. This turns guardian findings into a report a developer can
 * act on in one sitting, in plain language, with the evidence attached.
 *
 * No email or SMS is sent to any real person. The report is generated
 * locally, shown in the demo, and downloadable as text/markdown. In a
 * real org, this is where a Task / notification to the owning developer
 * would be created — that wiring is in the Salesforce scaffolding, not
 * in this demo.
 */
(function (global) {
  'use strict';

  function buildReport(guardianResult, context) {
    context = context || {};
    guardianResult = guardianResult || { issues: [], counts: {}, verdict: 'Unknown', runAt: new Date().toISOString() };
    var issues = guardianResult.issues || [];
    var lines = [];
    lines.push('# Pre-Deployment Guardian — Developer Issue Report');
    lines.push('');
    lines.push('Project: Agentforce in Healthcare CRM — AI Agents for Case Triage and Support');
    lines.push('Author: Rishi Gullapalli (rishisfdc9-daaku)');
    lines.push('Run at: ' + (guardianResult.runAt || ''));
    lines.push('Verdict: ' + (guardianResult.verdict || ''));
    lines.push('Checks: ' + (guardianResult.counts.passed || 0) + ' passed, ' + (guardianResult.counts.failed || 0) + ' failed (Critical: ' + (guardianResult.counts.critical || 0) + ', High: ' + (guardianResult.counts.high || 0) + ', Medium: ' + (guardianResult.counts.medium || 0) + ', Low: ' + (guardianResult.counts.low || 0) + ')');
    if (context.caseSubject) lines.push('Case checked: ' + context.caseSubject);
    if (guardianResult.simulateFaults && guardianResult.simulateFaults.length) {
      lines.push('NOTE: This run included SIMULATED faults for testing the guard: ' + guardianResult.simulateFaults.join(', ') + '. Simulated faults are labelled, not real production failures.');
    }
    lines.push('');
    if (issues.length === 0) {
      lines.push('## No issues found');
      lines.push('');
      lines.push('The guardian checks passed. Deployment may proceed through the gate, subject to human approval for any Medium/Low items (none in this run) and the usual change control in TODO.md.');
    } else {
      lines.push('## Issues — what failed, why it matters, and what to fix');
      lines.push('');
      issues.forEach(function (iss, i) {
        lines.push('### ' + (i + 1) + '. [' + iss.severity + '] ' + iss.name + ' (' + iss.id + ')');
        lines.push('- Location: ' + iss.location);
        lines.push('- Evidence: ' + iss.evidence);
        lines.push('- Why it matters for healthcare safety: ' + whyItMatters(iss));
        lines.push('- Suggested fix: ' + iss.suggestion);
        lines.push('- Owner: ' + (iss.owner || 'Developer (Rishi Gullapalli)'));
        lines.push('- Status: ' + (iss.fixed ? 'Fixed' : 'Open — deployment is ' + (guardianResult.blocked ? 'BLOCKED' : 'not blocked by this issue alone') + ' until this is fixed or approved.'));
        lines.push('');
      });
    }
    lines.push('## Deployment guidance');
    lines.push(guardianResult.blocked
      ? 'DO NOT DEPLOY. Fix the Critical/High issues above, run the remediation agent, and re-run the guardian. A human approval alone does not override a Critical/High issue in this gate.'
      : 'Deployment may proceed through the gate once a human developer has recorded approval for any Medium/Low issues and the re-guard has passed. Keep this report with the release record.');
    lines.push('');
    lines.push('Disclaimer: fictional prototype, not medical advice, not a real healthcare system. This report does not guarantee zero bugs — it records what was checked, what failed, and what was fixed in this run.');
    var text = lines.join('\n');
    return { text: text, markdown: text, issueCount: issues.length, blocked: !!guardianResult.blocked, verdict: guardianResult.verdict || '' };
  }

  function whyItMatters(iss) {
    if (/phi|redaction/i.test(iss.id + ' ' + iss.name)) return 'A PHI leak breaks patient trust and can breach privacy rules. Even one leaked phone or member ID in an agent output is a safety and compliance failure, not a cosmetic bug.';
    if (/escalation|triage/i.test(iss.id + ' ' + iss.name)) return 'Triage and escalation decide who gets help first. A missed escalation can delay care for someone urgent; a wrong triage can send a critical case to a routine queue.';
    if (/consent/i.test(iss.id + ' ' + iss.name)) return 'Consent protects members from actions taken on their behalf without a clear basis. Failing open here means the system acts without permission.';
    if (/citation|hallucination/i.test(iss.id)) return 'An answer without a citation, or a summary that invents facts, can mislead a member about benefits, claims, or care. In healthcare, a confident wrong answer is the worst failure.';
    if (/audit/i.test(iss.id + ' ' + iss.name)) return 'Without a complete audit trail, a decision cannot be explained, reviewed, or learned from. Accountability depends on the record being complete.';
    if (/injection/i.test(iss.id + ' ' + iss.name)) return 'If pasted text can override the agent, an attacker or a careless copy-paste can make the agent ignore safety rules, hide an escalation, or invent an answer.';
    return 'In healthcare support, a small logic bug can become a wrong queue, a missed escalation, or a misleading answer for a real person. That is why this issue blocks or gates deployment until it is fixed or explicitly approved.';
  }

  var api = { buildReport: buildReport, whyItMatters: whyItMatters };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceIssueReport = api;
})(typeof window !== 'undefined' ? window : globalThis);
