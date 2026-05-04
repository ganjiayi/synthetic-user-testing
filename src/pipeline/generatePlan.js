#!/usr/bin/env node

/**
 * generatePlan.js
 *
 * Reads a validated intake.json from a run folder, calls the Claude API
 * using the research-planner agent system prompt, and writes a fully
 * populated plan.json into the same run folder.
 *
 * Usage:
 *   node src/pipeline/generatePlan.js <run_folder>
 *
 * Example:
 *   node src/pipeline/generatePlan.js runs/21042026_onboarding-activation
 *
 * Requires:
 *   - Claude Code CLI installed and authenticated (claude.ai subscription)
 *   - intake.json in the run folder (produced by parseIntake.js)
 *   - .claude/agents/research-planner.md (system prompt)
 *
 * Output: runs/<run_folder>/plan.json
 */

const fs             = require('fs');
const os             = require('os');
const path           = require('path');
const { spawnSync }  = require('child_process');

// ─── Config ──────────────────────────────────────────────────────────────────
const MODEL          = 'claude-sonnet-4-6';
const PLANNER_PROMPT = path.join(__dirname, '../../.claude/agents/research-planner.md');

// ─── Load system prompt ───────────────────────────────────────────────────────
function loadSystemPrompt() {
  if (!fs.existsSync(PLANNER_PROMPT)) {
    console.error(`System prompt not found: ${PLANNER_PROMPT}`);
    console.error('Create .claude/agents/research-planner.md before running this script.');
    process.exit(1);
  }
  return fs.readFileSync(PLANNER_PROMPT, 'utf8');
}

// ─── Build user message ───────────────────────────────────────────────────────
function buildUserMessage(intake) {
  return `You are generating a Synthetic UX Research Study Plan from a validated intake config.

Here is the complete intake for this study:

\`\`\`json
${JSON.stringify(intake, null, 2)}
\`\`\`

Generate a complete study plan as a single JSON object following the plan schema exactly.
Respond with ONLY the JSON object — no preamble, no markdown fences, no explanation.`;
}

// ─── Find claude CLI binary ───────────────────────────────────────────────────
function findClaudeBinary() {
  // Check PATH first
  const fromPath = spawnSync('which', ['claude'], { encoding: 'utf8' });
  if (fromPath.status === 0 && fromPath.stdout.trim()) return fromPath.stdout.trim();

  // macOS app install location — pick highest version
  const baseDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude-code');
  if (fs.existsSync(baseDir)) {
    const versions = fs.readdirSync(baseDir).sort().reverse();
    for (const v of versions) {
      const bin = path.join(baseDir, v, 'claude.app', 'Contents', 'MacOS', 'claude');
      if (fs.existsSync(bin)) return bin;
    }
  }

  throw new Error(
    'claude binary not found. Ensure Claude Code is installed and authenticated.'
  );
}

