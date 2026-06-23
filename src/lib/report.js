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
    if (turn.click_result) {
      const r = turn.click_result;
      const desc = r.reason === 'not_found' ? 'element described was not found on the page'
        : r.reason === 'click_error'        ? `click failed (${r.error || 'error'})`
        : r.reason === 'no_change'          ? 'click landed but the page did not change — likely a non-functional element'
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

module.exports = {
  generateSessionDeliverables,
};
