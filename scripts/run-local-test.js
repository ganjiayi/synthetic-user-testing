/**
 * Drives the real synthetic-research pipeline locally for a one-off test:
 * research-planner.md -> simulation-runner.md -> raw outputs (CSV / docx / pptx).
 *
 * Calls the same library functions the live API endpoints use
 * (getMethodologyConfig, evaluate.js's runPersonaSession, browser-session.js,
 * the claude provider) directly, in-process — skipping Supabase persistence
 * so this doesn't write a row into production run history.
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const { getMethodologyConfig } = require('../src/lib/methodology-config');
const { loadPersonaPrompts, loadSimulationPrompt, runPersonaSession } = require('../src/lib/evaluate');
const browserSessionLib = require('../src/lib/browser-session');
const { buildCsv, buildDocxTranscript, buildPptxPresentation } = require('./local-report-helpers');

const ARTEFACT_PATH = path.join(os.homedir(), 'Downloads', 'Astro Boxless Landing (standalone).html');
const OUT_DIR        = path.join(os.homedir(), 'Downloads', 'synthux-local-test-output');

const RUN_ID = `local_test_${Date.now()}`;

const intake = {
  meta: { run_id: RUN_ID, researcher_name: '', date_submitted: '', schema_version: '1.0' },
  q1_product: 'Astro.com.my',
  q2_context: {
    lifecycle: 'Live - scaling',
    design_phase: 'Test',
    fidelity: 'High-fidelity prototype',
    artefact_notes: 'Astro Boxless Landing (standalone HTML export)',
    is_interactive_prototype: true,
    test_materials: { files: [], urls: [`file://${ARTEFACT_PATH}`] },
  },
  q3_goals: {
    insight_type: '', feature: 'Homepage messaging and flow', why_now: '',
    primary_rq: "What is the user's impression of the homepage in terms messaging and flow?",
    secondary_rqs: '', decision_to_support: '',
  },
  q4_personas: { selected: ['PI'], priority_segment: 'PI' },
  q5_product_context: {
    product_name: 'Astro.com.my', product_id: 'ACM',
    product_desc: 'Marketing and acquisition website',
    feature_under_test: 'Homepage messaging and flow', why_this_why_now: '',
  },
  q6_methodology: {
    methodology: 'Usability Testing',
    scenario: 'You have landed on an Astro advertisement advertising a new product launch. You are curious and engage with the advertising, which brings you to the astro.com.my landing page.',
    tasks: [
      {
        name: 'Home/Impression',
        instruction: 'Without clicking on anything, explore the information here and tell me: a) What are the TV packs available? b) What are the prices of each Astro pack? c) What devices can you watch Astro on?',
        whatToTest: "1. Users' impression of what they can do with the website\n2. Are users confused about the information presented?\n3. What information would users like to know before purchasing?",
      },
    ],
  },
  q7_personas: {
    segments: [
      { name: 'Hakim',       context: 'Spontaneous Traditionalist — mobile-first, Sooka user, price-sensitive, impulsive.', priority: 'primary',   persona_library_ref: 'v4_spontaneous_traditionalist', include: false },
      { name: 'Syafiqah',    context: 'Progressive Influencer — urban professional, social-media driven.',                 priority: 'secondary', persona_library_ref: 'v4_progressive_influencer',     include: true },
      { name: 'Marcus',      context: 'Trendsetter Explorer — high tech literacy, benchmarks against Netflix.',            priority: 'secondary', persona_library_ref: 'v4_trendsetter_explorer',        include: false },
      { name: 'Puan Rohani', context: 'Family-Centric Devotee — low tech literacy, family-first, long-term Astro customer.', priority: 'primary',  persona_library_ref: 'v4_family_centric_devotee',      include: false },
      { name: 'David',       context: 'Routine Conservative — habitual, risk-averse, long-term Astro subscriber.',          priority: 'secondary', persona_library_ref: 'v4_routine_conservative',        include: false },
    ],
    priority_segment: 'PI',
  },
  q7_hypotheses: { h1: '', h2: '', h3: '', known_risks: '', forbidden_assumptions: '' },
  q8_output: { model_providers: ['claude'], audience: [], output_formats: ['Word doc', 'Presentation'], additional_notes: '' },
};

async function generatePlan(provider) {
  const promptPath   = path.join(process.cwd(), '.claude/agents/research-planner.md');
  const systemPrompt = fs.readFileSync(promptPath, 'utf8');

  const productId = intake.q5_product_context.product_id;
  let productBlock = '';
  const productPath = path.join(process.cwd(), `products/${productId}.json`);
  if (fs.existsSync(productPath)) {
    const productDB = JSON.parse(fs.readFileSync(productPath, 'utf8'));
    productBlock = ['', `Here is the product database context for ${productId}. Use it to enrich the study plan with product-specific flows, known pain points, UX history, and audience context:`, '', '```json', JSON.stringify(productDB, null, 2), '```'].join('\n');
  }

  const methodology       = intake.q6_methodology.methodology;
  const methodologyConfig = getMethodologyConfig(methodology);
  const methodologyBlock = ['', `Here is the pre-resolved Methodology Configuration block for "${methodology}". Use its values directly as instructed in the system prompt:`, '', '```json', JSON.stringify({
    eval_metrics_keys: methodologyConfig.eval_schema.fields.map(f => f.key).concat(['task_completion', 'abandon_trigger', 'persona_alignment_note']),
    success_condition: methodologyConfig.task_derivation.success_condition,
    abandon_condition: methodologyConfig.task_derivation.abandon_condition,
    session_config:    methodologyConfig.session_config,
  }, null, 2), '```'].join('\n');

  const userMessage = [
    'You are generating a Synthetic UX Research Study Plan from a validated intake config.',
    '', 'Here is the complete intake for this study:', '',
    '```json', JSON.stringify(intake, null, 2), '```',
    productBlock, methodologyBlock,
    'Generate a complete study plan as a single JSON object following the plan schema exactly.',
    'Respond with ONLY the JSON object — no preamble, no markdown fences, no explanation.',
  ].join('\n');

  console.log('→ Calling Claude for plan generation...');
  const rawResponse = await provider.call(systemPrompt, userMessage);
  const cleaned = rawResponse.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const plan = JSON.parse(cleaned);
  plan.methodology_config = methodologyConfig;
  plan._meta = { run_id: RUN_ID, generated_at: new Date().toISOString(), model: provider.modelName, provider: provider.id, plan_version: '1.0' };
  return plan;
}

async function runEvaluation(provider, plan) {
  const personaLib = loadPersonaPrompts();
  const simPrompt  = loadSimulationPrompt();
  const persona    = (plan.user_segments?.segments || []).find(s => s.include !== false);
  const tasks      = plan.test_scenarios?.scenarios || [];

  const artefactCfg     = plan.study_context?.artefact_config || {};
  const isLivePrototype = artefactCfg.artefact_type === 'interactive_prototype' && !!artefactCfg.artefact_link;
  console.log(`→ Artefact type: ${artefactCfg.artefact_type}, live prototype: ${isLivePrototype}`);

  let browserSession = null;
  if (isLivePrototype) {
    console.log(`→ Opening local browser session against ${artefactCfg.artefact_link}`);
    browserSession = await browserSessionLib.openSession(artefactCfg.artefact_link);
  }

  console.log(`→ Running persona session for ${persona.name} via Claude...`);
  let session;
  try {
    session = await runPersonaSession(provider, persona, tasks, plan, personaLib, simPrompt, { browserSession });
  } finally {
    if (browserSession) await browserSessionLib.closeSession(browserSession);
  }
  session.provider = provider.id;
  return session;
}

(async () => {
  if (!fs.existsSync(ARTEFACT_PATH)) {
    console.error(`Artefact not found at ${ARTEFACT_PATH}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const provider = require('../src/providers/claude');

  const plan = await generatePlan(provider);
  console.log('Plan generated. Methodology:', plan.study_context?.methodology, '| Tasks:', plan.test_scenarios?.scenarios?.length);

  const session = await runEvaluation(provider, plan);
  console.log(`Session complete: ${session.session_outcome}, ${session.total_turns} turns.`);

  const run = {
    id: RUN_ID,
    created_at: new Date().toISOString(),
    intake,
    plan,
    sessions: [session],
  };

  fs.writeFileSync(path.join(OUT_DIR, `${RUN_ID}_plan.json`), JSON.stringify(plan, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, `${RUN_ID}_raw_data.csv`), buildCsv(run));

  const docxBuffer = await buildDocxTranscript(run);
  fs.writeFileSync(path.join(OUT_DIR, `${RUN_ID}_transcript.docx`), docxBuffer);

  await buildPptxPresentation(run, path.join(OUT_DIR, `${RUN_ID}_presentation.pptx`));

  console.log('\nDone. Outputs written to:', OUT_DIR);
})().catch(err => {
  console.error('Local test run failed:', err);
  process.exit(1);
});
