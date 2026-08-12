const { extractJsonObject, getPersonaId } = require('./utils');
const { DEFAULT_METHODOLOGY, getMethodologyConfig } = require('./methodology-config');

/**
 * Deliverables-synthesis prompt structure, driven by the methodology's
 * keyMoments/findings categories in methodology-config.js — see that file
 * for the full per-methodology definitions.
 *
 * Every structure shares the same shape:
 *   {
 *     think_aloud_transcript: [...],
 *     key_moments: { <category>: [{ quote, context }] , ... },
 *     <findingsKey>: { <category>: [string], ... }
 *   }
 */

function buildSystemPrompt(config) {
  const keyMomentsSchema = config.keyMoments
    .map(c => `    "${c.key}": [ { "quote": "string", "context": "string — ${c.description}" } ]`)
    .join(',\n');

  const findingsSchema = config.findings
    .map(c => `    "${c.key}": [ "string — ${c.description}" ]`)
    .join(',\n');

  const keyMomentsList     = config.keyMoments.map(c => `- ${c.label} (${c.key}): ${c.description}`).join('\n');
  const findingsList       = config.findings.map(c => `- ${c.label} (${c.key}): ${c.description}`).join('\n');
  const dataIntegrityList  = (config.data_integrity_rules || []).map(r => `- ${r}`).join('\n');

  return `You are a UX research analyst. You will be given the full turn-by-turn transcript of a completed synthetic test session — a persona's recorded actions, inner monologue, and evaluation scores as they attempted one or more tasks.

Your job is to synthesize this transcript into a structured deliverables document. Respond with a single JSON object containing EXACTLY these top-level keys: "think_aloud_transcript", "key_moments", "${config.findingsKey}". No other top-level keys.

{
  "think_aloud_transcript": [
    {
      "step": "string — what the persona explored or attempted at this point",
      "quote": "string — what they said, in their authentic voice, drawn from or closely paraphrasing their inner_monologue",
      "outcome": "success | confusion | failure",
      "outcome_detail": "string — one sentence on what happened"
    }
  ],
  "key_moments": {
${keyMomentsSchema}
  },
  "${config.findingsKey}": {
${findingsSchema}
  }
}

## Key moments categories

${keyMomentsList}

## Findings categories

${findingsList}

## Data integrity rules

${dataIntegrityList || '- No finding may be fabricated or inferred beyond what session data directly supports.'}

## Rules

- Build the think-aloud transcript chronologically from the turns, one entry per turn (or merge consecutive turns on the same screen into one entry if that reads more naturally). If turns are labelled with a variant (e.g. "Variant A", "Variant B", "Comparison"), preserve that labelling in "step" so a reader can tell which exposure each entry belongs to.
- Quotes must come from the persona's actual inner_monologue — do not invent dialogue that contradicts what was recorded.
- Any sub-array in "key_moments" or "${config.findingsKey}" may be empty if the transcript provides no evidence for that category — do not pad with invented content.
- Stay grounded in the transcript and the eval_scores provided for each turn.
- Follow the data integrity rules above exactly — in particular, never state or imply a sample size, statistical significance, confidence interval, or p-value unless a data integrity rule above explicitly permits it. This is a synthetic session transcript, not a powered experiment.
- Respond with ONLY the JSON object — no preamble, no explanation, no markdown code fences, no text before or after the JSON.`;
}

function stripProviderPrefix(personaId) {
  const idx = personaId.indexOf('::');
  return idx === -1 ? personaId : personaId.slice(idx + 2);
}

function findPersonaContext(session, plan) {
  const segments = plan?.user_segments?.segments || [];
  const targetId = stripProviderPrefix(session.persona_id || '');
  const match = segments.find(s => getPersonaId(s) === targetId);
  return match || { name: session.persona_name, context: '' };
}

