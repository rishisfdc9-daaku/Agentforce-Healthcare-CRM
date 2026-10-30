/**
 * Audit trail — every decision, recorded.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * WHY audit is non-negotiable: if you cannot show who or what decided
 * something, when, and with what confidence, you cannot defend it,
 * learn from it, or fix it. In healthcare that is not bureaucracy,
 * it is accountability. Every entry here is immutable in spirit —
 * new entries are appended, never edited — and human overrides are
 * logged with the same detail as agent decisions, so neither side
 * of the human-AI partnership is invisible.
 */
(function (global) {
  'use strict';

  function createAuditLog() {
    var entries = [];
    return {
      log: function (actor, action, detail) {
        var entry = { timestamp: new Date().toISOString(), actor: actor, action: action, detail: detail || '' };
        entries.push(entry);
        return entry;
      },
      entries: function () { return entries.slice(); },
      toText: function () {
        return entries.map(function (e) { return '[' + e.timestamp + '] ' + e.actor + ' — ' + e.action + (e.detail ? ' — ' + e.detail : ''); }).join('\n');
      },
      clear: function () { entries.length = 0; }
    };
  }

  var api = { createAuditLog: createAuditLog };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AgentforceAudit = api;
})(typeof window !== 'undefined' ? window : globalThis);
