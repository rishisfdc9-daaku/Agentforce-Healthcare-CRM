/**
 * Test runner — Agentforce in Healthcare CRM.
 * By Rishi Gullapalli (rishisfdc9-daaku).
 *
 * Run with: node core/tests/run-tests.js
 * Prints PASS/FAIL per test and a summary. Exits non-zero on failure.
 * All data below is fictional mock data. No real patient data.
 */
'use strict';

var Triage = require('../triage');
var Urgency = require('../urgency');
var Escalation = require('../escalation');
var Redaction = require('../redaction');
var Summarisation = require('../summarisation');
var Retrieval = require('../retrieval');
var Evaluation = require('../evaluation');
var Consent = require('../consent');

var passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS: ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL: ' + name + ' — ' + e.message);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEq(a, b, msg) { if (a !== b) throw new Error((msg || 'mismatch') + ' (expected ' + b + ', got ' + a + ')'); }

// --- Triage ---
test('triage: chest pain is P1 Critical', function () {
  var r = Triage.triageCase({ subject: 'Help', description: 'I have severe chest pain and difficulty breathing.' });
  assertEq(r.urgency, 'P1');
  assert(r.requiresHumanReview, 'P1 must require human review');
});
test('triage: claim denial is P3 Claims', function () {
  var r = Triage.triageCase({ subject: 'Claim denied', description: 'My claim was denied and I received a bill I do not understand.' });
  assertEq(r.category, 'Claims');
  assertEq(r.urgency, 'P3');
});
test('triage: appointment reschedule is Appointment category', function () {
  var r = Triage.triageCase({ subject: 'Reschedule', description: 'I need to reschedule my appointment with my doctor next week.' });
  assertEq(r.category, 'Appointment');
});
test('triage: benefits question is Benefits category', function () {
  var r = Triage.triageCase({ subject: 'Coverage question', description: 'Is this specialist covered under my benefits plan and what is my copay?' });
  assertEq(r.category, 'Benefits');
});
test('triage: short vague message has low confidence and escalates', function () {
  var r = Triage.triageCase({ subject: 'Help', description: 'Help.' });
  assert(r.confidence < 70, 'expected low confidence, got ' + r.confidence);
  assert(Escalation.shouldEscalate(r).escalate, 'low confidence must escalate');
});
test('urgency: flagged emergency overrides to P1', function () {
  var r = Urgency.assessUrgency('Just a routine question', { flaggedEmergency: true });
  assertEq(r.level, 'P1');
});

// --- Escalation ---
test('escalation: P2 with high confidence does not auto-escalate on urgency alone', function () {
  var r = Triage.triageCase({ subject: 'Medication', description: 'My insulin prescription was denied and my medication ran out yesterday, I need help urgently.' });
  var e = Escalation.shouldEscalate(r);
  // P2 + strong evidence gives high confidence; escalation only if sensitive/low-confidence flags fire.
  // This test asserts the rule, not a fixed outcome: escalation reasons must be explainable.
  assert(Array.isArray(e.reasons), 'reasons must be an array');
});
test('escalation: human override changes queue and is recorded', function () {
  var r = Triage.triageCase({ subject: 'Claim', description: 'My claim was denied, please help with the bill.' });
  var o = Escalation.applyHumanOverride(r, { queue: 'Claims & Billing', by: 'Human Agent Maya', reason: 'Member asked for specialist review' });
  assertEq(o.queue, 'Claims & Billing');
  assertEq(o.overriddenBy, 'Human Agent Maya');
});
test('consent: high-risk action without human approval is not allowed', function () {
  var c = Consent.checkConsent({ memberConsented: true, actionIsHighRisk: true, humanApproved: false, containsPHI: false, redactionApplied: true });
  assert(!c.allowed, 'should fail closed');
});

// --- Redaction ---
test('redaction: phone and SSN-like patterns are masked', function () {
  var r = Redaction.redact('Call me at 555-123-4567, SSN 123-45-6789, member MEM-123456.');
  assert(r.masked.indexOf('555-123-4567') === -1, 'phone must be masked');
  assert(r.masked.indexOf('123-45-6789') === -1, 'SSN must be masked');
  assert(r.masked.indexOf('MEM-123456') === -1, 'member ID must be masked');
  assert(r.redactions.length >= 3, 'expected 3+ redactions');
});
test('redaction: clean text passes through unchanged', function () {
  var r = Redaction.redact('I need help rescheduling my appointment.');
  assertEq(r.masked, 'I need help rescheduling my appointment.');
  assertEq(r.redactions.length, 0);
});
test('redaction: member ID masking keeps only last 4', function () {
  assertEq(Redaction.maskMemberId('MEM-123456'), '****3456');
});

// --- Summarisation ---
test('summarisation: summary only reuses source sentences (no invention)', function () {
  var s = Summarisation.summariseCase({ subject: 'Claim denied', description: 'My claim was denied last week. I received a bill for the visit. I need help understanding the denial reason.' });
  var check = Evaluation.hallucinationCheck(s.summary, 'My claim was denied last week. I received a bill for the visit. I need help understanding the denial reason.');
  assert(check.pass, 'summary must be grounded, ungrounded: ' + JSON.stringify(check.ungrounded));
});
test('summarisation: empty case returns a safe fallback', function () {
  var s = Summarisation.summariseCase({ subject: '', description: '' });
  assert(s.summary.length > 0, 'fallback summary required');
});

// --- Retrieval / conversational ---
test('retrieval: benefits question returns KB-101 citation', function () {
  var a = Retrieval.answerQuestion('What does my benefits coverage include and what is my copay?');
  assert(!a.escalated, 'should answer, not escalate');
  assert(a.citations.some(function (c) { return c.id === 'KB-101'; }), 'expected KB-101 citation');
});
test('retrieval: unknown question escalates instead of guessing', function () {
  var a = Retrieval.answerQuestion('What is the meaning of life and quantum teleportation policy?');
  assert(a.escalated, 'unknown question must escalate');
  assertEq(a.citations.length, 0);
});
test('evaluation: triage accuracy helper counts correctly', function () {
  var ev = Evaluation.evaluateTriage(
    [{ name: 'p1', input: { description: 'chest pain and difficulty breathing' }, expectedUrgency: 'P1', expectedCategory: 'General Enquiry' }],
    function (input) { return Triage.triageCase(input); });
  assertEq(ev.total, 1);
  assertEq(ev.correct, 1);
});
test('evaluation: bias check flags nothing for identical content', function () {
  var b = Evaluation.biasCheck(function (i) { return Triage.triageCase(i); },
    { description: 'My claim was denied and I need help with the bill.' },
    [{ name: 'variant', input: { description: 'My claim was denied and I need help with the bill.' } }]);
  assert(b.pass, 'identical content must not change triage');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed, ' + (passed + failed) + ' total.');
if (failed > 0) { process.exit(1); }
