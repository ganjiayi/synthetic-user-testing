#!/usr/bin/env node

/**
 * generatePlan.js
 *
 * Reads a validated intake.json from a run folder, calls the configured
 * model provider (Claude or OpenAI) using the research-planner agent system
 * prompt, and writes a fully populated plan.json into the same run folder.
 *
 * Usage:
 *   node src/pipeline/generatePlan.js <run_folder> [--model claude|openai]
 *
 * Example:
 *   node src/pipeline/generatePlan.js runs/21042026_onboarding-activation --model openai
 *
 * Requires:
 *   - intake.json in the run folder (produced by parseIntake.js)
 *   - .claude/agents/research-planner.md (system prompt)
 *   - For OpenAI: OPENAI_API_KEY in .env
 *
 * Output: runs/<run_folder>/plan.json
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

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

// ─── Call model via provider abstraction ─────────────────────────────────────
async function callPlannerAgent(provider, systemPrompt, userMessage) {
  console.log(`   Calling ${provider.modelName} via ${provider.id} provider...`);
  const startTime = Date.now();
  const response  = await provider.call(systemPrompt, userMessage);
  const elapsed   = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   Response received in ${elapsed}s`);
  return response;
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
    model:           plan._provider?.modelName || 'unknown',
    provider:        plan._provider?.id        || 'unknown',
    source_intake:   'intake.json',
    researcher:      intake.meta.researcher_name,
    product:         intake.q5_product_context.product_name,
    feature:         intake.q5_product_context.feature_under_test,
    plan_version:    '1.0',
  };
  delete plan._provider;

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
    console.error('Usage: node src/pipeline/generatePlan.js <run_folder> [--model claude|openai]');
    console.error('Example: node src/pipeline/generatePlan.js runs/21042026_onboarding-activation --model openai');
    process.exit(1);
  }

  const absRunFolder = path.resolve(runFolder);
  if (!fs.existsSync(absRunFolder)) {
    console.error(`Run folder not found: ${absRunFolder}`);
    process.exit(1);
  }

  // Resolve model provider
  const { getProvider } = require('../providers');
  const provider = await getProvider();
  console.log(`\n🤖 Model: ${provider.modelName} (${provider.id})`);

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
  console.log(`\n📋 Loaded research-planner system prompt (${systemPrompt.length} chars)`);

  // Build message and call model
  const userMessage = buildUserMessage(intake);
  console.log('\n🚀 Generating study plan...');

  appendRunLog(absRunFolder, `generatePlan started — provider: ${provider.id} — model: ${provider.modelName}`);

  const rawResponse = await callPlannerAgent(provider, systemPrompt, userMessage);

  // Parse plan
  const plan = parsePlanResponse(rawResponse, intake);
  plan._meta.model    = provider.modelName;
  plan._meta.provider = provider.id;

  // Write plan.json
  const planPath = writePlan(absRunFolder, plan);
  appendRunLog(absRunFolder, `generatePlan complete — plan written to ${planPath}`);

  // Summary
  printPlanSummary(plan, intake);

  console.log(`\n✅ Plan written to: ${planPath}`);
  console.log('\nNext step: node src/pipeline/evaluator.js ' + runFolder);
}

main().catch(err => {
  console.error('\n❌ Plan generation failed:', err.message);
  process.exit(1);
});
