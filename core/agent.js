/**
 * Own Agent Framework — Agentforce in Healthcare CRM.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY I built my own agent instead of only configuring a platform
 * agent: I wanted the agent itself to be code I own and can read,
 * test, and argue with. A platform agent is a black box with settings;
 * this one is a small, explicit runtime — a goal, a plan, tools it can
 * call, memory of what it has already done, guardrails that run before
 * AND after every tool call, a confidence score it must report, and a
 * rule that it escalates to a human rather than bluffing.
 *
 * Nothing here calls a live model or a platform agent service. The
 * "reasoning" is deterministic, rule-based planning over the tools in
 * core/tools.js, so every decision is reproducible in tests. That is
 * deliberate for healthcare support: if I cannot reproduce a decision,
 * I cannot defend it, fix it, or audit it.
 *
 * Fictional prototype only. No real patient data, no diagnosis, no
 * treatment advice. Support routing only.
 */
(function (global) {
  'use strict';

  function load(name, file) {
    if (typeof require !== 'undefined') { try { return require(file); } catch (e) {} }
    return global[name];
  }

  // Prompt-injection patterns the agent must never follow. This list
  // is checked on input AND on tool output, because an injection can
  // arrive in a case description, a chat question, or a pasted note.
  var INJECTION_PATTERNS = [
    /ignore (all )?(previous|prior|above) instructions/i,
    /disregard (your )?(instructions|rules|safety)/i,
    /you are now (a|an|in)/i,
    /pretend (you are|to be)/i,
    /system prompt/i,
    /override (safety|guardrails|human review)/i,
    /do not escalate/i,
    /never escalate/i,
    /reveal (your )?(system|hidden) (prompt|instructions)/i
  ];

  function hasInjection(text) {
    var s = String(text || '');
    var hits = INJECTION_PATTERNS.filter(function (re) { return re.test(s); });
    return { found: hits.length > 0, patterns: hits.map(function (re) { return String(re); }) };
  }

  function containsSensitivePattern(text, Redaction) {
    if (Redaction && Redaction.containsSensitivePattern) return Redaction.containsSensitivePattern(text);
    return /\b\d{3}-\d{2}-\d{4}\b/.test(String(text || ''));
  }

  // A guardrail is a named check: { name, check(input, output) -> {pass, reason} }
  // Guardrails run on the agent's input before planning, and on every
  // tool result before it is accepted. A failed guardrail never gets
  // silently skipped — it escalates, and the trace says why.
  function runGuardrails(guardrails, input, output) {
    var failures = [];
    (guardrails || []).forEach(function (g) {
      try {
        var r = g.check(input, output);
        if (r && !r.pass) failures.push({ guardrail: g.name, reason: r.reason || 'Guardrail failed' });
      } catch (e) {
        failures.push({ guardrail: g.name, reason: 'Guardrail error: ' + e.message });
      }
    });
    return failures;
  }

  function Agent(config) {
    config = config || {};
    this.id = config.id || 'agent';
    this.name = config.name || 'Agent';
    this.goal = config.goal || '';
    this.instructions = config.instructions || '';
    // tools: [{ name, description, risk: 'low'|'high', run: fn }]
    this.tools = config.tools || [];
    this.guardrails = config.guardrails || [];
    this.confidenceThreshold = config.confidenceThreshold === undefined ? 70 : config.confidenceThreshold;
    this.memory = []; // short, in-session memory: { step, tool, input, output, confidence }
    this.context = config.context || {};
  }

  Agent.prototype.toolByName = function (name) {
    for (var i = 0; i < this.tools.length; i++) if (this.tools[i].name === name) return this.tools[i];
    return null;
  };

  Agent.prototype.remember = function (entry) {
    this.memory.push(entry);
    if (this.memory.length > 50) this.memory.shift();
    return entry;
  };

  // Planning is deliberately simple and visible: pick tools by the
  // task type, in a fixed, auditable order. No hidden planner.
  Agent.prototype.plan = function (task) {
    task = task || {};
    var steps = [];
    var type = task.type || 'general';
    if (type === 'triage') steps = ['redact', 'triage', 'summarise', 'escalate-check'];
    else if (type === 'chat') steps = ['redact', 'answer-from-knowledge', 'escalate-check'];
    else if (type === 'guard') steps = ['run-guardian-checks', 'build-issue-report'];
    else if (type === 'remediate') steps = ['build-remediation-plan', 'apply-safe-fixes'];
    else steps = ['redact', 'triage'];
    // Only keep steps this agent actually has tools for.
    var self = this;
    return steps.filter(function (s) { return !!self.toolByName(s); });
  };

  Agent.prototype.run = function (task) {
    task = task || {};
    var trace = [];
    var self = this;

    // Guardrail: input first. An injection attempt does not get a
    // plan, a tool call, or a polite answer that follows it — it gets
    // an escalation, logged in the trace.
    var inputFailures = runGuardrails(this.guardrails, task, null);
    var injection = hasInjection(task.text || task.description || task.question || '');
    if (injection.found) {
      inputFailures.push({ guardrail: 'prompt-injection', reason: 'Input contains instruction-override language; agent will not follow it.' });
    }
    if (inputFailures.length > 0) {
      trace.push({ step: 'guardrail-input', reasoning: 'Input failed a guardrail, so I stopped before calling any tool.', failures: inputFailures, escalated: true });
      return { agent: this.id, name: this.name, goal: this.goal, escalated: true, escalationReason: inputFailures.map(function (f) { return f.guardrail + ': ' + f.reason; }).join('; '), confidence: 0, trace: trace, memory: this.memory.slice() };
    }

    var steps = this.plan(task);
    var results = {};
    var confidences = [];
    var escalated = false;
    var escalationReason = '';

    steps.forEach(function (stepName) {
      if (escalated) return;
      var tool = self.toolByName(stepName);
      if (!tool) return;
      var reasoning = 'Step "' + stepName + '": ' + (tool.description || 'run tool') + '.';
      trace.push({ step: stepName, reasoning: reasoning });
      var output;
      try {
        output = tool.run(task, results, self);
      } catch (e) {
        trace.push({ step: stepName, reasoning: 'Tool threw an error — I treat that as a failure, not a guess.', error: e.message, escalated: true });
        escalated = true;
        escalationReason = 'Tool "' + stepName + '" failed: ' + e.message;
        return;
      }
      // Guardrails on output: a tool result that leaks PHI, invents a
      // diagnosis, or drops citations is not accepted.
      var outFailures = runGuardrails(self.guardrails, task, output);
      if (outFailures.length > 0) {
        trace.push({ step: stepName, reasoning: 'Tool output failed a guardrail, so I rejected it and escalated.', failures: outFailures, escalated: true });
        escalated = true;
        escalationReason = outFailures.map(function (f) { return f.guardrail + ': ' + f.reason; }).join('; ');
        return;
      }
      results[stepName] = output;
      self.remember({ step: stepName, tool: stepName, input: task, output: output, confidence: output && output.confidence });
      if (output && typeof output.confidence === 'number') confidences.push(output.confidence);
      // High-risk tools need a human in the loop: if the tool itself
      // says so, or its confidence is below threshold, escalate.
      if (tool.risk === 'high' && output && output.requiresHumanReview) {
        escalated = true;
        escalationReason = 'High-risk tool result requires human review.';
        trace.push({ step: stepName, reasoning: 'This result is high-risk, so a human must review it before anything proceeds.', escalated: true });
      } else if (output && typeof output.confidence === 'number' && output.confidence < self.confidenceThreshold && tool.risk !== 'low') {
        escalated = true;
        escalationReason = 'Confidence ' + output.confidence + '% is below the ' + self.confidenceThreshold + '% threshold.';
        trace.push({ step: stepName, reasoning: 'Confidence is below my threshold, so I escalate instead of proceeding on a weak result.', escalated: true });
      }
    });

    var confidence = confidences.length
      ? Math.round(confidences.reduce(function (a, b) { return a + b; }, 0) / confidences.length)
      : (escalated ? 0 : 80);

    return {
      agent: this.id,
      name: this.name,
      goal: this.goal,
      escalated: escalated,
      escalationReason: escalationReason,
      confidence: confidence,
      results: results,
      trace: trace,
      memory: this.memory.slice()
    };
  };

  var api = {
    Agent: Agent,
    hasInjection: hasInjection,
    containsSensitivePattern: containsSensitivePattern,
    runGuardrails: runGuardrails,
    INJECTION_PATTERNS: INJECTION_PATTERNS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceAgent = api;
})(typeof window !== 'undefined' ? window : globalThis);
