/**
 * End-to-end backend smoke test — exercises the real pipeline (Supabase +
 * the actual Anthropic/OpenAI provider calls), not mocks. Calls the same
 * Vercel handler modules the live HTTP endpoints use, in-process, via a
 * small req/res shim — so every fix that landed after the 2026-08-12
 * frontend/backend alignment audit (QA-confirmation gate on analysis,
 * QA-decision filtering on all deliverables, etc.) gets exercised exactly
 * as a real request would hit it.
 *
 * WHY IN-PROCESS RATHER THAN OVER HTTP: there's no dev server running in
 * most environments this gets executed from, and the handler modules
 * (api/runs/**\/*.js) are already isolated, single-purpose functions —
 * calling them directly with a req/res shim exercises the exact same code
 * a deployed request would hit, minus the HTTP transport itself.
 *
 * PREREQUISITES (this could not be verified by running it — see the
 * 2026-08-12 audit conversation for why):
 *   - Node.js and this repo's npm dependencies installed (`npm install`).
 *   - A `.env` file at the repo root with:
 *       SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (real project — this writes
 *         real rows to the `runs`/`sessions` tables, prefixed `smoketest_`)
 *       ANTHROPIC_API_KEY                          (or the relevant provider
 *         key if you change MODEL_PROVIDER below)
 *   - products/ACM.json present (it already is, in this repo).
 *
 * COST/RUNTIME: 2 personas x 1 task x 2 methodologies = 4 real LLM sessions,
 * plus 2 plan-generation calls, plus 2 Pass B calls, plus 2 report-writer
 * calls. Artefact grounding defaults to description-only (no vision calls,
 * no browser) to keep this cheap — set SMOKE_TEST_ARTEFACT_URL to a real
 * URL to exercise the Playwright/live-prototype path for Usability Testing
 * instead (A/B Testing cannot use a live URL at all — see evaluate.js's own
 * guard — so it always runs description-only).
 *
 * USAGE:
 *   node scripts/smoke-test-pipeline.js
 *
 * OUTPUT: a pass/fail table per methodology per step to stdout, plus a
 * JSON summary written to scripts/smoke-test-results.json. Non-zero exit
 * code if anything failed outright (not counting flagged-but-not-failed
 * "silent empty" warnings — see below).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const TIMEOUT_MS = Number(process.env.SMOKE_TEST_TIMEOUT_MS || 5 * 60 * 1000); // per evaluate() call
const ARTEFACT_URL = process.env.SMOKE_TEST_ARTEFACT_URL || null;

const runsHandler   = require('../api/runs/index');
const planHandler    = require('../api/runs/[id]/plan');
const evaluateHandler = require('../api/runs/[id]/evaluate');
const statusHandler   = require('../api/runs/[id]/status');
const reportHandler   = require('../api/runs/[id]/report');
const exportHandler   = require('../api/runs/[id]/export');

/* ── req/res shim — mirrors what every handler in api/ actually calls ── */
function makeRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    _body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this._body = obj; return this; },
    send(bufOrStr) { this._body = bufOrStr; return this; },
    setHeader(k, v) { this._headers[k] = v; return this; },
  };
  return res;
}

