/**
 * Own agents, built on the own agent framework — Agentforce in Healthcare CRM.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * These are NOT platform agent configurations. Each agent below is an
 * instance of the Agent class in core/agent.js, with its own goal,
 * instructions, tools (from core/tools.js), guardrails, and confidence
 * threshold. They run in the demo via core/agent.js, they are tested
 * in core/tests/, and Salesforce Apex/LWC is only an integration layer
 * that can call this logic — the agent itself lives here, in code I own.
 *
 * Guardrails shared by all agents here:
 *  - No PHI in any tool output (checked against core/redaction.js)
 *  - No diagnosis or dosage in any output
 *  - No citation-free answer is accepted as a conversational answer
 *
 * Fictional prototype only. No real patient data.
 */
(function (global) {
  'use strict';

  function load(name, file) {
    if (typeof require !== 'undefined') { try { return require(file); } catch (e) {} }
    return global[name];
  }

  function build() {
    var AgentMod = load('AgentforceAgent', './agent');
    var Tools = load('AgentforceTools', './tools');
    if (!AgentMod || !Tools) return null;
    var Agent = AgentMod.Agent;
    var allTools = Tools.tools();

    function pick(names) {
      return allTools.filter(function (t) { return names.indexOf(t.name) !== -1; });
    }

    var noPhiGuardrail = {
      name: 'no-phi-in-output',
      check: function (input, output) {
        if (!output) return { pass: true };
        var text = JSON.stringify(output);
        var Redaction = load('AgentforceRedaction', './redaction');
        if (Redaction && Redaction.containsSensitivePattern(text)) {
          return { pass: false, reason: 'Tool output contains a phone, SSN-like, email, or member-ID pattern.' };
        }
        return { pass: true };
      }
    };
    var noDiagnosisGuardrail = {
      name: 'no-diagnosis-or-dosage',
      check: function (input, output) {
        if (!output) return { pass: true };
        var text = JSON.stringify(output);
        if (/you have (cancer|diabetes|heart disease)|take \d+ ?mg|dosage:?\s*\d+/i.test(text)) {
          return { pass: false, reason: 'Output invents a diagnosis or dosage, which support agents must never do.' };
        }
        return { pass: true };
      }
    };
    var guardrails = [noPhiGuardrail, noDiagnosisGuardrail];

    var triageAgent = new Agent({
      id: 'triage-agent',
      name: 'Triage Agent (own agent)',
      goal: 'Route a fictional support case to the right queue, at the right urgency, with a confidence and reasons a human can check.',
      instructions: 'Redact first, then triage, then summarise, then check escalation. Never diagnose. Below 70% confidence, escalate.',
      tools: pick(['redact', 'triage', 'summarise', 'escalate-check', 'audit-log']),
      guardrails: guardrails,
      confidenceThreshold: 70
    });

    var conversationalAgent = new Agent({
      id: 'conversational-agent',
      name: 'Conversational Support Agent (own agent)',
      goal: 'Answer a fictional member question from the mock knowledge base, with citations, or escalate honestly if nothing matches.',
      instructions: 'Redact first, answer only from retrieved articles with citations, and say "I don\'t know — escalating to a human" when nothing matches well.',
      tools: pick(['redact', 'answer-from-knowledge', 'escalate-check', 'audit-log']),
      guardrails: guardrails,
      confidenceThreshold: 70
    });

    var guardianAgent = new Agent({
      id: 'guardian-agent',
      name: 'Pre-Deployment Guardian Agent (own agent)',
      goal: 'Before any deployment, run every check, list every issue with severity and evidence, and block deployment if any Critical/High issue is open.',
      instructions: 'Run the guardian check suite, build the developer issue report, and never approve a deployment with an open Critical/High issue.',
      tools: pick(['run-guardian-checks', 'build-remediation-plan', 'audit-log']),
      guardrails: guardrails,
      confidenceThreshold: 70
    });

    var remediationAgent = new Agent({
      id: 'remediation-agent',
      name: 'Remediation Agent (own agent)',
      goal: 'Turn guardian issues into fixes: apply safe, low-risk fixes automatically, and propose high-risk fixes for named human approval — never silently auto-deploy a safety-critical change.',
      instructions: 'Build a remediation plan, apply only auto fixes, leave approval-required patches pending until a human approves them by name, then re-guard.',
      tools: pick(['build-remediation-plan', 'apply-safe-fixes', 'run-guardian-checks', 'audit-log']),
      guardrails: guardrails,
      confidenceThreshold: 70
    });

    var summarisationAgent = new Agent({
      id: 'summarisation-agent',
      name: 'Summarisation Agent (own agent)',
      goal: 'Summarise a fictional case using only sentences from the case itself, with nothing invented.',
      instructions: 'Redact first, then summarise extractively. If there is nothing to summarise, return a safe fallback, not an invented summary.',
      tools: pick(['redact', 'summarise', 'audit-log']),
      guardrails: guardrails,
      confidenceThreshold: 70
    });

    return {
      triageAgent: triageAgent,
      conversationalAgent: conversationalAgent,
      guardianAgent: guardianAgent,
      remediationAgent: remediationAgent,
      summarisationAgent: summarisationAgent,
      all: [triageAgent, conversationalAgent, guardianAgent, remediationAgent, summarisationAgent]
    };
  }

  var api = { build: build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceAgents = api;
})(typeof window !== 'undefined' ? window : globalThis);
