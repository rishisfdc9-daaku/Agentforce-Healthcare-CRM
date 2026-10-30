/* Support Agent Console — demo wiring. By Rishi Gullapalli (rishisfdc9-daaku).
 * All data here is fictional. The logic comes from ../core/ — this file
 * only wires the page to it, so the demo and the tests exercise the same code. */
(function () {
  'use strict';

  var EXAMPLES = [
    { name: 'Claim denied (P3 / Claims)', subject: 'Claim denied for recent visit', description: 'My claim was denied last week and I received a bill for the visit. I need help understanding the denial reason. You can reach me at 555-123-4567. Member ID MEM-123456.' },
    { name: 'Chest pain — possible emergency (P1)', subject: 'Severe chest pain', description: 'I have severe chest pain and difficulty breathing since this morning. I am worried and need help right away.' },
    { name: 'Medication ran out (P2)', subject: 'Insulin prescription denied', description: 'My insulin prescription was denied and my medication ran out yesterday. I need an urgent refill and help with prior authorization.' },
    { name: 'Reschedule appointment (P3)', subject: 'Reschedule appointment', description: 'I need to reschedule my appointment with my doctor next week because of transportation problems. Can a care coordinator help?' },
    { name: 'Benefits question (P4 / Benefits)', subject: 'Is this covered?', description: 'Is a specialist visit covered under my benefits plan and what is my copay for an in-network provider?' },
    { name: 'Vague message — low confidence', subject: 'Help', description: 'Help.' }
  ];

  var audit = AgentforceAudit.createAuditLog();
  var lastResult = null;
  var lastGuarded = null;

  function renderGuard(out) {
    if (!out) return;
    var g = out.guardian, rg = out.reGuard;
    function issueHtml(list) {
      if (!list.length) return '<p>No issues found in this run.</p>';
      return '<ul>' + list.map(function (i) {
        return '<li><strong>[' + esc(i.severity) + '] ' + esc(i.name) + '</strong> (' + esc(i.id) + ')<br>Location: ' + esc(i.location) + '<br>Evidence: ' + esc(i.evidence) + '<br>Suggested fix: ' + esc(i.suggestion) + '</li>';
      }).join('') + '</ul>';
    }
    var patchHtml = '';
    if (out.remediationPlan && out.remediationPlan.patches.length) {
      patchHtml = '<h4>Remediation plan</h4><ul>' + out.remediationPlan.patches.map(function (p) {
        return '<li><strong>' + esc(p.title) + '</strong> — ' + esc(p.fixKind) + ', risk: ' + esc(p.risk) + ', applied/authorised: ' + (p.applied ? 'Yes' : 'No') + (p.approvedBy ? ' (approved by ' + esc(p.approvedBy) + ')' : '') + '</li>';
      }).join('') + '</ul>';
    }
    el('guardResult').innerHTML =
      '<p><strong>Guardian verdict (first run):</strong> ' + esc(g.verdict) + '<br>' +
      'Checks: ' + g.counts.passed + ' passed, ' + g.counts.failed + ' failed (Critical: ' + g.counts.critical + ', High: ' + g.counts.high + ', Medium: ' + g.counts.medium + ', Low: ' + g.counts.low + ')</p>' +
      issueHtml(g.issues) +
      patchHtml +
      '<p><strong>Re-guard verdict:</strong> ' + esc(rg.verdict) + ' (' + rg.counts.failed + ' failed checks)</p>' +
      '<p><strong>Deployment gate:</strong> ' + (out.deployAllowed ? '<span class="badge P4">DEPLOY ALLOWED (model only — no real system was deployed)</span>' : '<span class="badge P1">DEPLOY BLOCKED</span>') +
      (out.deployment.reason ? '<br>' + esc(out.deployment.reason) : '') +
      (out.deployment.record ? '<br>' + esc(out.deployment.record) : '') + '</p>' +
      '<p><em>Steps: ' + esc(out.steps.join(' | ')) + '</em></p>';
    el('devReport').textContent = out.report.text;
  }

  function runGuarded() {
    var faults = [];
    if (el('simPhiLeak').checked) faults.push('phi-leak');
    if (el('simEscGap').checked) faults.push('escalation-gap');
    var approvals = {};
    var approver = el('approverName').value.trim();
    if (approver) {
      // Approving by name applies only to approval-required patches in
      // this run; auto fixes are applied regardless, and a patch that
      // is approved still needs its code change verified by re-guard.
      ['triage-accuracy', 'escalation-coverage', 'consent-fail-closed', 'prompt-injection'].forEach(function (id) { approvals[id] = approver; });
    }
    var input = {
      caseInput: lastResult ? { subject: el('subject').value.trim(), description: el('description').value.trim() } : null,
      caseText: el('description').value.trim(),
      agentOutput: lastResult ? lastResult.summary.summary : '',
      simulateFaults: faults,
      approvals: approvals,
      humanApprovalForMediumLow: el('approveMediumLow').checked ? (approver || 'Human developer (demo)') : null
    };
    var out = AgentforceCore.runGuardedDeployment(input);
    lastGuarded = out;
    audit.log('Pre-Deployment Guardian Agent (own agent)', 'Guardian run', out.guardian.verdict + ' | ' + out.guardian.counts.failed + ' failed checks');
    audit.log('Remediation Agent (own agent)', 'Remediation + re-guard', (out.deployAllowed ? 'Deploy allowed' : 'Deploy blocked') + ' | re-guard: ' + out.reGuard.verdict);
    // Own-agent trace: show the guardian agent's plan/trace if available.
    try {
      var agents = AgentforceAgents.build();
      var trace = [];
      if (agents && agents.guardianAgent) {
        var gr = agents.guardianAgent.run({ type: 'guard', guardianInput: input });
        trace.push('Guardian agent: escalated=' + gr.escalated + ', confidence=' + gr.confidence + '%');
        gr.trace.forEach(function (t) { trace.push('- ' + t.step + ': ' + (t.reasoning || '') + (t.escalated ? ' [escalated]' : '')); });
      }
      if (agents && agents.remediationAgent) {
        var rr = agents.remediationAgent.run({ type: 'remediate', issues: out.guardian.issues });
        trace.push('Remediation agent: escalated=' + rr.escalated + ', confidence=' + rr.confidence + '%');
        rr.trace.forEach(function (t) { trace.push('- ' + t.step + ': ' + (t.reasoning || '')); });
      }
      el('agentTrace').textContent = trace.join('\n') || '—';
    } catch (e) {
      el('agentTrace').textContent = 'Own-agent trace unavailable: ' + e.message;
    }
    renderGuard(out);
    renderAudit();
  }

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function renderAudit() { el('auditLog').textContent = audit.entries().length ? audit.toText() : 'No audit entries yet.'; }

  function renderExamples() {
    el('examples').innerHTML = EXAMPLES.map(function (ex, i) {
      return '<div class="example" data-i="' + i + '"><strong>' + esc(ex.name) + '</strong><br>' + esc(ex.subject) + '</div>';
    }).join('');
    Array.prototype.forEach.call(el('examples').querySelectorAll('.example'), function (node) {
      node.addEventListener('click', function () {
        var ex = EXAMPLES[parseInt(node.getAttribute('data-i'), 10)];
        el('subject').value = ex.subject;
        el('description').value = ex.description;
        audit.log('Human Agent (demo user)', 'Loaded example case', ex.name);
        renderAudit();
      });
    });
  }

  function runTriage() {
    var input = {
      subject: el('subject').value.trim(),
      description: el('description').value.trim(),
      flaggedEmergency: el('flagEmergency').checked,
      memberRequestedHuman: el('requestHuman').checked
    };
    if (!input.description) { alert('Please enter a fictional case description first.'); return; }
    audit.log('Human Agent (demo user)', 'Case submitted', 'Member: ' + el('memberName').value + ' | Subject: ' + input.subject);
    var result = AgentforceCore.processCase(input, audit);
    lastResult = result;
    var t = result.triage;
    var escInfo = result.escalation;
    el('triageResult').innerHTML =
      '<p><span class="badge ' + t.urgency + '">' + esc(t.urgencyLabel) + '</span> ' +
      '<span class="badge" style="background:#0b2545">' + esc(t.category) + '</span></p>' +
      '<p><strong>Confidence:</strong> ' + t.confidence + '% ' + (t.confidence < 70 ? '(below 70% — human review required)' : '(above threshold)') + '<br>' +
      '<strong>Routing queue:</strong> ' + esc(t.queue) + '<br>' +
      '<strong>SLA target:</strong> ' + t.slaMinutes + ' minutes<br>' +
      '<strong>Human review required:</strong> ' + (t.requiresHumanReview ? 'Yes' : 'No') + '</p>' +
      '<p><strong>Why this decision?</strong><br>' + t.reasons.map(function (r) { return '<span class="pill">' + esc(r) + '</span>'; }).join(' ') + '</p>' +
      '<p><strong>Escalation:</strong> ' + (escInfo.escalate ? 'YES — escalated to human review: ' + esc(escInfo.reasons.join('; ')) : 'No — agent can proceed, human review not triggered.') + '</p>' +
      '<p><em>Model/agent: Triage Agent (transparent keyword + urgency scoring, demo version). No diagnosis is made — urgency here is support-routing urgency only.</em></p>';
    el('summaryResult').innerHTML = '<p>' + esc(result.summary.summary) + '</p><p><em>' + esc(result.summary.note || '') + '</em></p>';
    renderRedaction(result);
  }

  function renderRedaction(result) {
    if (!result) return;
    var showMasked = el('showMasked').checked;
    var text = showMasked ? result.redacted.masked : el('description').value;
    el('redactionResult').innerHTML = '<p>' + esc(text) + '</p><p><strong>Redactions applied:</strong> ' +
      (result.redacted.redactions.length ? esc(result.redacted.redactions.join(', ')) : 'None') + '</p>';
  }

  function askChat() {
    var q = el('chatInput').value.trim();
    if (!q) return;
    var chat = el('chat');
    chat.innerHTML += '<div class="msg user"><b>You (fictional member)</b>' + esc(q) + '</div>';
    audit.log('Human Agent (demo user)', 'Member asked conversational agent', q);
    var ans = AgentforceRetrieval.answerQuestion(q);
    var cites = ans.citations.map(function (c) { return '<span class="cite">' + esc(c.id) + ' — ' + esc(c.title) + '</span>'; }).join('<br>');
    chat.innerHTML += '<div class="msg"><b>Support Agent' + (ans.escalated ? ' (escalating)' : '') + '</b>' + esc(ans.answer) +
      (cites ? '<br>' + cites : '') + '<br><em>Confidence: ' + ans.confidence + '%</em></div>';
    audit.log('Conversational Agent', ans.escalated ? 'Could not answer — escalated to human' : 'Answered from knowledge base',
      ans.citations.map(function (c) { return c.id; }).join(', ') || 'No article matched');
    if (ans.escalated) audit.log('Escalation & Governance Agent', 'Escalated to human review', 'Conversational agent could not answer from knowledge base');
    el('chatInput').value = '';
    chat.scrollTop = chat.scrollHeight;
    renderAudit();
  }

  el('guardBtn').addEventListener('click', runGuarded);
  el('remediateBtn').addEventListener('click', runGuarded);
  el('downloadReportBtn').addEventListener('click', function () {
    if (!lastGuarded) { alert('Run the pre-deployment guard first, then download the report.'); return; }
    var blob = new Blob([lastGuarded.report.text], { type: 'text/markdown' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'agentforce-healthcare-developer-report.md'; a.click();
  });

  el('triageBtn').addEventListener('click', function () { runTriage(); renderAudit(); });
  el('clearBtn').addEventListener('click', function () { audit.clear(); lastResult = null; lastGuarded = null; el('triageResult').innerHTML = '<p>No case triaged yet.</p>'; el('summaryResult').innerHTML = '<p>—</p>'; el('redactionResult').innerHTML = '<p>—</p>'; el('chat').innerHTML = ''; el('guardResult').innerHTML = '<p>No guard run yet.</p>'; el('devReport').textContent = '—'; el('agentTrace').textContent = '—'; renderAudit(); });
  el('showMasked').addEventListener('change', function () { renderRedaction(lastResult); });
  el('askBtn').addEventListener('click', askChat);
  el('chatInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') askChat(); });
  el('escalateBtn').addEventListener('click', function () {
    audit.log('Human Agent (demo user)', 'Manual escalation to human', 'Member/agent requested human review');
    el('chat').innerHTML += '<div class="msg"><b>System</b>Escalated to a human agent. A human will review this case — please do not share sensitive information here.</div>';
    renderAudit();
  });
  el('overrideBtn').addEventListener('click', function () {
    if (!lastResult) { alert('Run triage first, then apply an override.'); return; }
    var o = AgentforceEscalation.applyHumanOverride(lastResult.triage, {
      urgency: el('overrideUrgency').value || undefined,
      queue: el('overrideQueue').value.trim() || undefined,
      by: 'Human Agent (demo user)',
      reason: el('overrideReason').value.trim() || 'Human judgement'
    });
    audit.log('Human Agent (demo user)', 'Human override applied', 'Urgency: ' + o.urgency + ' | Queue: ' + o.queue + ' | Reason: ' + o.overrideReason);
    el('triageResult').innerHTML += '<p><strong>Human override:</strong> urgency ' + esc(o.urgency) + ', queue ' + esc(o.queue) + ' — ' + esc(o.overrideReason) + ' (by ' + esc(o.overriddenBy) + ')</p>';
    renderAudit();
  });
  el('downloadAuditBtn').addEventListener('click', function () {
    var blob = new Blob([audit.toText()], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'agentforce-healthcare-audit.txt'; a.click();
  });

  renderExamples();
  renderAudit();
})();
