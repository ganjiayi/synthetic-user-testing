#!/usr/bin/env node

/**
 * compare.js — run the same persona + usability task through BOTH Claude and
 * OpenAI simultaneously and print outputs side by side.
 *
 * Usage:
 *   node src/pipeline/compare.js --persona hakim --task 1
 *   node src/pipeline/compare.js --persona hakim --task 1 --image ~/Downloads/tvpack.jpg
 *   node src/pipeline/compare.js --persona all --task 1 --image ~/Downloads/tvpack.jpg
 *
 * Personas: hakim | syafiqah | marcus | rohani | david | all
 * Tasks:    1 | 2 | 3 | all
 * Image:    optional path to screenshot — when provided, both models receive the
 *           actual image instead of the hardcoded text description
 *
 * Output is printed to stdout and saved to runs/compare_<timestamp>.json
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const PERSONAS_FILE = path.join(__dirname, '../../personas/v4_library.json');
const RUNS_DIR      = path.join(__dirname, '../../runs');

const DIVIDER = '─'.repeat(64);
const HEADER  = '═'.repeat(64);

// ─── Persona name → slug ──────────────────────────────────────────────────────
const NAME_ALIASES = {
  hakim:    'spontaneous-traditionalist',
  syafiqah: 'progressive-influencer',
  marcus:   'trendsetter-explorer',
  rohani:   'family-centric-devotee',
  david:    'routine-conservative',
};

// ─── Usability tasks ──────────────────────────────────────────────────────────
const TASKS = {
  1: {
    label: 'Price & value comprehension',
    instruction: [
      'You have just landed on this page. Take a moment to look around.',
      'Tell me: what do you think this page is offering you?',
      'Without clicking anything, what would you expect to pay for the pack you think is the best value?',
      'What do you believe is included in that price?',
    ].join('\n'),
  },
  2: {
    label: 'Next action',
    instruction: [
      'Based on what you see on this page, what would you do next if you were seriously considering subscribing?',
      'Walk me through your thought process step by step.',
    ].join('\n'),
  },
  3: {
    label: 'Missing information',
    instruction: [
      'Is there anything you\'d want to know before making a decision that you cannot find on this page?',
      'Be specific — what question do you have that the page doesn\'t answer?',
    ].join('\n'),
  },
};

// ─── Load personas ────────────────────────────────────────────────────────────
function loadPersonas() {
  const raw = JSON.parse(fs.readFileSync(PERSONAS_FILE, 'utf8'));
  const bySlug = {};
  for (const p of raw.personas) bySlug[p.slug] = p;
  return bySlug;
}

// ─── Build system prompt from persona JSON ────────────────────────────────────
function buildSystemPrompt(p) {
  const identity    = p.identity    || {};
  const personality = p.personality || {};
  const streaming   = p.streaming_behaviour || {};
  const tech        = p.technology_literacy || {};
  const decision    = p.decision_making || {};

  const bullet = arr => Array.isArray(arr) && arr.length
    ? arr.map(i => `- ${i}`).join('\n')
    : '—';

  return `You are ${p.name}, a ${p.age}-year-old ${identity.role || ''} living in ${identity.location || ''}, Malaysia.

ARCHETYPE: ${p.archetype}
TAGLINE: "${p.tagline}"

WHO YOU ARE:
- Ethnicity: ${identity.ethnicity || ''}
- Languages: ${(identity.languages || []).join(', ')}
- Household income: MYR ${identity.household_income_myr || ''}
- Living situation: ${identity.living_situation || ''}
- Primary device: ${identity.primary_device || ''}
- Temperament: ${personality.temperament || ''}
- Communication style: ${personality.communication_style || ''}
- Openness to change: ${personality.openness_to_change || ''}

YOUR STREAMING LIFE:
- Platforms: ${(streaming.platform_stack || []).join(', ')}
- Ad tolerance: ${streaming.ad_tolerance || ''}
- Subscriptions: ${streaming.subscription_count || ''}
- Payment method: ${streaming.payment_method || ''}
- Relationship with Astro: ${streaming.astro_relationship || ''}

WHAT DRIVES YOU:
${bullet(p.motivations)}

WHAT FRUSTRATES YOU:
${bullet(p.pain_points)}

YOUR DEALBREAKERS:
${bullet(decision.dealbreakers)}

WHAT EARNS YOUR TRUST:
${bullet(decision.trust_signals)}

YOUR IDIOSYNCRASIES:
${bullet(p.idiosyncrasies)}

HOW YOU SOUND — your actual voice (copy this style exactly):
${bullet(p.signature_quotes)}

Tech literacy: ${tech.overall_score || 'N/A'}/100

STRICT RULES — you must follow these without exception:
1. You ARE ${p.name}. Stay in character for the entire response. Never step outside it.
2. LANGUAGE: Respond in ${(identity.languages || [])[0] || 'the language shown in your signature quotes'}. Do not default to English unless that is your primary language.
3. VOICE: Write exactly as ${p.name} would speak — not as a neutral assistant describing her. Use her vocabulary, hesitations, emotional register, and sentence rhythm shown in the quotes above.
4. SPECIFICITY: Draw on your actual details — your location (${identity.location || ''}), your household, your past experiences with this product, your income constraints. Do not make generic observations.
5. EMOTION: Show your real reactions — confusion, suspicion, relief, doubt — as they arise naturally while looking at the page.
6. FORMAT: Do NOT write bullet points or numbered lists. Do NOT summarise what you see like a reviewer. React out loud, in real time, as you scroll through the page for the first time — thinking, noticing, second-guessing. Stream of consciousness, not report.
7. Never acknowledge being an AI. Never summarise the persona. Just respond as her.`;
}

// ─── Build user message for a task ───────────────────────────────────────────
// When an image is provided, models read the page directly — no text description injected.
// When no image is provided, this context is used as a fallback.
const TEXT_FALLBACK_CONTEXT = `You are participating in a usability test of a streaming TV subscription page.
A researcher is observing you as you naturally explore the page.

Important constraints — approach this as yourself, with your real level of familiarity:
- Do NOT assume you already know whether a set-top box is required
- Do NOT assume the plan names tell you what content is included
- Do NOT assume you will scroll to any FAQ section`;

const IMAGE_CONTEXT = `You are participating in a usability test. A researcher is observing you.
The image above is the page you have just landed on. Read only what you can see in the image.

Important constraints:
- Do NOT assume you already know whether a set-top box is required
- Do NOT assume pack names tell you what content is included
- Do NOT assume you will scroll to any FAQ section
- Only reference what is visibly shown in the image above`;

function buildUserMessage(task, segments) {
  const context = segments ? IMAGE_CONTEXT : TEXT_FALLBACK_CONTEXT;
  const scrollNote = segments && segments.length > 1
    ? `\n\nThe page is shown as ${segments.length} sequential scroll sections, top to bottom.`
    : '';
  return `${context}${scrollNote}\n\n${task.instruction}`;
}

// ─── Load image and split into mobile-viewport segments ──────────────────────
// Splits tall images into overlapping 900px viewport slices so each slice fits
// within GPT-4o's readable resolution (avoids downscaling that causes confabulation).
const VIEWPORT_HEIGHT = 900;
const VIEWPORT_OVERLAP = 100;

async function loadImage(imagePath) {
  if (!imagePath) return null;
  const sharp = require('sharp');
  const p = require('path').resolve(imagePath.replace(/^~/, require('os').homedir()));
  if (!require('fs').existsSync(p)) {
    console.error(`Image not found: ${p}`);
    process.exit(1);
  }
  const mediaType = 'image/jpeg';

  const meta = await sharp(p).metadata();
  const { width, height } = meta;

  // If image fits within one viewport, return as single-element array
  if (height <= VIEWPORT_HEIGHT) {
    const b64 = require('fs').readFileSync(p).toString('base64');
    console.error(`Image loaded: ${path.basename(p)} (${width}×${height}, single viewport)`);
    return [{ b64, mediaType }];
  }

  // Split into overlapping viewport slices
  const segments = [];
  let top = 0;
  let sliceNum = 0;
  while (top < height) {
    const sliceHeight = Math.min(VIEWPORT_HEIGHT, height - top);
    const buf = await sharp(p)
      .extract({ left: 0, top, width, height: sliceHeight })
      .jpeg({ quality: 90 })
      .toBuffer();
    segments.push({ b64: buf.toString('base64'), mediaType });
    sliceNum++;
    if (top + VIEWPORT_HEIGHT >= height) break;
    top += VIEWPORT_HEIGHT - VIEWPORT_OVERLAP;
  }

  console.error(`Image loaded: ${path.basename(p)} (${width}×${height} → ${segments.length} viewport segments of ~${VIEWPORT_HEIGHT}px)`);
  return segments;
}

// ─── Claude vision call — supports multi-segment scroll simulation ────────────
async function callClaudeVision(systemPrompt, userMessage, segments) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const imageBlocks = segments.flatMap((seg, i) => [
    { type: 'text', text: segments.length > 1 ? `[Scroll section ${i + 1} of ${segments.length}]` : '[Page screenshot]' },
    { type: 'image', source: { type: 'base64', media_type: seg.mediaType, data: seg.b64 } },
  ]);

  const msg = await client.messages.create({
    model:      process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 2048,
    system:     systemPrompt,
    messages: [{
      role: 'user',
      content: [
        ...imageBlocks,
        { type: 'text', text: userMessage },
      ],
    }],
  });
  return msg.content[0].text;
}

// ─── OpenAI vision call — supports multi-segment scroll simulation ────────────
async function callOpenAIVision(systemPrompt, userMessage, segments) {
  const openaiProvider = require('../providers/openai');

  if (segments.length === 1) {
    return openaiProvider.call(systemPrompt, userMessage, segments[0]);
  }

  // Multi-segment: build message directly via openai client
  const { OpenAI } = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const imageBlocks = segments.flatMap((seg, i) => [
    { type: 'text', text: `[Scroll section ${i + 1} of ${segments.length}]` },
    { type: 'image_url', image_url: { url: `data:${seg.mediaType};base64,${seg.b64}`, detail: 'high' } },
  ]);

  const response = await client.chat.completions.create({
    model:    process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: [...imageBlocks, { type: 'text', text: userMessage }] },
    ],
    max_tokens:  8192,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}

// ─── Call both providers in parallel ─────────────────────────────────────────
async function runBothProviders(systemPrompt, userMessage, segments) {
  const claudeCall = segments
    ? callClaudeVision(systemPrompt, userMessage, segments)
    : Promise.resolve().then(() => require('../providers/claude').call(systemPrompt, userMessage));

  const openaiCall = segments
    ? callOpenAIVision(systemPrompt, userMessage, segments)
    : require('../providers/openai').call(systemPrompt, userMessage, null);

  const [claudeResult, openaiResult] = await Promise.allSettled([claudeCall, openaiCall]);

  return {
    claude: claudeResult.status === 'fulfilled'
      ? { ok: true,  text: claudeResult.value }
      : { ok: false, error: claudeResult.reason?.message || String(claudeResult.reason) },
    openai: openaiResult.status === 'fulfilled'
      ? { ok: true,  text: openaiResult.value }
      : { ok: false, error: openaiResult.reason?.message || String(openaiResult.reason) },
  };
}

// ─── Print one comparison block ───────────────────────────────────────────────
function printComparison(persona, taskNum, task, results) {
  console.log(`\n${HEADER}`);
  console.log(`  ${persona.name}  (${persona.archetype})  ·  Task ${taskNum}: ${task.label}`);
  console.log(`${HEADER}`);

  console.log(`\nCLAUDE  (${process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'})`);
  console.log(DIVIDER);
  console.log(results.claude.ok ? results.claude.text.trim() : `[ERROR] ${results.claude.error}`);

  console.log(`\nOPENAI  (${process.env.OPENAI_MODEL || 'gpt-4o'})`);
  console.log(DIVIDER);
  console.log(results.openai.ok ? results.openai.text.trim() : `[ERROR] ${results.openai.error}`);
  console.log();
}

// ─── CLI args ─────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const get  = flag => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };

  const personaArg = get('--persona');
  const taskArg    = get('--task');
  const imageArg   = get('--image');

  if (!personaArg || !taskArg) {
    console.error('Usage: node src/pipeline/compare.js --persona <name|all> --task <1|2|3|all> [--image <path>]');
    console.error('Personas: hakim | syafiqah | marcus | rohani | david | all');
    process.exit(1);
  }

  return { personaArg: personaArg.toLowerCase(), taskArg: taskArg.toLowerCase(), imageArg };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { personaArg, taskArg, imageArg } = parseArgs();
  const segments = await loadImage(imageArg);

  const allPersonas = loadPersonas();

  const selectedPersonas = personaArg === 'all'
    ? Object.values(allPersonas)
    : (() => {
        const slug = NAME_ALIASES[personaArg] || personaArg;
        const p    = allPersonas[slug];
        if (!p) {
          console.error(`Unknown persona: "${personaArg}". Available: ${Object.keys(NAME_ALIASES).join(', ')}, all`);
          process.exit(1);
        }
        return [p];
      })();

  const selectedTaskNums = taskArg === 'all'
    ? [1, 2, 3]
    : [parseInt(taskArg, 10)].filter(n => TASKS[n] || (() => {
        console.error('--task must be 1, 2, 3, or all');
        process.exit(1);
      })());

  const total = selectedPersonas.length * selectedTaskNums.length;
  let done = 0;
  const allResults = [];

  const segmentLabel = segments ? `${segments.length} viewport segment(s)` : 'text only';
  console.log(`\n🔬 Model comparison — ${selectedPersonas.length} persona(s) × ${selectedTaskNums.length} task(s) = ${total} pair(s)`);
  console.log(`   Claude : ${process.env.CLAUDE_MODEL  || 'claude-sonnet-4-6'}`);
  console.log(`   OpenAI : ${process.env.OPENAI_MODEL  || 'gpt-4o'}`);
  console.log(`   Image  : ${segmentLabel}`);

  for (const persona of selectedPersonas) {
    const systemPrompt = buildSystemPrompt(persona);

    for (const taskNum of selectedTaskNums) {
      const task = TASKS[taskNum];
      done++;
      process.stderr.write(`\n[${done}/${total}] ${persona.name} — Task ${taskNum}...\n`);

      const userMessage = buildUserMessage(task, segments);
      const results     = await runBothProviders(systemPrompt, userMessage, segments);

      printComparison(persona, taskNum, task, results);

      allResults.push({
        persona:  persona.name,
        archetype: persona.archetype,
        task_num: taskNum,
        task_label: task.label,
        claude: results.claude,
        openai: results.openai,
      });
    }
  }

  // Save to runs/
  fs.mkdirSync(RUNS_DIR, { recursive: true });
  const stamp    = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath  = path.join(RUNS_DIR, `compare_${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), results: allResults }, null, 2));

  console.log(`\n✅ Done. Full output saved to: ${outPath}`);
}

main().catch(err => {
  console.error('\n❌ Compare failed:', err.message);
  process.exit(1);
});
