/**
 * Agent tools — the tools my own agents call. By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY tools are separate from agents: an agent should never do the
 * work itself in a hidden way. It plans, it calls a named tool, the
 * tool returns a result with a confidence, and the trace shows both.
 * If a tool is wrong, I fix the tool, not the agent's "personality".
 * Every tool here wraps a real module in core/ — no tool invents a
 * result, and high-risk tools are marked as such so the agent runtime
 * (core/agent.js) knows to require human review.
 *
 * Fictional prototype only. No real patient data.
 */
(function (global) {
  'use strict';

  function load(name, file) {
    if (typeof require !== 'undefined') { try { return require(file); } catch (e) {} }
    return global[name];
  }
  function get(mod, name) {
    var m = load(name, mod);
    return m;
  }

  function tools() {
    var Redaction = get('./redaction', 'AgentforceRedaction');
    var Triage = get('./triage', 'AgentforceTriage');
    var Summarisation = get('./summarisation', 'AgentforceSummarisation');
    var Retrieval = get('./retrieval', 'AgentforceRetrieval');
    var Escalation = get('./escalation', 'AgentforceEscalation');
    var Consent = get('./consent', 'AgentforceConsent');
    var Audit = get('./audit', 'AgentforceAudit');

    // Lazy getters for guardian/remediation, so tools.js does not
    // create a circular require at load time in Node.
    function guardian() { return get('./guardian', 'AgentforceGuardian'); }
    function remediation() { return get('./remediation', 'AgentforceRemediation'); }

    return [
      {
        name: 'redact',
        description: 'Mask phone, SSN-like, email and member-ID patterns before any other work.',
        risk: 'low',
        run: function (task) {
          var text = task.text || task.description || task.question || '';
          var r = Redaction.redact(text);
          return { masked: r.masked, redactions: r.redactions, confidence: 100 };
        }
      },
      {
        name: 'triage',
        description: 'Classify urgency, category, confidence, queue and SLA for a redacted case.',
        risk: 'high',
        run: function (task, results) {
          var masked = (results.redact && results.redact.masked) || task.text || task.description || '';
          var t = Triage.triageCase({ subject: task.subject, description: masked, flaggedEmergency: !!task.flaggedEmergency });
          return { triage: t, confidence: t.confidence, requiresHumanReview: t.requiresHumanReview };
        }
      },
      {
        name: 'summarise',
        description: 'Build an extractive summary that only reuses source sentences.',
        risk: 'low',
        run: function (task, results) {
          var masked = (results.redact && results.redact.masked) || task.description || '';
          var s = Summarisation.summariseCase({ subject: task.subject, description: masked, history: task.history || [] });
          return { summary: s, confidence: 85 };
        }
      },
      {
        name: 'answer-from-knowledge',
        description: 'Answer from the mock knowledge base with citations, or escalate if nothing matches.',
        risk: 'low',
        run: function (task) {
          var a = Retrieval.answerQuestion(task.question || task.text || '');
          return { answer: a, confidence: a.confidence, citations: a.citations, escalated: a.escalated };
        }
      },
      {
        name: 'escalate-check',
        description: 'Check every escalation trigger and decide whether a human must take over.',
        risk: 'low',
        run: function (task, results) {
          var triageResult = (results.triage && results.triage.triage) || null;
          var chatEscalated = results['answer-from-knowledge'] && results['answer-from-knowledge'].escalated;
          var e = Escalation.shouldEscalate(triageResult, { memberRequestedHuman: !!task.memberRequestedHuman, chatFallback: !!chatEscalated });
          return { escalation: e, confidence: 100, requiresHumanReview: e.escalate };
        }
      },
      {
        name: 'consent-check',
        description: 'Fail-closed consent check: unclear consent or unapproved high-risk action is not allowed.',
        risk: 'high',
        run: function (task, results) {
          var triageResult = (results.triage && results.triage.triage) || null;
          var c = Consent.checkConsent({
            memberConsented: task.memberConsented !== false,
            actionIsHighRisk: triageResult ? triageResult.urgency === 'P1' : false,
            humanApproved: !!task.humanApproved,
            containsPHI: !!(results.redact && results.redact.redactions.length),
            redactionApplied: true
          });
          return { consent: c, confidence: 100, requiresHumanReview: !c.allowed };
        }
      },
      {
        name: 'audit-log',
        description: 'Append an audit entry for a decision, with actor, action and detail.',
        risk: 'low',
        run: function (task, results, agent) {
          var audit = task.audit || (Audit && Audit.createAuditLog());
          audit.log(agent ? agent.name : 'Agent', 'Tool run recorded', JSON.stringify(Object.keys(results)));
          return { audit: audit, confidence: 100 };
        }
      },
      {
        name: 'run-guardian-checks',
        description: 'Run the full pre-deployment guardian check suite and return issues and a deployment verdict.',
        risk: 'low',
        run: function (task) {
          var G = guardian();
          if (!G) return { guardian: null, confidence: 0 };
          var result = G.runGuardian(task.guardianInput || {});
          return { guardian: result, confidence: result.blocked ? 0 : 95, requiresHumanReview: result.blocked };
        }
      },
      {
        name: 'build-remediation-plan',
        description: 'Turn guardian issues into a remediation plan: safe auto-fixes plus approval-required patches.',
        risk: 'low',
        run: function (task) {
          var R = remediation();
          if (!R) return { plan: null, confidence: 0 };
          var plan = R.buildRemediationPlan(task.issues || []);
          return { plan: plan, confidence: 90 };
        }
      },
      {
        name: 'apply-safe-fixes',
        description: 'Apply only safe, low-risk fixes automatically; high-risk fixes stay pending until a human approves.',
        risk: 'low',
        run: function (task) {
          var R = remediation();
          if (!R) return { applied: [], confidence: 0 };
          var out = R.applySafeFixes(task.plan, task.approvals || {});
          return { applied: out.applied, pending: out.pending, confidence: 90 };
        }
      }
    ];
  }

  function toolByName(name) {
    var list = tools();
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  }

  var api = { tools: tools, toolByName: toolByName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceTools = api;
})(typeof window !== 'undefined' ? window : globalThis);
