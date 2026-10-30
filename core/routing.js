/**
 * Routing rules — Agentforce in Healthcare CRM.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY routing is separate from urgency: urgency says HOW FAST, routing
 * says WHO. Mixing them in one black box makes both harder to audit.
 * A case can be P4 but still belong in the care-coordination queue, and
 * a P1 case must go to a human clinical queue no matter what category
 * the classifier picked. That separation is what lets a supervisor
 * answer "why did this case go there?" without guessing.
 */
(function (global) {
  'use strict';

  var QUEUES = {
    CLINICAL_ESCALATION: 'Clinical Escalation (Human)',
    BENEFITS: 'Benefits & Coverage',
    CLAIMS: 'Claims & Billing',
    APPOINTMENTS: 'Scheduling & Appointments',
    CARE_COORDINATION: 'Care Coordination',
    GENERAL_SUPPORT: 'General Member Support',
    HUMAN_REVIEW: 'Human Review Queue'
  };

  function routeCase(triage) {
    triage = triage || {};
    // Safety first: P1 never goes to a bot-only queue.
    if (triage.urgency === 'P1') {
      return { queue: QUEUES.CLINICAL_ESCALATION, reason: 'P1 Critical always routes to a human clinical queue' };
    }
    if (triage.requiresHumanReview) {
      return { queue: QUEUES.HUMAN_REVIEW, reason: 'Human review required (sensitive topic or low confidence)' };
    }
    var map = {
      'Benefits': QUEUES.BENEFITS,
      'Claims': QUEUES.CLAIMS,
      'Appointment': QUEUES.APPOINTMENTS,
      'Care Coordination': QUEUES.CARE_COORDINATION,
      'General Enquiry': QUEUES.GENERAL_SUPPORT
    };
    var queue = map[triage.category] || QUEUES.GENERAL_SUPPORT;
    return { queue: queue, reason: 'Routed by category: ' + (triage.category || 'General Enquiry') };
  }

  var api = { routeCase: routeCase, QUEUES: QUEUES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceRouting = api;
})(typeof window !== 'undefined' ? window : globalThis);
