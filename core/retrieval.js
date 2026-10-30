/**
 * Knowledge retrieval + conversational agent logic.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY citations are mandatory here: a member acting on a benefits or
 * claims answer needs to know WHERE it came from, and an agent reviewing
 * it later needs the same. So every answer carries its article IDs.
 * And the fallback matters just as much as the answers: when nothing
 * matches well, the agent must say "I don't know — escalating to a
 * human" instead of guessing. In healthcare support, a confident
 * hallucination is the worst failure mode, so "I don't know" is
 * designed in as a success, not an error.
 *
 * Mock knowledge base — fictional articles only, for demo purposes.
 */
(function (global) {
  'use strict';

  var KNOWLEDGE_BASE = [
    { id: 'KB-101', title: 'Understanding Your Benefits and Coverage', keywords: ['benefit', 'coverage', 'covered', 'copay', 'deductible', 'plan', 'in-network'], answer: 'Your plan covers in-network preventive care at no extra copay in most cases, and specialist visits usually need a referral first. Copay and deductible amounts depend on your specific plan — check your benefits summary or ask a human agent to confirm your exact amounts before booking.' },
    { id: 'KB-102', title: 'What to Do When a Claim Is Denied', keywords: ['claim', 'denied', 'denial', 'bill', 'billing', 'reimbursement', 'appeal'], answer: 'If a claim is denied, first check the denial reason on your Explanation of Benefits. Common reasons are missing information or an out-of-network provider. You can appeal by submitting the requested documents, and a human claims specialist can walk through the appeal steps with you.' },
    { id: 'KB-103', title: 'Booking, Rescheduling, and Cancelling Appointments', keywords: ['appointment', 'schedule', 'reschedule', 'book', 'cancel'], answer: 'You can book or reschedule an appointment through the member portal or by calling scheduling. If you need an earlier slot, ask to join the waitlist — cancellations open up regularly. For urgent symptoms, contact your care team or emergency services directly rather than waiting for a routine slot.' },
    { id: 'KB-104', title: 'Getting a Referral to a Specialist', keywords: ['referral', 'specialist', 'care coordinator', 'case manager'], answer: 'A referral usually starts with your primary care provider, who confirms the specialist is in-network and submits the referral. Your care coordinator can track it and help with scheduling once it is approved. Referrals typically take a few business days to process.' },
    { id: 'KB-105', title: 'Prescription Refills and Prior Authorization', keywords: ['prescription', 'medication', 'refill', 'pharmacy', 'prior authorization', 'insulin'], answer: 'For refills, contact your pharmacy first — most routine refills process in 1–2 days. If a medication needs prior authorization, your prescriber submits the request and you will be notified of the decision. If you have run out of an essential medication, tell a human agent immediately so it can be treated as urgent.' },
    { id: 'KB-106', title: 'Care Coordination and Support Services', keywords: ['care plan', 'transportation', 'home care', 'support', 'coordinator'], answer: 'Care coordination can help with follow-up appointments, transportation to visits, and connecting you with community support services. Ask for a care coordinator if you are managing multiple appointments or need help keeping track of your care plan.' }
  ];

  function scoreArticle(question, article) {
    var q = String(question || '').toLowerCase();
    var hits = article.keywords.filter(function (k) { return q.indexOf(k) !== -1; });
    // Also reward title word overlap.
    var titleHits = article.title.toLowerCase().split(/\W+/).filter(function (w) { return w.length > 3 && q.indexOf(w) !== -1; }).length;
    return { article: article, hits: hits, score: hits.length * 10 + titleHits * 2 };
  }

  function retrieve(question, threshold) {
    threshold = (threshold === undefined) ? 10 : threshold;
    var scored = KNOWLEDGE_BASE.map(function (a) { return scoreArticle(question, a); })
      .filter(function (s) { return s.score >= threshold; })
      .sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 2);
  }

  function answerQuestion(question) {
    var matches = retrieve(question);
    if (matches.length === 0) {
      return {
        answer: "I don't know the answer to that from the knowledge base I can access, so I'm escalating this to a human agent rather than guessing. A human will follow up — and if this is urgent or an emergency, please contact emergency services or your care team right away.",
        citations: [], escalated: true, confidence: 0, matchedKeywords: []
      };
    }
    var top = matches[0];
    return {
      answer: top.article.answer,
      citations: matches.map(function (m) { return { id: m.article.id, title: m.article.title }; }),
      escalated: false,
      confidence: Math.min(95, 60 + top.score),
      matchedKeywords: top.hits
    };
  }

  var api = { KNOWLEDGE_BASE: KNOWLEDGE_BASE, retrieve: retrieve, answerQuestion: answerQuestion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceRetrieval = api;
})(typeof window !== 'undefined' ? window : globalThis);
