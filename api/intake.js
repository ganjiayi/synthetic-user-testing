require('dotenv').config();
const path = require('path');
const fs   = require('fs');
const { AGENTS, loadAgentPrompt } = require('../src/lib/agent-chat');
const { splitReplyAndProposal }   = require('../src/lib/utils');
const { validateProduct }         = require('../src/lib/validate-product');
const { getMethodologyConfig, listMethodologies } = require('../src/lib/methodology-config');
const provider = require('../src/providers/claude');

/**
 * Single endpoint for the three lightweight intake-time functions (chat,
 * product lookup, persona library) — merged from three separate files to
 * stay under Vercel's Hobby-plan 12-function limit. URL paths are unchanged
 * for the frontend; only the destination file + an `action` query param
 * differ (see vercel.json's routes array).
 */

// Frontend-only persona code convention (PERSONA_MAP in ui/src/api.js) —
// duplicated here in miniature since api/ is CommonJS and can't require
// that ES module. See src/lib/agent-chat.js's header comment for context.
const PERSONA_CODES = [
  { code: 'ST', slug: 'spontaneous-traditionalist', name: 'Hakim' },
  { code: 'PI', slug: 'progressive-influencer',      name: 'Syafiqah' },
  { code: 'TE', slug: 'trendsetter-explorer',        name: 'Marcus' },
  { code: 'FC', slug: 'family-centric-devotee',      name: 'Puan Rohani' },
  { code: 'RC', slug: 'routine-conservative',         name: 'David' },
];

function buildReferenceBlock(agentKey, context) {
  const blocks = [
    ['', 'Current intake state (from the questionnaire, as filled so far — may be partial):', '', '```json', JSON.stringify(context || {}, null, 2), '```'].join('\n'),
  ];

  if (agentKey === 'research-question' && context?.product) {
    const productPath = path.join(process.cwd(), `products/${context.product}.json`);
    if (fs.existsSync(productPath)) {
      const productDB = JSON.parse(fs.readFileSync(productPath, 'utf8'));
      validateProduct(productDB, context.product);
      blocks.push(['', 'Product database context:', '', '```json', JSON.stringify(productDB, null, 2), '```'].join('\n'));
    }
  }

  if (agentKey === 'persona-fit') {
    const libPath = path.join(process.cwd(), 'personas/v4_library.json');
    const library  = JSON.parse(fs.readFileSync(libPath, 'utf8'));
    const codeMap  = PERSONA_CODES.map(p => `${p.code} → ${p.slug} (${p.name})`).join('\n');
    blocks.push(['', "Persona code convention used by the UI (use these exact codes in your proposal, not slugs or names):", codeMap].join('\n'));
    blocks.push(['', 'Full persona library:', '', '```json', JSON.stringify(library.personas, null, 2), '```'].join('\n'));

    if (context?.methodology) {
      blocks.push([
        '',
        `This study's methodology is "${context.methodology}" — weight trait relevance per your methodology-aware principle (friction/confusion sensitivity for Usability Testing; comparative-preference-articulation for A/B Testing) when writing each persona's context blurb.`,
      ].join('\n'));
    }
  }

  if (agentKey === 'methodology-task') {
    // The researcher picks methodology via the UI card selector before this
    // agent runs — it never chooses methodology itself in this flow. But
    // which methodology was picked varies (Usability Testing vs A/B Testing),
    // so it must come from context, not be hardcoded to one value — a study
    // set to A/B Testing was getting Usability Testing's config block here,
    // silently steering the copilot toward the wrong methodology entirely.
    const methodology = context?.methodology || 'Usability Testing';
    const methodologyConfig = getMethodologyConfig(methodology);
    blocks.push([
      '',
      `This study's methodology is already fixed to "${methodology}" (chosen by the researcher before this conversation) — do not propose a different methodology. Focus on scenario and tasks only. Methodology Configuration block:`,
      '',
      '```json',
      JSON.stringify({
        eval_metrics_keys:    methodologyConfig.eval_schema.fields.map(f => f.key),
        success_condition:    methodologyConfig.task_derivation.success_condition,
        abandon_condition:    methodologyConfig.task_derivation.abandon_condition,
        planner_guidance:     methodologyConfig.planner_guidance,
        data_integrity_rules: methodologyConfig.data_integrity_rules,
      }, null, 2),
      '```',
    ].join('\n'));

    if (methodology === 'A/B Testing' && !context?.variantBProvided) {
      blocks.push([
        '',
        'Note: Variant B test materials have not been uploaded yet in this session. You can still help draft the scenario, a hypothesis, and the task list — each task applies to both variants once Variant B materials are added — but mention that Variant B materials still need to be uploaded before the study can run.',
      ].join('\n'));
    }
  }

  return blocks.join('\n');
}

async function handleChat(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { agent } = req.query;
  if (!AGENTS[agent]) return res.status(404).json({ error: `Unknown agent: ${agent}` });

  const { messages, context } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const basePrompt     = loadAgentPrompt(agent, process.cwd());
    const referenceBlock = buildReferenceBlock(agent, context);
    const systemPrompt   = `${basePrompt}\n\n---\n\n## Reference data for this session\n${referenceBlock}`;

    const raw = await provider.chat(systemPrompt, messages);
    const { reply, proposal } = splitReplyAndProposal(raw);
    return res.json({ reply, proposal });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function handleProduct(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const productPath = path.join(process.cwd(), `products/${id}.json`);
  if (!fs.existsSync(productPath)) {
    return res.status(404).json({ error: `No product data for "${id}"` });
  }

  try {
    const productDB = JSON.parse(fs.readFileSync(productPath, 'utf8'));
    validateProduct(productDB, id);
    return res.json(productDB);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function handleMethodologies(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.json({ methodologies: listMethodologies() });
}

function handlePersonas(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const libPath = path.join(process.cwd(), 'personas/v4_library.json');
    const library  = JSON.parse(fs.readFileSync(libPath, 'utf8'));
    return res.json(library);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = async (req, res) => {
  const { action } = req.query;

  if (action === 'chat')          return handleChat(req, res);
  if (action === 'product')       return handleProduct(req, res);
  if (action === 'personas')      return handlePersonas(req, res);
  if (action === 'methodologies') return handleMethodologies(req, res);

  return res.status(404).json({ error: `Unknown action: ${action}` });
};
