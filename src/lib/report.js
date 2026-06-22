const { extractJsonObject, getPersonaId } = require('./utils');

/**
 * Methodology-specific output structures for session report synthesis.
 *
 * Each methodology gets its own "key moments" categories and "findings"
 * categories, matched to the eval keys that methodology asks the
 * simulation agent to produce (see ui/src/pages/Questionnaire.js
 * METHODOLOGY_METRICS).
 *
 * Every structure shares the same shape:
 *   {
 *     think_aloud_transcript: [...],
 *     key_moments: { <category>: [{ quote, context }] , ... },
 *     <findingsKey>: { <category>: [string], ... }
 *   }
 */
const METHODOLOGY_CONFIGS = {
  'Usability Testing': {
    findingsKey: 'usability_findings',
    keyMoments: [
      { key: 'aha_moments',         label: '"Aha" Moments',     description: 'Quote + context where the persona found value' },
      { key: 'friction_moments',    label: 'Friction Moments',  description: 'Quote + what they were trying to do when stuck' },
      { key: 'design_observations', label: 'Design Observations', description: 'Notable usability comments about the interface' },
      { key: 'comparison_moments',  label: 'Comparison Moments', description: "References to the persona's current mental or physical system" },
      { key: 'cultural_fit',        label: 'Cultural Fit',      description: 'Where the product aligns or conflicts with the persona\'s cultural/professional norms' },
    ],
    findings: [
      { key: 'what_worked',     label: 'What Worked',     description: 'Features understood immediately, tasks completed easily, pain points solved, design elements that helped' },
      { key: 'what_didnt_work', label: "What Didn't Work", description: 'Confusing functionality, things they could not figure out, tasks abandoned, design issues' },
      { key: 'whats_missing',   label: "What's Missing",  description: 'Expected features not present, things needed for their use case, considerations not addressed' },
    ],
  },
  'UX Testing': {
    findingsKey: 'ux_findings',
    keyMoments: [
      { key: 'comprehension_moments', label: 'Comprehension Moments', description: 'Where the persona correctly or incorrectly understood design intent, unprompted — quote + context' },
      { key: 'navigation_moments',    label: 'Navigation Moments',    description: 'Unexpected navigation paths, dead ends, or wrong turns — quote + context' },
      { key: 'design_observations',   label: 'Design Observations',   description: 'Notable comments about layout, labels, or visual hierarchy' },
      { key: 'friction_moments',      label: 'Friction Moments',      description: 'Information overload, hesitation, or re-reading the same content' },
      { key: 'trust_moments',         label: 'Trust Moments',         description: 'Trust or distrust reactions to the interface — quote + context' },
    ],
    findings: [
      { key: 'intuitive_elements', label: 'Intuitive Elements',  description: 'Design elements, labels, or flows understood correctly without help' },
      { key: 'misinterpretations', label: 'Misinterpretations',  description: 'Labels, icons, or flows interpreted incorrectly relative to design intent' },
      { key: 'whats_missing',      label: "What's Missing",      description: 'Cues, labels, or affordances needed but absent' },
    ],
  },
  'Concept Testing': {
    findingsKey: 'concept_findings',
    keyMoments: [
      { key: 'first_impression_moments', label: 'First Impression Moments', description: "The persona's immediate, unprompted reaction on first seeing the concept — quote + context" },
      { key: 'value_prop_moments', label: 'Value Proposition Moments', description: 'Where the core value proposition landed clearly — quote + context' },
      { key: 'confusion_moments',  label: 'Confusion Moments',         description: 'Category confusion or feature misattribution — quote + context' },
      { key: 'skepticism_moments', label: 'Skepticism Moments',        description: 'Trust or skepticism reactions to the concept — quote + context' },
      { key: 'comparison_moments', label: 'Comparison Moments',        description: 'Comparisons to competitors or known alternatives' },
    ],
    findings: [
      { key: 'what_resonated',    label: 'What Resonated',     description: 'Aspects of the concept that were immediately understood or valued' },
      { key: 'what_was_unclear',  label: 'What Was Unclear',   description: 'Aspects of the concept that confused or were misread' },
      { key: 'whats_missing',     label: "What's Missing",     description: 'Information or framing needed to fully evaluate the concept' },
    ],
  },
  'Desirability Testing': {
    findingsKey: 'desirability_findings',
    keyMoments: [
      { key: 'emotional_highlights',     label: 'Emotional Highlights',     description: 'Positive emotional reactions — quote + context' },
      { key: 'emotional_mismatches',     label: 'Emotional Mismatches',     description: 'Moments where the design evoked an unintended feeling — quote + context' },
      { key: 'aesthetic_observations',   label: 'Aesthetic Observations',   description: 'Comments on visual design, tone, or style' },
      { key: 'brand_alignment_moments',  label: 'Brand Alignment Moments',  description: "Where the design aligned or conflicted with the persona's brand expectations" },
    ],
    findings: [
      { key: 'what_resonated_emotionally', label: 'What Resonated Emotionally', description: 'Design elements that evoked the intended feeling' },
      { key: 'what_felt_off',              label: 'What Felt Off',              description: 'Elements that created emotional dissonance or mismatch' },
      { key: 'whats_missing',              label: "What's Missing",             description: 'Emotional or brand cues needed but absent' },
    ],
  },
};

const DEFAULT_METHODOLOGY = 'Usability Testing';

function getMethodologyConfig(methodology) {
  return METHODOLOGY_CONFIGS[methodology] || METHODOLOGY_CONFIGS[DEFAULT_METHODOLOGY];
}

function buildSystemPrompt(config) {
  const keyMomentsSchema = config.keyMoments
    .map(c => `    "${c.key}": [ { "quote": "string", "context": "string — ${c.description}" } ]`)
    .join(',\n');

  const findingsSchema = config.findings
    .map(c => `    "${c.key}": [ "string — ${c.description}" ]`)
    .join(',\n');

  const keyMomentsList = config.keyMoments.map(c => `- ${c.label} (${c.key}): ${c.description}`).join('\n');
  const findingsList   = config.findings.map(c => `- ${c.label} (${c.key}): ${c.description}`).join('\n');

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

## Rules

- Build the think-aloud transcript chronologically from the turns, one entry per turn (or merge consecutive turns on the same screen into one entry if that reads more naturally).
- Quotes must come from the persona's actual inner_monologue — do not invent dialogue that contradicts what was recorded.
- Any sub-array in "key_moments" or "${config.findingsKey}" may be empty if the transcript provides no evidence for that category — do not pad with invented content.
- Stay grounded in the transcript and the eval_scores provided for each turn.
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
    if (turn.parse_error || turn.model_error) {
      return `Turn ${turn.turn_number} (task ${turn.task_id}): [no usable data — ${turn.parse_error || turn.model_error}]`;
    }
    const lines = [
      `Turn ${turn.turn_number} (task ${turn.task_id})`,
      `  action: ${turn.action || ''}`,
      `  screen_or_step: ${turn.screen_or_step || ''}`,
      `  inner_monologue: ${turn.inner_monologue || ''}`,
    ];
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

module.exports = {
  generateSessionDeliverables,
};
