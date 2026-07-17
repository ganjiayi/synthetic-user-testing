require('dotenv').config();
const path = require('path');
const fs   = require('fs');
const { AGENTS, loadAgentPrompt } = require('../../../src/lib/agent-chat');
const { splitReplyAndProposal }   = require('../../../src/lib/utils');
const { validateProduct }         = require('../../../src/lib/validate-product');
const { getMethodologyConfig }    = require('../../../src/lib/methodology-config');
const provider = require('../../../src/providers/claude');

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
  }

  if (agentKey === 'methodology-task') {
    const methodologyConfig = getMethodologyConfig('Usability Testing');
    blocks.push([
      '',
      'This study\'s methodology is already fixed to "Usability Testing" — do not propose a different methodology. Focus on scenario and tasks only. Methodology Configuration block:',
      '',
      '```json',
      JSON.stringify({
        eval_metrics_keys: methodologyConfig.eval_schema.fields.map(f => f.key),
        success_condition: methodologyConfig.task_derivation.success_condition,
        abandon_condition: methodologyConfig.task_derivation.abandon_condition,
      }, null, 2),
      '```',
    ].join('\n'));
  }

  return blocks.join('\n');
}

module.exports = async (req, res) => {
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
};
