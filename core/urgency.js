/**
 * Urgency rules — Agentforce in Healthcare CRM.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY these rules are explicit and conservative: urgency is the one
 * decision where getting it wrong in either direction hurts someone.
 * Over-triage floods clinicians; under-triage delays care. So I keep
 * the rules readable, keyword-driven, and biased toward escalation:
 * if a message even hints at a safety risk, it goes to P1 and to a
 * human, even if that costs a little extra review time. A model should
 * never quietly downgrade a possible emergency to save queue time.
 *
 * P1 Critical: possible emergency, safety risk, severe symptoms, self-harm.
 * P2 High:      urgent care need, medication access failure, imminent appointment failure.
 * P3 Medium:    time-sensitive but stable — claims, benefits, routine follow-up.
 * P4 Low:       general information, non-urgent admin.
 *
 * This is triage for SUPPORT routing only. It is not a medical diagnosis
 * and never replaces emergency services or a clinician.
 */
(function (global) {
  'use strict';

  var P1_KEYWORDS = [
    'chest pain', 'difficulty breathing', 'trouble breathing', 'shortness of breath',
    'unconscious', 'fainted', 'seizure', 'stroke', 'overdose', 'bleeding heavily',
    'suicidal', 'self-harm', 'hurt myself', 'emergency', 'ambulance', '911',
    'severe allergic', 'anaphylaxis', 'cannot breathe', 'passed out',
    'suicide', 'kill myself', 'chest tightness'
  ];

  var P2_KEYWORDS = [
    'insulin', 'medication ran out', 'out of medicine', 'missed dose', 'prescription denied',
    'urgent', 'pain getting worse', 'fever', 'infection', 'swelling',
    'appointment tomorrow', 'surgery tomorrow', 'dialysis', 'chemotherapy',
    'cannot afford medication', 'prior authorization denied', 'denied urgently'
  ];

  var P3_KEYWORDS = [
    'claim denied', 'claim status', 'bill', 'billing', 'benefits', 'coverage',
    'copay', 'deductible', 'referral', 'appointment', 'reschedule',
    'lab result', 'test result', 'care coordinator', 'transportation'
  ];

  function findHits(text, keywords) {
    var lower = String(text || '').toLowerCase();
    return keywords.filter(function (k) { return lower.indexOf(k) !== -1; });
  }

  function assessUrgency(text, opts) {
    opts = opts || {};
    var p1 = findHits(text, P1_KEYWORDS);
    var p2 = findHits(text, P2_KEYWORDS);
    var p3 = findHits(text, P3_KEYWORDS);

    // Explicit safety override: a caller flagging an emergency always wins,
    // even if the rest of the message sounds routine.
    if (opts.flaggedEmergency) {
      return { level: 'P1', label: 'P1 Critical', reasons: ['Caller flagged this as an emergency'], hits: p1 };
    }
    if (p1.length > 0) return { level: 'P1', label: 'P1 Critical', reasons: p1.map(function (h) { return 'Safety keyword: "' + h + '"'; }), hits: p1 };
    if (p2.length > 0) return { level: 'P2', label: 'P2 High', reasons: p2.map(function (h) { return 'Urgent keyword: "' + h + '"'; }), hits: p2 };
    if (p3.length > 0) return { level: 'P3', label: 'P3 Medium', reasons: p3.map(function (h) { return 'Time-sensitive keyword: "' + h + '"'; }), hits: p3 };
    return { level: 'P4', label: 'P4 Low', reasons: ['No urgent or time-sensitive keywords found; general enquiry'], hits: [] };
  }

  function slaMinutes(level) {
    return { P1: 15, P2: 60, P3: 480, P4: 1440 }[level] || 1440;
  }

  var api = { assessUrgency: assessUrgency, slaMinutes: slaMinutes, P1_KEYWORDS: P1_KEYWORDS, P2_KEYWORDS: P2_KEYWORDS, P3_KEYWORDS: P3_KEYWORDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceUrgency = api;
})(typeof window !== 'undefined' ? window : globalThis);
