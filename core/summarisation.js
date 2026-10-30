/**
 * Case summarisation — extractive, grounded summary.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY extractive, not free-form generation, for the first version: a
 * support summary that invents a symptom, a date, or a promise is
 * dangerous in healthcare. So this summariser only reuses sentences
 * already in the case history, picks the most informative ones, and
 * never adds facts. If a future LLM version replaces it, it must be
 * checked against the same rule: every claim in the summary must
 * trace back to a source line. Accuracy first, fluency second.
 */
(function (global) {
  'use strict';

  var STOP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'is', 'i', 'my', 'me', 'it', 'for', 'on', 'with', 'please', 'can', 'you', 'am']);

  function sentences(text) {
    return String(text || '').split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function summariseCase(caseData) {
    caseData = caseData || {};
    var history = caseData.history || [];
    // Normalise each part so it ends with sentence punctuation first:
    // otherwise "Claim denied" + "My claim..." merges into one invented-looking sentence.
    function asSentence(s) {
      s = String(s).trim();
      if (!s) return '';
      return /[.!?]$/.test(s) ? s : s + '.';
    }
    var fullText = [caseData.subject, caseData.description].concat(history.map(function (h) { return h.text || ''; })).filter(Boolean).map(asSentence).join(' ');
    var sents = sentences(fullText);
    if (sents.length === 0) return { summary: 'No case details provided yet.', bulletPoints: [], sourceSentenceCount: 0 };
    if (sents.length <= 2) return { summary: sents.join(' '), bulletPoints: sents, sourceSentenceCount: sents.length };

    // Score sentences by keyword density (excluding stop words) + urgency words.
    var scored = sents.map(function (s, idx) {
      var words = s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(function (w) { return w && !STOP.has(w); });
      var score = words.length;
      if (/urgent|pain|denied|appointment|medication|coverage|claim/i.test(s)) score += 5;
      if (idx === 0) score += 2; // Opening sentence usually frames the request.
      return { sentence: s, score: score, index: idx };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    var top = scored.slice(0, 3).sort(function (a, b) { return a.index - b.index; });
    return {
      summary: top.map(function (t) { return t.sentence; }).join(' '),
      bulletPoints: top.map(function (t) { return t.sentence; }),
      sourceSentenceCount: sents.length,
      note: 'Extractive summary: every sentence is copied from the case history, nothing was invented.'
    };
  }

  var api = { summariseCase: summariseCase, sentences: sentences };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceSummarisation = api;
})(typeof window !== 'undefined' ? window : globalThis);