// ─── Call Claude via CLI ──────────────────────────────────────────────────────
async function callPlannerAgent(systemPrompt, userMessage) {
  const claudeBin = findClaudeBinary();

  console.log(`   Calling ${MODEL} via claude CLI...`);
  const startTime = Date.now();

  // Write system prompt to a temp file to avoid shell arg length limits
  const tmpSystem = path.join(os.tmpdir(), `research-planner-${Date.now()}.txt`);
  fs.writeFileSync(tmpSystem, systemPrompt, 'utf8');

  let result;
  try {
    result = spawnSync(claudeBin, [
      '--print',
      '--model',          MODEL,
      '--system-prompt',  fs.readFileSync(tmpSystem, 'utf8'),
      '--tools',          '',
      '--no-session-persistence',
      userMessage,
    ], {
      encoding:  'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout:   180000,
    });
  } finally {
    fs.unlinkSync(tmpSystem);
  }

  if (result.error) throw new Error(`Failed to spawn claude: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`claude CLI exited with code ${result.status}:\n${result.stderr}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   Response received in ${elapsed}s`);

  return result.stdout;
}

// ─── Parse and validate plan JSON ────────────────────────────────────────────
function parsePlanResponse(rawText, intake) {
  // Strip any accidental markdown fences
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let plan;
  try {
    plan = JSON.parse(cleaned);
  } catch (err) {
    console.error('\n❌ Failed to parse plan JSON from API response.');
    console.error('   Raw response preview:', rawText.slice(0, 300));
    throw new Error(`JSON parse error: ${err.message}`);
  }

  // Inject meta fields from intake
  plan._meta = {
    run_id:          intake.meta.run_id,
    generated_at:    new Date().toISOString(),
    model:           MODEL,
    source_intake:   'intake.json',
    researcher:      intake.meta.researcher_name,
    product:         intake.q5_product_context.product_name,
    feature:         intake.q5_product_context.feature_under_test,
    plan_version:    '1.0',
  };

  return plan;
}

// ─── Write outputs ────────────────────────────────────────────────────────────
function writePlan(runFolder, plan) {
  const planPath = path.join(runFolder, 'plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  return planPath;
}

function appendRunLog(runFolder, entry) {
  const logPath = path.join(runFolder, 'run.log');
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${entry}\n`;
  fs.appendFileSync(logPath, logLine);
}

// ─── Summary printer ──────────────────────────────────────────────────────────
function printPlanSummary(plan, intake) {
  console.log('\n📋 Plan summary:');

  const sections = [
    'study_context',
    'research_goals',
    'user_segments',
    'test_scenarios',
    'eval_metrics',
    'hypotheses',
    'method',
    'output_handoff',
  ];

  for (const section of sections) {
    const present = plan[section] !== undefined;
    console.log(`   ${present ? '✓' : '✗'} ${section}`);
  }

  // Key derived fields check
  const apiMode           = plan.study_context?.artefact_config?.api_mode;
  const frictionSens      = plan.study_context?.artefact_config?.friction_sensitivity;
  const agentCalibration  = plan.study_context?.product_phase?.agent_calibration;

  console.log('\n🔧 Auto-derived fields:');
  console.log(`   API mode:             ${apiMode || '(missing)'}`);
  console.log(`   Friction sensitivity: ${frictionSens || '(missing)'}`);
  console.log(`   Agent calibration:    ${agentCalibration || '(missing)'}`);

  // Persona and task counts
  const personaCount = plan.user_segments?.segments?.length || 0;
  const taskCount    = plan.test_scenarios?.scenarios?.length || 0;
  console.log(`\n👥 Personas in plan:  ${personaCount}`);
  console.log(`📝 Tasks in plan:     ${taskCount}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const runFolder = process.argv[2];
  if (!runFolder) {
    console.error('Usage: node src/pipeline/generatePlan.js <run_folder>');
    console.error('Example: node src/pipeline/generatePlan.js runs/21042026_onboarding-activation');
    process.exit(1);
  }

  const absRunFolder = path.resolve(runFolder);
  if (!fs.existsSync(absRunFolder)) {
    console.error(`Run folder not found: ${absRunFolder}`);
    process.exit(1);
  }

  // Load intake.json
  const intakePath = path.join(absRunFolder, 'intake.json');
  if (!fs.existsSync(intakePath)) {
    console.error(`intake.json not found in ${absRunFolder}`);
    console.error('Run parseIntake.js first.');
    process.exit(1);
  }

  const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
  console.log(`\n📥 Loaded intake: ${intake.meta.run_id}`);
  console.log(`   Researcher:  ${intake.meta.researcher_name || '(unknown)'}`);
  console.log(`   Product:     ${intake.q5_product_context.product_name || '(unknown)'}`);
  console.log(`   Status:      ${intake._derived?.validation_status || 'unknown'}`);

  if (intake._derived?.validation_status === 'invalid') {
    console.error('\n❌ Intake has validation errors. Fix intake.json before generating plan.');
    process.exit(1);
  }

  if (intake._derived?.warnings?.length > 0) {
    console.log('\n⚠️  Intake warnings (plan will be generated but review these):');
    intake._derived.warnings.forEach(w => console.log(`   - ${w}`));
  }

  // Load system prompt
  const systemPrompt = loadSystemPrompt();
  console.log(`\n🤖 Loaded research-planner system prompt (${systemPrompt.length} chars)`);

  // Build message and call API
  const userMessage = buildUserMessage(intake);
  console.log('\n🚀 Generating study plan...');

  appendRunLog(absRunFolder, `generatePlan started — intake: ${intakePath}`);

  const rawResponse = await callPlannerAgent(systemPrompt, userMessage);

  // Parse plan
  const plan = parsePlanResponse(rawResponse, intake);

  // Write plan.json
  const planPath = writePlan(absRunFolder, plan);
  appendRunLog(absRunFolder, `generatePlan complete — plan written to ${planPath}`);

  // Summary
  printPlanSummary(plan, intake);

  console.log(`\n✅ Plan written to: ${planPath}`);
  console.log('\nNext step: node src/pipeline/runner.js ' + runFolder);
}

main().catch(err => {
  console.error('\n❌ Plan generation failed:', err.message);
  process.exit(1);
});