function buildTranscriptBlock(session) {
  return session.turns.map(turn => {
    const variantLabel = turn.variant_id === 'comparison' ? ', Comparison turn'
      : turn.variant_id ? `, Variant ${turn.variant_id}`
      : '';

    if (turn.parse_error || turn.model_error) {
      return `Turn ${turn.turn_number} (task ${turn.task_id}${variantLabel}): [no usable data — ${turn.parse_error || turn.model_error}]`;
    }
    const lines = [
      `Turn ${turn.turn_number} (task ${turn.task_id}${variantLabel})`,
      `  action: ${turn.action || ''}`,
      `  screen_or_step: ${turn.screen_or_step || ''}`,
      `  inner_monologue: ${turn.inner_monologue || ''}`,
    ];
    if (turn.click_result) {
      const r = turn.click_result;
      const desc = r.reason === 'not_found'        ? 'element described was not found on the page'
        : r.reason === 'click_error'                ? `click failed (${r.error || 'error'})`
        : r.reason === 'no_change'                  ? 'click landed but the page did not change — likely a non-functional element'
        : r.reason === 'click_disallowed'            ? 'click attempted but blocked — this task is observation only'
        : 'click landed and the page changed';
      lines.push(`  click_result: ${desc}`);
    }
    for (const [key, value] of Object.entries(turn.eval_scores || {})) {
      lines.push(`  ${key}: ${value}`);
    }
    return lines.join('\n');
  }).join('\n\n');
}

function buildDeliverablesUserPrompt(session, persona, plan) {
  const studyContext = plan?.study_context?.artefact_config?.artefact_notes || '';
  const scenario      = plan?.study_context?.scenario || '';
  const tasks = (plan?.test_scenarios?.scenarios || [])
    .map(t => `- ${t.task_id}: ${t.task_name} — success: ${t.success_condition || 'n/a'}, abandon: ${t.abandon_condition || 'n/a'}${t.test_intent ? ` — testing: ${t.test_intent}` : ''}`)
    .join('\n');

  return `## Persona

${persona.name}
${persona.context || ''}

## Study Context

${studyContext}
${scenario ? `\nScenario the persona was placed in: ${scenario}` : ''}

## Tasks Attempted

${tasks || 'Not specified'}

Use the "testing:" framing on each task above to ground your findings — when synthesizing key_moments and findings, prioritise evidence that speaks directly to what each task was meant to surface.

## Session Outcome

session_outcome: ${session.session_outcome}
tasks_completed: ${(session.tasks_completed || []).join(', ') || 'none'}
stuck_loop_flags: ${JSON.stringify(session.stuck_loop_flags || [])}

## Turn-by-Turn Transcript

${buildTranscriptBlock(session)}

Synthesize the deliverables JSON object as instructed.`;
}

function parseDeliverables(rawText, config) {
  const parsed = extractJsonObject(rawText);

  const keyMoments = {};
  for (const c of config.keyMoments) {
    keyMoments[c.key] = parsed.key_moments?.[c.key] || [];
  }

  const findings = {};
  for (const c of config.findings) {
    findings[c.key] = parsed[config.findingsKey]?.[c.key] || [];
  }

  return {
    think_aloud_transcript: Array.isArray(parsed.think_aloud_transcript) ? parsed.think_aloud_transcript : [],
    key_moments: keyMoments,
    [config.findingsKey]: findings,
  };
}

async function generateSessionDeliverables(provider, session, plan) {
  const methodology = plan?.study_context?.methodology || DEFAULT_METHODOLOGY;
  const config       = getMethodologyConfig(methodology);
  const persona      = findPersonaContext(session, plan);
  const systemPrompt = buildSystemPrompt(config);
  const userPrompt   = buildDeliverablesUserPrompt(session, persona, plan);
  const rawText      = await provider.call(systemPrompt, userPrompt);
  const deliverables = parseDeliverables(rawText, config);

  return {
    persona_id:   session.persona_id,
    persona_name: session.persona_name,
    provider:     session.provider || provider.id,
    methodology,
    ...deliverables,
  };
}

