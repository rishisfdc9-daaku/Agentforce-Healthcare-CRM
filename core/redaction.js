/**
 * RedactionService — PHI safety for Agentforce in Healthcare CRM.
 *
 * Written by Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY this exists before anything else: in healthcare, a helpful answer
 * that leaks a phone number, member ID, or SSN-like string is not helpful,
 * it is a breach of trust. So redaction is not an afterthought here — it
 * runs on every piece of free text before it is stored, summarised, or
 * shown to an agent, and the demo keeps both the original (local only)
 * and the masked view so a human can see exactly what was hidden.
 *
 * This is fictional mock data handling only. No real patient data is
 * ever passed through this module in the demo or tests.
 */
(function (global) {
  'use strict';

  var PATTERNS = [
    { name: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g, label: '[SSN REDACTED]' },
    { name: 'PHONE', regex: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, label: '[PHONE REDACTED]' },
    { name: 'EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, label: '[EMAIL REDACTED]' },
    // Fictional member IDs in the demo look like MEM-123456 or MBR1234567
    { name: 'MEMBER_ID', regex: /\b(?:MEM|MBR)[- ]?\d{6,10}\b/gi, label: '[MEMBER ID REDACTED]' },
    { name: 'DOB', regex: /\b(?:DOB|Date of Birth)\s*:\s*\d{1,2}\/\d{1,2}\/\d{4}\b/gi, label: 'DOB: [REDACTED]' }
  ];

  function redact(text) {
    if (text === null || text === undefined) return { masked: '', redactions: [] };
    var masked = String(text);
    var redactions = [];
    PATTERNS.forEach(function (p) {
      // Fresh regex each pass so lastIndex state never leaks between calls.
      var re = new RegExp(p.regex.source, p.regex.flags);
      var matches = masked.match(re);
      if (matches) {
        matches.forEach(function () { redactions.push(p.name); });
        masked = masked.replace(re, p.label);
      }
    });
    return { masked: masked, redactions: redactions };
  }

  function containsSensitivePattern(text) {
    if (!text) return false;
    return PATTERNS.some(function (p) {
      return new RegExp(p.regex.source, p.regex.flags).test(String(text));
    });
  }

  function maskMemberId(id) {
    if (!id) return '';
    var s = String(id);
    if (s.length <= 4) return '****';
    return '****' + s.slice(-4);
  }

  var api = { redact: redact, containsSensitivePattern: containsSensitivePattern, maskMemberId: maskMemberId, PATTERNS: PATTERNS.map(function (p) { return p.name; }) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceRedaction = api;
})(typeof window !== 'undefined' ? window : globalThis);
