/**
 * Case triage — scoring, category, confidence.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY confidence is a first-class output, not a footnote: in support
 * triage, a confident wrong answer is worse than an honest uncertain
 * one. So every triage result carries its score, the keywords that
 * drove it, and a clear rule — below 70% confidence, a human reviews
 * it. That threshold is deliberately visible in the demo so anyone
 * trying it can see accountability working, not just automation.
 *
 * Categories: Benefits, Claims, Appointment, Care Coordination, General Enquiry.
 * Scoring is transparent keyword + urgency scoring, not a hidden model,
 * so the demo's decisions can be reproduced and argued with.
 */
(function (global) {
  'use strict';

  function getUrgency() {
    if (typeof require !== 'undefined') { try { return require('./urgency'); } catch (e) {} }
    return global.AgentforceUrgency;
  }
  function getRouting() {
    if (typeof require !== 'undefined') { try { return require('./routing'); } catch (e) {} }
    return global.AgentforceRouting;
  }

  var CATEGORY_KEYWORDS = {
    'Benefits': ['benefit', 'coverage', 'covered', 'copay', 'deductible', 'plan', 'in-network', 'out of network', 'eligible', 'eligibility'],
    'Claims': ['claim', 'denied', 'denial', 'bill', 'billing', 'charged', 'payment', 'reimbursement', 'eob', 'explanation of benefits'],
    'Appointment': ['appointment', 'schedule', 'reschedule', 'book', 'cancel appointment', 'doctor visit', 'see a doctor', 'available slot'],
    'Care Coordination': ['care coordinator', 'care plan', 'referral', 'specialist', 'follow-up', 'follow up', 'transportation', 'home care', 'case manager']
  };

  function classifyCategory(text) {
    var lower = String(text || '').toLowerCase();
    var best = { category: 'General Enquiry', score: 0, hits: [] };
    Object.keys(CATEGORY_KEYWORDS).forEach(function (cat) {
      var hits = CATEGORY_KEYWORDS[cat].filter(function (k) { return lower.indexOf(k) !== -1; });
      if (hits.length > best.score) best = { category: cat, score: hits.length, hits: hits };
    });
    return best;
  }

  function triageCase(input) {
    input = input || {};
    var text = [input.subject, input.description].filter(Boolean).join(' ');
    var urgencyMod = getUrgency();
    var urgency = urgencyMod.assessUrgency(text, { flaggedEmergency: !!input.flaggedEmergency });
    var cat = classifyCategory(text);

    // Confidence: start from evidence strength, penalise ambiguity.
    // Strong urgency signal + clear category = high confidence.
    // No clear signal at all = low confidence, which forces human review.
    var confidence = 55;
    if (urgency.hits.length > 0) confidence += 15;
    if (urgency.hits.length > 1) confidence += 10;
    if (cat.score > 0) confidence += 10;
    if (cat.score > 1) confidence += 10;
    if (text.length > 120) confidence += 5;
    if (text.length < 30) confidence -= 15;
    confidence = Math.max(30, Math.min(97, confidence));

    var sensitive = /mental health|suicid|self-harm|abuse|substance|pregnan|hiv|cancer|terminal/i.test(text);
    var requiresHumanReview = urgency.level === 'P1' || confidence < 70 || sensitive;

    var partial = { urgency: urgency.level, urgencyLabel: urgency.label, category: cat.category, confidence: confidence, reasons: urgency.reasons.concat(cat.hits.map(function (h) { return 'Category keyword: "' + h + '"'; })), urgencyHits: urgency.hits, categoryHits: cat.hits, sensitive: sensitive, requiresHumanReview: requiresHumanReview, slaMinutes: urgencyMod.slaMinutes(urgency.level) };
    var routing = getRouting().routeCase(partial);
    partial.queue = routing.queue;
    partial.routingReason = routing.reason;
    return partial;
  }

  var api = { triageCase: triageCase, classifyCategory: classifyCategory };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceTriage = api;
})(typeof window !== 'undefined' ? window : globalThis);
