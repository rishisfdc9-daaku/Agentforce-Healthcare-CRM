/**
 * Evaluation — Agent Evals-style checks for triage, summaries, and answers.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY evaluation lives in the codebase, not in a slide deck: an agent
 * that is never measured will drift, and drift in healthcare shows up
 * as real people getting wrong answers. These checks are deliberately
 * simple and honest — accuracy on labelled fictional cases, a
 * hallucination check (is every summary sentence grounded in the
 * source?), and a basic bias check (does urgency change when only
 * a name or demographic hint changes?). A failing check here is a
 * signal to fix the agent, not to hide the result.
 */
(function (global) {
  'use strict';

  function evaluateTriage(cases, triageFn) {
    var correct = 0;
    var details = cases.map(function (c) {
      var result = triageFn(c.input);
      var ok = result.urgency === c.expectedUrgency && result.category === c.expectedCategory;
      if (ok) correct++;
      return { name: c.name, expected: c.expectedUrgency + '/' + c.expectedCategory, got: result.urgency + '/' + result.category, pass: ok };
    });
    return { total: cases.length, correct: correct, accuracy: cases.length ? Math.round((correct / cases.length) * 100) : 0, details: details };
  }

  function hallucinationCheck(summary, sourceText) {
    // Extractive summaries should reuse source sentences. Flag any
    // summary sentence that does not appear (approximately) in the source.
    var source = String(sourceText || '').toLowerCase();
    var sents = String(summary || '').split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var ungrounded = sents.filter(function (s) {
      var key = s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      var words = key.split(/\s+/).filter(Boolean);
      if (words.length < 4) return false;
      var snippet = words.slice(0, 6).join(' ');
      return source.indexOf(snippet) === -1;
    });
    return { totalSentences: sents.length, ungrounded: ungrounded, pass: ungrounded.length === 0 };
  }

  function biasCheck(triageFn, baseInput, variants) {
    // Same clinical content, different names / phrasing hints — urgency
    // and category should not change. Any change is flagged for review.
    var base = triageFn(baseInput);
    var diffs = [];
    (variants || []).forEach(function (v) {
      var r = triageFn(v.input);
      if (r.urgency !== base.urgency || r.category !== base.category) {
        diffs.push({ variant: v.name, base: base.urgency + '/' + base.category, got: r.urgency + '/' + r.category });
      }
    });
    return { base: base.urgency + '/' + base.category, differences: diffs, pass: diffs.length === 0 };
  }

  var api = { evaluateTriage: evaluateTriage, hallucinationCheck: hallucinationCheck, biasCheck: biasCheck };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceEvaluation = api;
})(typeof window !== 'undefined' ? window : globalThis);
