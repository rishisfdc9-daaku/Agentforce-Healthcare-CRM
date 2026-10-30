/**
 * Escalation + governance decisions.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY escalation is a feature, not a failure: the fastest way to lose
 * trust in healthcare AI is to let it bluff through a case it should
 * have handed over. So escalation triggers are explicit, overlapping,
 * and conservative — any one of them is enough. A human override is
 * also a first-class action, logged like any other decision, because
 * accountability means you can see who changed a decision and why.
 */
(function (global) {
  'use strict';

  var CONFIDENCE_THRESHOLD = 70;

  function shouldEscalate(triage, extra) {
    extra = extra || {};
    var reasons = [];
    if (!triage) return { escalate: true, reasons: ['No triage result available'] };
    if (triage.urgency === 'P1') reasons.push('P1 Critical urgency');
    if (triage.confidence < CONFIDENCE_THRESHOLD) reasons.push('Low confidence (' + triage.confidence + '% < ' + CONFIDENCE_THRESHOLD + '%)');
    if (triage.sensitive) reasons.push('Sensitive topic detected');
    if (triage.requiresHumanReview) reasons.push('Triage flagged human review');
    if (extra.memberRequestedHuman) reasons.push('Member requested a human');
    if (extra.chatFallback) reasons.push('Conversational agent could not answer from knowledge base');
    if (extra.humanOverride) reasons.push('Human override requested');
    return { escalate: reasons.length > 0, reasons: reasons };
  }

  function applyHumanOverride(triage, override) {
    override = override || {};
    return {
      urgency: override.urgency || triage.urgency,
      category: override.category || triage.category,
      queue: override.queue || triage.queue,
      confidence: triage.confidence,
      overriddenBy: override.by || 'Human Agent',
      overrideReason: override.reason || 'Human judgement',
      overriddenAt: new Date().toISOString()
    };
  }

  var api = { shouldEscalate: shouldEscalate, applyHumanOverride: applyHumanOverride, CONFIDENCE_THRESHOLD: CONFIDENCE_THRESHOLD };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceEscalation = api;
})(typeof window !== 'undefined' ? window : globalThis);
