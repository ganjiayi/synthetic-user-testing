/**
 * Standalone tests for intakeGates.js — no agents, no UI, no API.
 * Run with: node intakeGates.test.js
 * (Swap the assert calls for your test runner of choice if you add one.)
 */

const assert = require('assert');
const {
  checkReadiness,
  approveGate,
  reopenGate,
  fieldBlockers,
  applyOutputDefaults,
  DEFAULT_OUTPUT_FORMATS,
} = require('./intakeGates');

function freshIncompleteIntake() {
  return {
    q2_context: {},
    q3_goals: {},
    q4_persona_segments: { segments: [] },
    q5_product_context: {},
    q6_methodology: { tasks: [] },
    q8_output: { output_formats: [] },
  };
}

function freshCompleteIntake() {
  return {
    q2_context: { lifecycle: 'live', design_phase: 'redesign', fidelity: 'High-fidelity prototype' },
    q3_goals: { primary_rq: 'Where do users hesitate before payment?', secondary_rqs: [] },
    q4_persona_segments: {
      segments: [{ name: 'Trendsetter Explorer', context: 'Heavy checkout use', priority: 1, persona_library_ref: 'trendsetter_explorer' }],
      priority_segment: 'Trendsetter Explorer',
    },
    q5_product_context: { product_name: 'MAA App', product_desc: 'Astro streaming app' },
    q6_methodology: { methodology: 'moderated_qual', scenario: null, tasks: [{ name: 'T1', instruction: 'Buy a TV pack', whatToTest: 'checkout clarity', noClickConstraint: false }] },
    q8_output: { output_formats: ['docx'] },
  };
}

// --- Test 1: incomplete intake is never ready, regardless of gates ---
{
  const intake = freshIncompleteIntake();
  const result = checkReadiness(intake);
  assert.strictEqual(result.ready, false);
  assert.ok(result.blockers.length > 0);
  console.log('PASS: incomplete intake correctly not ready');
}

// --- Test 2: complete fields but gates not approved -> still not ready ---
{
  const intake = freshCompleteIntake();
  const result = checkReadiness(intake);
  assert.strictEqual(result.ready, false);
  assert.ok(result.blockers.some((b) => b.includes('gate not approved')));
  console.log('PASS: complete fields but unapproved gates correctly block readiness');
}

// --- Test 3: complete fields + all gates approved -> ready ---
{
  const intake = freshCompleteIntake();
  approveGate(intake, 'q3_goals');
  approveGate(intake, 'q4_persona_segments');
  approveGate(intake, 'q6_methodology');
  const result = checkReadiness(intake);
  assert.strictEqual(result.ready, true);
  assert.strictEqual(result.blockers.length, 0);
  console.log('PASS: fully approved, fully filled intake is ready');
}

// --- Test 4: the scenario you flagged — reopening q3 after q4/q6 approved ---
{
  const intake = freshCompleteIntake();
  approveGate(intake, 'q3_goals');
  approveGate(intake, 'q4_persona_segments');
  approveGate(intake, 'q6_methodology');

  // sanity check: was ready before the reopen
  assert.strictEqual(checkReadiness(intake).ready, true);

  reopenGate(intake, 'q3_goals');

  const result = checkReadiness(intake);
  assert.strictEqual(result.ready, false, 'reopening q3 must invalidate readiness');
  assert.strictEqual(intake._gates.q3_goals.approved, false);
  assert.strictEqual(intake._gates.q4_persona_segments.approved, false, 'q4 must cascade-invalidate (hard dependency on q3)');
  assert.strictEqual(intake._gates.q6_methodology.approved, false, 'q6 must cascade-invalidate (hard dependency on q3)');
  console.log('PASS: reopening q3 cascades to invalidate q4 and q6');
}

// --- Test 5: reopening q4 (soft dependency) flags q6 for review, doesn't invalidate it ---
{
  const intake = freshCompleteIntake();
  approveGate(intake, 'q3_goals');
  approveGate(intake, 'q4_persona_segments');
  approveGate(intake, 'q6_methodology');

  reopenGate(intake, 'q4_persona_segments');

  assert.strictEqual(intake._gates.q4_persona_segments.approved, false);
  assert.strictEqual(intake._gates.q6_methodology.approved, true, 'q6 should NOT be invalidated by a soft dependency');
  assert.strictEqual(intake._gates.q6_methodology.needs_review, true, 'q6 should be flagged for review');

  const result = checkReadiness(intake);
  assert.ok(result.needsReview.includes('q6_methodology'));
  console.log('PASS: reopening q4 soft-flags q6 without invalidating it');
}

// --- Test 6: fieldBlockers alone catches a gate approved without data ---
// (simulates a bug where an agent approves without writing fields)
{
  const intake = freshIncompleteIntake();
  approveGate(intake, 'q3_goals'); // approved, but q3_goals.primary_rq is still missing
  const blockers = fieldBlockers(intake);
  assert.ok(blockers.includes('q3_goals.primary_rq missing'));
  console.log('PASS: field-level check catches an approved-but-empty gate');
}

// --- Test 7: empty output_formats does not block readiness, and gets defaulted ---
{
  const intake = freshCompleteIntake();
  intake.q8_output = { output_formats: [] }; // simulate user never touching this field
  approveGate(intake, 'q3_goals');
  approveGate(intake, 'q4_persona_segments');
  approveGate(intake, 'q6_methodology');

  const result = checkReadiness(intake);
  assert.strictEqual(result.ready, true, 'empty output_formats must not block readiness');
  assert.deepStrictEqual(intake.q8_output.output_formats, DEFAULT_OUTPUT_FORMATS, 'checkReadiness should auto-apply the default');
  console.log('PASS: empty output_formats no longer blocks readiness and gets auto-defaulted');
}

// --- Test 8: applyOutputDefaults is idempotent and does not clobber a user's real choice ---
{
  const intake = freshCompleteIntake();
  intake.q8_output = { output_formats: ['pptx', 'csv'] };
  applyOutputDefaults(intake);
  assert.deepStrictEqual(intake.q8_output.output_formats, ['pptx', 'csv'], 'a real user choice must not be overwritten by the default');
  console.log('PASS: applyOutputDefaults leaves a real user choice untouched');
}

console.log('\nAll intakeGates tests passed.');