/**
 * Step 9 — the interpretive report (Deliverable 2), distinct from Step 8's
 * strictly descriptive analysis.json (src/lib/analysis.js). Takes analysis.json
 * as ground-truth input and adds interpretation and recommendations — the one
 * place in the pipeline recommendations are allowed to appear.
 */
function buildAnalyzedReportSystemPrompt() {
  return `You are a UX research analyst writing the interpretive research report for a completed synthetic-user study. You will be given analysis.json — a strictly descriptive quantitative rollup (Pass A) and cross-session qualitative themes (Pass B), both already computed from confirmed session data. Your job is to interpret this into a report with actionable recommendations. Do not recompute or contradict any number or theme in analysis.json — treat it as ground truth input, not something to re-derive.

Respond with a single JSON object containing EXACTLY these keys: "context_and_summary", "quant_highlights", "findings", "recommendations". No other top-level keys.

{
  "context_and_summary": "string — 2-4 sentences: what was tested, with whom, and the headline result",
  "quant_highlights": [ "string — 3-6 short callouts drawn directly from pass_a's numbers, each citing the actual figure" ],
  "findings": [
    { "theme": "string — copy the theme name from pass_b exactly", "interpretation": "string — one sentence on why this matters for the product decision" }
  ],
  "recommendations": [ "string — concrete next step, each traceable to a specific finding or quant highlight above" ]
}

Rules:
- "findings" must only reference themes that actually appear in the provided pass_b.themes — do not invent new findings not present in the input.
- Order "findings" by signal strength first (strong before limited), then by citation count within each group — the input already tells you each theme's signal_strength and citation count; do not re-judge it yourself.
- Every recommendation must trace back to a specific finding or quant highlight in this report — no generic advice unconnected to what this study actually showed.
- Never state or imply statistical significance, confidence intervals, or p-values — this is a qualitative synthesis of synthetic sessions, not a powered experiment.
- If pass_b has no themes and pass_a shows no strong signal anywhere, say so plainly in context_and_summary rather than manufacturing findings.
- Respond with ONLY the JSON object — no preamble, no explanation, no markdown code fences.`;
}

function buildAnalyzedReportUserPrompt(analysis, plan, intake) {
  const productName = plan?.study_context?.product || intake?.q5_product_context?.product_name || '';
  const feature      = plan?.research_goals?.feature_under_test || intake?.q5_product_context?.feature_under_test || '';
  const rq           = plan?.research_goals?.primary_rq || intake?.q3_goals?.primary_rq || '';
  const methodology  = plan?.study_context?.methodology || intake?.q6_methodology?.methodology || '';

  return `## Study

Product: ${productName}${feature ? ` — ${feature}` : ''}
Methodology: ${methodology}
Primary research question: ${rq || 'not specified'}

## analysis.json

\`\`\`json
${JSON.stringify(analysis, null, 2)}
\`\`\`

Write the interpretive report JSON object as instructed.`;
}

async function generateAnalyzedReport(provider, analysis, plan, intake) {
  const systemPrompt = buildAnalyzedReportSystemPrompt();
  const userPrompt    = buildAnalyzedReportUserPrompt(analysis, plan, intake);
  const rawText       = await provider.call(systemPrompt, userPrompt);
  const parsed        = extractJsonObject(rawText);

  return {
    context_and_summary: typeof parsed.context_and_summary === 'string' ? parsed.context_and_summary : '',
    quant_highlights:    Array.isArray(parsed.quant_highlights) ? parsed.quant_highlights.filter(x => typeof x === 'string') : [],
    findings:            Array.isArray(parsed.findings) ? parsed.findings.filter(f => f && typeof f.theme === 'string') : [],
    recommendations:     Array.isArray(parsed.recommendations) ? parsed.recommendations.filter(x => typeof x === 'string') : [],
  };
}

module.exports = {
  generateSessionDeliverables,
  generateAnalyzedReport,
};
