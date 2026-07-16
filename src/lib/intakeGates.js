/**
 * intakeGates.js
 *
 * Deterministic readiness/gate logic for the intake pipeline.
 * No model calls here — this is plain state-machine code that sits in
 * front of the three conversational agents (research-question-crafter,
 * persona-fit-suggester, methodology-and-task-crafter) and in front of
 * research-planner.md.
 *
 * Test this module on its own, with fixture intake objects, before
 * wiring it to any agent or any UI.
 */

const GATE_KEYS = ['q3_goals', 'q4_persona_segments', 'q6_methodology'];

// hard: reopening the key invalidates the dependent gate automatically
// soft: reopening the key just flags the dependent gate for review
const DEPENDENCIES = {
  q4_persona_segments: { hard: ['q3_goals'], soft: [] },
  q6_methodology: { hard: ['q3_goals'], soft: ['q4_persona_segments'] },
};

function emptyGates() {
  const gates = {};
  for (const key of GATE_KEYS) {
    gates[key] = { approved: false, approved_at: null, needs_review: false };
  }
  return gates;
}

function ensureGates(intake) {
  if (!intake._gates) intake._gates = emptyGates();
  for (const key of GATE_KEYS) {
    if (!intake._gates[key]) {
      intake._gates[key] = { approved: false, approved_at: null, needs_review: false };
    }
  }
  return intake;
}

/**
 * Mark a gate approved. Call this after the corresponding agent's
 * write-back to the intake fields is complete.
 */
function approveGate(intake, gateKey) {
  ensureGates(intake);
  if (!GATE_KEYS.includes(gateKey)) {
    throw new Error(`Unknown gate: ${gateKey}`);
  }
  intake._gates[gateKey] = {
    approved: true,
    approved_at: new Date().toISOString(),
    needs_review: false,
  };
  return intake;
}

/**
 * Reopen a gate (user goes back and edits an already-approved section).
 * Cascades: hard-dependent gates get invalidated (approved: false).
 * Soft-dependent gates stay approved but get needs_review: true.
 */
function reopenGate(intake, gateKey) {
  ensureGates(intake);
  if (!GATE_KEYS.includes(gateKey)) {
    throw new Error(`Unknown gate: ${gateKey}`);
  }
  intake._gates[gateKey] = { approved: false, approved_at: null, needs_review: false };

  for (const [dependent, deps] of Object.entries(DEPENDENCIES)) {
    if (deps.hard.includes(gateKey)) {
      intake._gates[dependent] = { approved: false, approved_at: null, needs_review: false };
    } else if (deps.soft.includes(gateKey) && intake._gates[dependent].approved) {
      intake._gates[dependent].needs_review = true;
    }
  }
  return intake;
}

/**
 * Field-level completeness checks, independent of gate approval.
 * A gate can only be approved if its underlying fields are actually filled —
 * this catches an agent that approved a gate without writing the fields,
 * or a fixture that's missing data.
 */
function fieldBlockers(intake) {
  const blockers = [];

  const q2 = intake.q2_context || {};
  if (!q2.lifecycle) blockers.push('q2_context.lifecycle missing');
  if (!q2.design_phase) blockers.push('q2_context.design_phase missing');
  if (!q2.fidelity) blockers.push('q2_context.fidelity missing');

  const q3 = intake.q3_goals || {};
  if (!q3.primary_rq) blockers.push('q3_goals.primary_rq missing');

  const q4 = intake.q4_persona_segments || {};
  if (!Array.isArray(q4.segments) || q4.segments.length === 0) {
    blockers.push('q4_persona_segments.segments empty');
  }

  const q5 = intake.q5_product_context || {};
  if (!q5.product_name) blockers.push('q5_product_context.product_name missing');
  if (!q5.product_desc) blockers.push('q5_product_context.product_desc missing');

  const q6 = intake.q6_methodology || {};
  if (!q6.methodology) blockers.push('q6_methodology.methodology missing');
  if (!Array.isArray(q6.tasks) || q6.tasks.length === 0) {
    blockers.push('q6_methodology.tasks empty');
  }

  // q8_output.output_formats is intentionally not a blocker — see
  // DEFAULT_OUTPUT_FORMATS / applyOutputDefaults below. Format choice
  // doesn't matter enough to hold up readiness.

  return blockers;
}

const DEFAULT_OUTPUT_FORMATS = ['docx'];

/**
 * Call this once at intake init (or lazily in checkReadiness) so
 * q8_output.output_formats is never empty by the time readiness is
 * checked, without making the user pick anything.
 */
function applyOutputDefaults(intake) {
  if (!intake.q8_output) intake.q8_output = {};
  if (!Array.isArray(intake.q8_output.output_formats) || intake.q8_output.output_formats.length === 0) {
    intake.q8_output.output_formats = [...DEFAULT_OUTPUT_FORMATS];
  }
  return intake;
}

/**
 * The single function the UI/orchestrator should call.
 * Returns { ready, blockers, needsReview } — never a boolean alone,
 * so the UI can explain *why* it isn't ready rather than just refusing.
 */
function checkReadiness(intake) {
  ensureGates(intake);
  applyOutputDefaults(intake);

  const blockers = fieldBlockers(intake);

  for (const key of GATE_KEYS) {
    if (!intake._gates[key].approved) {
      blockers.push(`${key} gate not approved`);
    }
  }

  const needsReview = GATE_KEYS.filter((key) => intake._gates[key].needs_review);

  return {
    ready: blockers.length === 0,
    blockers,
    needsReview, // gates that are approved but should be glanced at again
  };
}

module.exports = {
  GATE_KEYS,
  DEPENDENCIES,
  DEFAULT_OUTPUT_FORMATS,
  emptyGates,
  ensureGates,
  approveGate,
  reopenGate,
  fieldBlockers,
  applyOutputDefaults,
  checkReadiness,
};