async function call(handler, { method = 'GET', query = {}, body } = {}) {
  const req = { method, query, body };
  const res = makeRes();
  await handler(req, res);
  return res;
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms timeout`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/* ── minimal valid intake payloads, one per methodology ── */
const PERSONA_SEGMENTS_BASE = [
  { name: 'Hakim',       context: 'Spontaneous Traditionalist — mobile-first, Sooka user, price-sensitive, impulsive.',       priority: 'primary',   persona_library_ref: 'spontaneous-traditionalist', include: false },
  { name: 'Syafiqah',    context: 'Progressive Influencer — urban professional, social-media driven.',                       priority: 'secondary', persona_library_ref: 'progressive-influencer',      include: false },
  { name: 'Marcus',      context: 'Trendsetter Explorer — high tech literacy, benchmarks against Netflix.',                  priority: 'secondary', persona_library_ref: 'trendsetter-explorer',        include: false },
  { name: 'Puan Rohani', context: 'Family-Centric Devotee — low tech literacy, family-first, long-term Astro customer.',      priority: 'primary',   persona_library_ref: 'family-centric-devotee',      include: false },
  { name: 'David',       context: 'Routine Conservative — habitual, risk-averse, long-term Astro subscriber.',               priority: 'secondary', persona_library_ref: 'routine-conservative',         include: false },
];

// Only 2 personas included, per the task's "keep runtime/cost down" instruction.
function personaSegments(includeCodes) {
  const codeToIndex = { ST: 0, PI: 1, TE: 2, FC: 3, RC: 4 };
  return PERSONA_SEGMENTS_BASE.map((s, i) => ({
    ...s,
    include: Object.entries(codeToIndex).some(([code, idx]) => idx === i && includeCodes.includes(code)),
  }));
}

function baseIntake(runId, methodology) {
  return {
    meta: { run_id: runId, researcher_name: 'Smoke Test', date_submitted: '', schema_version: '1.0' },
    q1_product: 'Astro.com.my',
    q2_context: {
      lifecycle: 'Live - scaling',
      design_phase: 'Test',
      fidelity: 'Mid-fidelity',
      artefact_notes: 'Smoke-test run generated by scripts/smoke-test-pipeline.js.',
      is_interactive_prototype: false,
      test_materials: {
        files: [],
        urls: ARTEFACT_URL && methodology === 'Usability Testing' ? [ARTEFACT_URL] : [],
      },
    },
    q3_goals: {
      insight_type: '', feature: 'Broadband plan discovery', why_now: '',
      primary_rq: 'Can users find and evaluate a broadband plan under RM150/month from the homepage?',
      secondary_rqs: '',
    },
    q4_personas: { selected: ['ST', 'FC'], priority_segment: 'ST' },
    q4_persona_segments: { segments: personaSegments(['ST', 'FC']), priority_segment: 'ST' },
    q5_product_context: {
      product_name: 'Astro.com.my', product_id: 'ACM',
      product_desc: 'Marketing and acquisition website',
      feature_under_test: 'Broadband plan discovery', why_this_why_now: '',
    },
    q7_constraints: { forbidden_assumptions: '' },
    q8_output: { model_providers: ['claude'], output_formats: [], additional_notes: '' },
  };
}

function usabilityIntake(runId) {
  const intake = baseIntake(runId, 'Usability Testing');
  intake.q6_methodology = {
    methodology: 'Usability Testing',
    scenario: 'You are a homeowner whose current broadband contract is ending soon and you are checking what this provider offers.',
    tasks: [{
      name: 'Find a broadband plan',
      instruction: 'You want fast home internet under RM150/month. Find a plan that fits and get as far as you can toward signing up.',
      whatToTest: 'Whether users can locate and evaluate broadband plans against a budget constraint.',
    }],
  };
  return intake;
}

function abIntake(runId) {
  const intake = baseIntake(runId, 'A/B Testing');
  // Comparative sessions cannot use a live browser-driven variant (evaluate.js
  // throws if either variant resolves to a live URL/rendered HTML) — both
  // variants must stay description/notes-only, which is also the cheapest path.
  intake.q6_methodology = {
    methodology: 'A/B Testing',
    scenario: 'You are a homeowner whose current broadband contract is ending soon and you are checking what this provider offers.',
    comparison_type: 'Copy / messaging',
    tasks: [{
      name: 'Find a broadband plan',
      instruction: 'You want fast home internet under RM150/month. Find a plan that fits and get as far as you can toward signing up.',
      whatToTest: 'Whether users can locate and evaluate broadband plans against a budget constraint.',
    }],
    variantB: {
      urls: [], files: [],
      notes: 'Same homepage, but the pricing table leads with the promotional price instead of the standard price.',
      is_interactive_prototype: false,
    },
  };
  return intake;
}

/* ── result tracking ── */
const results = [];
function record(methodology, step, pass, notes) {
  results.push({ methodology, step, pass, notes });
  const mark = pass === 'warn' ? '⚠' : pass ? '✓' : '✗';
  console.log(`  [${mark}] ${step}${notes ? ' — ' + notes : ''}`);
}

async function runForMethodology(methodology) {
  console.log(`\n=== ${methodology} ===`);
  const runId = `smoketest_${methodology === 'A/B Testing' ? 'ab' : 'usability'}_${Date.now()}`;
  const intake = methodology === 'A/B Testing' ? abIntake(runId) : usabilityIntake(runId);

  // Step 1 — createRun
  let res = await call(runsHandler, { method: 'POST', body: { runId, intake } });
  if (res.statusCode !== 200) {
    record(methodology, '1. createRun', false, `HTTP ${res.statusCode}: ${JSON.stringify(res._body)}`);
    return; // nothing downstream is reachable without a run
  }
  record(methodology, '1. createRun', true, `run_id=${runId}`);

  // Step 2 — startPlan, then assert methodology-appropriate fields on the
  // generated plan (not just a 200).
  res = await call(planHandler, { method: 'POST', query: { id: runId } });
  if (res.statusCode !== 200) {
    record(methodology, '2. startPlan', false, `HTTP ${res.statusCode}: ${JSON.stringify(res._body)}`);
    return;
  }
  const planRes = await call(planHandler, { method: 'GET', query: { id: runId } });
  const plan = planRes._body;
  const scenarios = plan?.test_scenarios?.scenarios || [];
  const firstTask = scenarios[0] || {};
  const hasBaseConditions = !!firstTask.success_condition && !!firstTask.abandon_condition;
  if (methodology === 'Usability Testing') {
    record(methodology, '2. startPlan', hasBaseConditions,
      hasBaseConditions ? 'success_condition/abandon_condition present on T1' : 'MISSING success_condition/abandon_condition on generated task');
  } else {
    const variants = plan?.study_context?.artefact_config?.variants || [];
    const evalKeys  = plan?.eval_metrics?.default_keys || [];
    const hasVariants = Array.isArray(variants) && variants.length === 2;
    const hasPrefFields = evalKeys.includes('preferred_variant') && evalKeys.includes('preference_reasoning');
    const pass = hasBaseConditions && hasVariants && hasPrefFields;
    record(methodology, '2. startPlan', pass,
      `success/abandon_condition=${hasBaseConditions}, variants(2)=${hasVariants}, preferred_variant+preference_reasoning in eval_metrics=${hasPrefFields}`);
  }

  // Step 3 — startEvaluation, bounded by TIMEOUT_MS.
  try {
    res = await withTimeout(call(evaluateHandler, { method: 'POST', query: { id: runId } }), TIMEOUT_MS, 'startEvaluation');
  } catch (err) {
    record(methodology, '3. startEvaluation', false, err.message);
    return;
  }
  if (res.statusCode !== 200) {
    record(methodology, '3. startEvaluation', false, `HTTP ${res.statusCode}: ${JSON.stringify(res._body)}`);
    return;
  }
  record(methodology, '3. startEvaluation', true, `sessions_count=${res._body.sessions_count}`);

  // Step 4a — QA gate produces a flagged/valid split.
  const qaGetRes = await call(statusHandler, { method: 'GET', query: { id: runId, action: 'qa_review' } });
  const qaSessions = qaGetRes._body?.sessions || [];
  const anyComputed = qaGetRes.statusCode === 200 && Array.isArray(qaSessions);
  record(methodology, '4a. QA gate computes flags', anyComputed,
    anyComputed ? `${qaSessions.length} session(s), ${qaSessions.filter(s => s.flags.length > 0).length} flagged` : `HTTP ${qaGetRes.statusCode}`);

  // Step 4b — pipeline must NOT auto-advance to analysis without confirm.
  const preConfirmAnalysis = await call(reportHandler, { method: 'POST', query: { id: runId, action: 'analysis' } });
  const correctlyBlocked = preConfirmAnalysis.statusCode === 409;
  record(methodology, '4b. Analysis blocked before QA confirm', correctlyBlocked,
    correctlyBlocked ? '409 as expected' : `expected 409, got HTTP ${preConfirmAnalysis.statusCode} — QA gate is NOT enforced`);

  // Step 5 — send the confirm call (include everyone, with a reason so any
  // override — e.g. including a flagged too-short session — doesn't 400),
  // then assert analysis.json comes back populated.
  const decisions = qaSessions.map(s => ({ persona_id: s.persona_id, decision: 'include', reason: 'Smoke test — including all sessions.' }));
  const confirmRes = await call(statusHandler, {
    method: 'POST', query: { id: runId, action: 'qa_review' }, body: { decisions },
  });
  const confirmed = confirmRes.statusCode === 200 && !!confirmRes._body?.qa_review?.confirmed_at;
  record(methodology, '5a. QA review confirm', confirmed, confirmed ? 'confirmed_at set' : `HTTP ${confirmRes.statusCode}: ${JSON.stringify(confirmRes._body)}`);

  const analysisRes = await call(reportHandler, { method: 'POST', query: { id: runId, action: 'analysis' } });
  if (analysisRes.statusCode !== 200) {
    record(methodology, '5b. Generate analysis', false, `HTTP ${analysisRes.statusCode}: ${JSON.stringify(analysisRes._body)}`);
  } else {
    // NOTE: the task brief calls these "quant_rollup"/"theme_clusters" — the
    // real field names in this codebase are pass_a/pass_b (src/lib/analysis.js).
    // Asserting against the real names here rather than the brief's.
    const passA = analysisRes._body.pass_a;
    const passB = analysisRes._body.pass_b;
    const passAOk = !!passA && !!passA.overall && Object.keys(passA.overall).length > 0;
    record(methodology, '5b. Pass A (quant rollup) populated', passAOk, passAOk ? `${Object.keys(passA.overall).length} field(s) in overall slice` : 'pass_a.overall empty or missing');

    if (!passB || !Array.isArray(passB.themes)) {
      record(methodology, '5c. Pass B (theme clustering) populated', false, 'pass_b.themes missing entirely');
    } else if (passB.themes.length === 0) {
      // This is the exact "silent empty, technically valid" case flagged in
      // the task brief — generatePassB() returns {themes:[]} with NO error
      // when no session has usable deliverables (src/lib/analysis.js:211).
      // Report it as a warning, not a straight pass, so it doesn't get lost
      // in a green checkmark.
      record(methodology, '5c. Pass B (theme clustering) populated', 'warn', 'pass_b.themes is EMPTY — returned successfully with no error (silent-empty, not a hard failure — see src/lib/analysis.js generatePassB). With only 2 sessions / 1 task this can be a real "not enough material" case, not necessarily a bug — inspect manually.');
    } else {
      const strengths = new Set(passB.themes.map(t => t.signal_strength));
      record(methodology, '5c. Pass B (theme clustering) populated', true, `${passB.themes.length} theme(s), signal_strength values seen: ${[...strengths].join(', ')}`);
    }
  }

  // Step 6 — all three deliverable types.
  const xlsxRes = await call(exportHandler, { method: 'GET', query: { id: runId, type: 'xlsx' } });
  record(methodology, '6a. Raw XLSX export', xlsxRes.statusCode === 200, xlsxRes.statusCode === 200 ? `${(xlsxRes._body?.length || 0)} bytes` : `HTTP ${xlsxRes.statusCode}: ${JSON.stringify(xlsxRes._body)}`);

  const docxRes = await call(exportHandler, { method: 'GET', query: { id: runId, type: 'docx' } });
  record(methodology, '6b. Raw DOCX transcript export', docxRes.statusCode === 200, docxRes.statusCode === 200 ? `${(docxRes._body?.length || 0)} bytes` : `HTTP ${docxRes.statusCode}: ${JSON.stringify(docxRes._body)}`);

  const analyzedDocxRes = await call(exportHandler, { method: 'GET', query: { id: runId, type: 'analyzed_report_docx' } });
  record(methodology, '6c. Analyzed Word report export', analyzedDocxRes.statusCode === 200, analyzedDocxRes.statusCode === 200 ? `${(analyzedDocxRes._body?.length || 0)} bytes` : `HTTP ${analyzedDocxRes.statusCode}: ${JSON.stringify(analyzedDocxRes._body)}`);

  const deliverablesRes = await call(reportHandler, { method: 'GET', query: { id: runId } });
  const deliverablesOk = deliverablesRes.statusCode === 200 && Array.isArray(deliverablesRes._body?.deliverables) && deliverablesRes._body.deliverables.length > 0;
  record(methodology, '6d. Per-session deliverables (getDeliverables)', deliverablesOk, deliverablesOk ? `${deliverablesRes._body.deliverables.length} deliverable(s)` : `HTTP ${deliverablesRes.statusCode}`);
}

(async () => {
  for (const methodology of ['Usability Testing', 'A/B Testing']) {
    try {
      await runForMethodology(methodology);
    } catch (err) {
      record(methodology, 'UNCAUGHT ERROR', false, err.stack || err.message);
    }
  }

  console.log('\n=== Summary ===');
  const failed = results.filter(r => r.pass === false);
  const warned = results.filter(r => r.pass === 'warn');
  console.table(results.map(r => ({ methodology: r.methodology, step: r.step, result: r.pass === 'warn' ? 'WARN' : r.pass ? 'PASS' : 'FAIL', notes: r.notes })));

  const outPath = path.join(__dirname, 'smoke-test-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results written to ${outPath}`);
  console.log(`${results.length - failed.length - warned.length} passed, ${warned.length} warned, ${failed.length} failed.`);

  process.exit(failed.length > 0 ? 1 : 0);
})().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
