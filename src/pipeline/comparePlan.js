#!/usr/bin/env node

/**
 * comparePlan.js — run generatePlan with BOTH Claude and OpenAI and diff the outputs.
 *
 * Specifically designed to catch the null-field problem seen with OpenAI on Vercel:
 * after both plans are generated, it prints a null/missing field audit side by side.
 *
 * Usage:
 *   node src/pipeline/comparePlan.js <run_folder>
 *
 * Example:
 *   node src/pipeline/comparePlan.js runs/19052026_tvpack-messaging-test
 *
 * Output:
 *   runs/<run>/plan_claude.json    — Claude plan
 *   runs/<run>/plan_openai.json   — OpenAI plan
 *   runs/<run>/plan_diff.json     — field-by-field null audit
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const PLANNER_PROMPT_PATH = path.join(__dirname, '../../.claude/agents/research-planner.md');
const DIVIDER = '─'.repeat(64);
const HEADER  = '═'.repeat(64);

// ─── Load inputs ───────────────────────────────────────────────────────────────
function loadIntake(runFolder) {
  const p = path.join(runFolder, 'intake.json');
  if (!fs.existsSync(p)) {
    console.error(`intake.json not found in ${runFolder}`);
    console.error('Create intake.json first (or run parseIntake.js with a .docx).');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadPlannerPrompt() {
  if (!fs.existsSync(PLANNER_PROMPT_PATH)) {
    console.error(`Planner prompt not found: ${PLANNER_PROMPT_PATH}`);
    process.exit(1);
  }
  return fs.readFileSync(PLANNER_PROMPT_PATH, 'utf8');
}

function buildUserMessage(intake) {
  return `You are generating a Synthetic UX Research Study Plan from a validated intake config.

Here is the complete intake for this study:

\`\`\`json
${JSON.stringify(intake, null, 2)}
\`\`\`

Generate a complete study plan as a single JSON object following the plan schema exactly.
Respond with ONLY the JSON object — no preamble, no markdown fences, no explanation.`;
}

// ─── Call providers ────────────────────────────────────────────────────────────
function callClaude(systemPrompt, userMessage) {
  const claudeProvider = require('../providers/claude');
  return Promise.resolve(claudeProvider.call(systemPrompt, userMessage));
}

function callOpenAI(systemPrompt, userMessage) {
  const openaiProvider = require('../providers/openai');
  return openaiProvider.call(systemPrompt, userMessage);
}

// ─── Parse plan JSON ──────────────────────────────────────────────────────────
function parsePlan(rawText, providerName) {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i,    '')
    .replace(/```\s*$/i,    '')
    .trim();

  try {
    return { ok: true, plan: JSON.parse(cleaned) };
  } catch (err) {
    return {
      ok:    false,
      error: `JSON parse failed: ${err.message}`,
      preview: rawText.slice(0, 300),
    };
  }
}

// ─── Null field audit ─────────────────────────────────────────────────────────
const EXPECTED_FIELDS = [
  'study_context.product_phase.lifecycle',
  'study_context.product_phase.agent_calibration',
  'study_context.design_phase.phase',
  'study_context.design_phase.research_focus',
  'study_context.artefact_config.input_format',
  'study_context.artefact_config.api_mode',
  'study_context.artefact_config.friction_sensitivity',
  'study_context.artefact_config.artefact_notes',
  'research_goals.core_question',
  'research_goals.product_name',
  'research_goals.feature_under_test',
  'research_goals.primary_rq',
  'research_goals.decision_to_support',
  'user_segments.segments',
  'user_segments.priority_segment',
  'test_scenarios.session_config.max_turns',
  'test_scenarios.scenarios',
  'eval_metrics.default_keys',
  'eval_metrics.all_keys',
  'eval_metrics.primary_metric',
  'hypotheses.list',
  'hypotheses.known_ux_risks',
  'hypotheses.forbidden_assumptions',
  'method.orchestration',
  'method.session_flow',
  'method.limitations',
  'output_handoff.primary_audience',
  'output_handoff.output_formats',
  'output_handoff.report_parts',
];

function getNestedValue(obj, path) {
  return path.split('.').reduce((cur, key) => (cur != null ? cur[key] : undefined), obj);
}

function auditNulls(plan) {
  const issues = [];
  const ok     = [];

  for (const field of EXPECTED_FIELDS) {
    const val = getNestedValue(plan, field);
    if (val === null || val === undefined || val === '') {
      issues.push({ field, value: val });
    } else if (Array.isArray(val) && val.length === 0) {
      issues.push({ field, value: '[]', note: 'empty array' });
    } else {
      ok.push(field);
    }
  }

  return { issues, ok, total: EXPECTED_FIELDS.length };
}

function printAudit(label, result) {
  if (!result.ok) {
    console.log(`\n${label} — PARSE FAILED`);
    console.log(DIVIDER);
    console.log(`Error: ${result.error}`);
    console.log(`Raw preview:\n${result.preview}`);
    return;
  }

  const audit = auditNulls(result.plan);
  const score = audit.ok.length;
  const total = audit.total;

  console.log(`\n${label} — ${score}/${total} fields populated`);
  console.log(DIVIDER);

  if (audit.issues.length === 0) {
    console.log('  ✓ No null or missing fields');
  } else {
    console.log(`  ✗ ${audit.issues.length} null/missing/empty fields:`);
    for (const { field, note } of audit.issues) {
      console.log(`    • ${field}${note ? ` (${note})` : ''}`);
    }
  }

  // Show method section (the free-text reasoning section — most likely to diverge)
  const method = result.plan.method;
  if (method) {
    console.log(`\n  method.orchestration:\n    ${(method.orchestration || '[null]').slice(0, 200)}`);
    console.log(`\n  method.limitations:\n    ${(method.limitations || '[null]').slice(0, 200)}`);
    if (Array.isArray(method.session_flow)) {
      console.log(`\n  method.session_flow (${method.session_flow.length} steps):`);
      method.session_flow.forEach((s, i) => console.log(`    ${i + 1}. ${s}`));
    }
  }
}

// ─── Write outputs ────────────────────────────────────────────────────────────
function writeOutputs(runFolder, claudeResult, openaiResult) {
  if (claudeResult.ok) {
    fs.writeFileSync(
      path.join(runFolder, 'plan_claude.json'),
      JSON.stringify(claudeResult.plan, null, 2)
    );
  }
  if (openaiResult.ok) {
    fs.writeFileSync(
      path.join(runFolder, 'plan_openai.json'),
      JSON.stringify(openaiResult.plan, null, 2)
    );
  }

  const diff = {
    generated_at: new Date().toISOString(),
    claude: claudeResult.ok
      ? { parsed: true,  audit: auditNulls(claudeResult.plan) }
      : { parsed: false, error: claudeResult.error },
    openai: openaiResult.ok
      ? { parsed: true,  audit: auditNulls(openaiResult.plan) }
      : { parsed: false, error: openaiResult.error },
  };

  fs.writeFileSync(path.join(runFolder, 'plan_diff.json'), JSON.stringify(diff, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const runFolder = process.argv[2];
  if (!runFolder) {
    console.error('Usage: node src/pipeline/comparePlan.js <run_folder>');
    console.error('Example: node src/pipeline/comparePlan.js runs/19052026_tvpack-messaging-test');
    process.exit(1);
  }

  const absRunFolder = path.resolve(runFolder);
  const intake       = loadIntake(absRunFolder);
  const systemPrompt = loadPlannerPrompt();
  const userMessage  = buildUserMessage(intake);

  console.log(`\n${HEADER}`);
  console.log(`  Plan Generation Comparison`);
  console.log(`  Run: ${intake.meta.run_id}`);
  console.log(`  Product: ${intake.q5_product_context.product_name} — ${intake.q5_product_context.feature_under_test}`);
  console.log(HEADER);
  console.log(`\n  Claude : ${process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'}`);
  console.log(`  OpenAI : ${process.env.OPENAI_MODEL  || 'gpt-4o'}`);
  console.log(`  Intake : ${intake._derived.active_personas.length} personas, ${intake._derived.active_tasks.length} tasks`);
  console.log('\n  Calling both models in parallel...\n');

  const [claudeRaw, openaiRaw] = await Promise.allSettled([
    callClaude(systemPrompt, userMessage),
    callOpenAI(systemPrompt, userMessage),
  ]);

  const claudeResult = claudeRaw.status === 'fulfilled'
    ? parsePlan(claudeRaw.value, 'claude')
    : { ok: false, error: String(claudeRaw.reason?.message || claudeRaw.reason), preview: '' };

  const openaiResult = openaiRaw.status === 'fulfilled'
    ? parsePlan(openaiRaw.value, 'openai')
    : { ok: false, error: String(openaiRaw.reason?.message || openaiRaw.reason), preview: '' };

  // Print audits
  printAudit(`CLAUDE  (${process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'})`, claudeResult);
  printAudit(`OPENAI  (${process.env.OPENAI_MODEL || 'gpt-4o'})`, openaiResult);

  // Write files
  writeOutputs(absRunFolder, claudeResult, openaiResult);

  const claudePlanPath = path.join(absRunFolder, 'plan_claude.json');
  const openaiPlanPath = path.join(absRunFolder, 'plan_openai.json');
  const diffPath       = path.join(absRunFolder, 'plan_diff.json');

  console.log(`\n${HEADER}`);
  console.log('  Output files');
  console.log(HEADER);
  if (claudeResult.ok) console.log(`  plan_claude.json → ${claudePlanPath}`);
  if (openaiResult.ok) console.log(`  plan_openai.json → ${openaiPlanPath}`);
  console.log(`  plan_diff.json   → ${diffPath}`);
  console.log('\n  Next step: review plan_diff.json for null fields, then run the evaluator.');
}

main().catch(err => {
  console.error('\n❌ comparePlan failed:', err.message);
  process.exit(1);
});
