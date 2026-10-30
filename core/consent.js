/**
 * Consent + human-in-the-loop checks.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY this module is small and strict: consent in healthcare is not
 * a checkbox to optimise away. An agent should not share benefits,
 * claims, or care details, or take an action on a member's behalf,
 * without a clear, recorded basis — and a human must stay in the loop
 * for anything high-risk. These checks deliberately fail closed:
 * if consent is unclear, the answer is "ask a human", not "proceed".
 */
(function (global) {
  'use strict';

  function checkConsent(context) {
    context = context || {};
    var issues = [];
    if (!context.memberConsented) issues.push('Member consent not recorded');
    if (context.actionIsHighRisk && !context.humanApproved) issues.push('High-risk action requires human approval');
    if (context.containsPHI && !context.redactionApplied) issues.push('PHI present but redaction not applied');
    return { allowed: issues.length === 0, issues: issues, requiresHuman: context.actionIsHighRisk || issues.length > 0 };
  }

  function humanInLoopRequired(triage) {
    if (!triage) return true;
    return triage.urgency === 'P1' || triage.confidence < 70 || !!triage.sensitive || !!triage.requiresHumanReview;
  }

  var api = { checkConsent: checkConsent, humanInLoopRequired: humanInLoopRequired };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceConsent = api;
})(typeof window !== 'undefined' ? window : globalThis);
