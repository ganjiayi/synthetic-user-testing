const path = require('path');
const fs   = require('fs');
const { extractJsonObject, getPersonaId } = require('./utils');
const browserSessionLib = require('./browser-session');
const { getMethodologyConfig, navigationRequired } = require('./methodology-config');

function loadPersonaPrompts() {
  const p = path.join(process.cwd(), 'personas/v4_library.json');
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(data.personas) ? data.personas : null;
  } catch {
    return null;
  }
}

function formatPersonaProfile(p) {
  const lines = [`## ${p.name}${p.archetype ? ` — ${p.archetype}` : ''}`];
  if (p.tagline) lines.push(`"${p.tagline}"`);
  if (p.age || p.identity) {
    lines.push([
      p.age ? `Age: ${p.age}` : '',
      p.identity?.location ? `Location: ${p.identity.location}` : '',
      p.identity?.role ? `Role: ${p.identity.role}` : '',
      p.identity?.primary_device ? `Device: ${p.identity.primary_device}` : '',
    ].filter(Boolean).join(' · '));
  }
  if (p.personality?.temperament) lines.push(`Temperament: ${p.personality.temperament}`);
  if (p.motivations?.length) lines.push(`Motivations: ${p.motivations.join('; ')}`);
  if (p.pain_points?.length) lines.push(`Pain points: ${p.pain_points.join('; ')}`);
  if (p.decision_making?.dealbreakers?.length) lines.push(`Dealbreakers: ${p.decision_making.dealbreakers.join('; ')}`);
  if (p.behavioural_tendencies?.length) lines.push(`Behavioural tendencies: ${p.behavioural_tendencies.join('; ')}`);
  if (p.signature_quotes?.length) lines.push(`In her/his own words: ${p.signature_quotes.map(q => `"${q}"`).join(' / ')}`);
  if (p.technology_literacy) {
    const t = p.technology_literacy;
    lines.push(`Tech literacy: ${t.overall_score ?? '—'}/100. Strengths: ${(t.strengths || []).join(', ') || '—'}. Weaknesses: ${(t.weaknesses || []).join(', ') || '—'}.`);
  }
  if (p.ux_change_response?.complex_flow_behaviour) lines.push(`Response to complex flows: ${p.ux_change_response.complex_flow_behaviour}`);
  if (p.astro_pain_points?.applicable_issues?.length) {
    const issues = p.astro_pain_points.applicable_issues.map(i => `${i.theme} (${i.severity}): ${i.description}`).join(' | ');
    lines.push(`Known Astro-specific friction: ${issues}`);
  }
  return lines.join('\n');
}

function loadSimulationPrompt() {
  const p = path.join(process.cwd(), '.claude/agents/simulation-runner.md');
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8').trim();
    if (content) return content;
  }
  return buildDefaultSimulationPrompt();
}

function buildDefaultSimulationPrompt() {
  // Fallback used only if .claude/agents/simulation-runner.md is missing from
  // disk. The exact turn JSON schema is appended dynamically per methodology
  // by buildTurnSchemaBlock — this just sets up the character and framing.
  return `You are a synthetic UX testing agent simulating a real Malaysian consumer interacting with a website or app.

You will be given:
1. A persona profile describing who you are — your background, tech literacy, motivations, and frustrations
2. A task instruction telling you what to attempt
3. The current screen or artefact state — this may include a screenshot of the actual UI. If an image is provided, treat it as the real screen in front of you and reason from what you visually observe.

Rules:
- Stay in character as the persona at all times
- Only set task_completion to 'completed' when you have reached the defined success condition
- Only set task_completion to 'abandoned' when you hit the defined abandon condition
- Your inner_monologue must sound like this specific persona — use their vocabulary, concerns, and communication style
- Respond with ONLY the JSON object — no preamble, no explanation`;
}

function buildTurnSchemaBlock(methodologyConfig) {
  const navRequired = navigationRequired(methodologyConfig);

  const coreFields = [
    '"action": "string — what you do next"',
    '"screen_or_step": "string — which screen, element, or stimulus you are looking at"',
    '"inner_monologue": "string, 2-5 sentences — what you are thinking, in your own voice"',
  ];
  if (navRequired) {
    coreFields.push(
      '"click_target": "string or null — required when action is \\"click\\", null otherwise"',
      '"scroll_direction": "\\"up\\" or \\"down\\" or null — required when action is \\"scroll\\", null otherwise"',
    );
  }
  coreFields.push('"task_completion": "in_progress | completed | abandoned"');
  coreFields.push('"abandon_trigger": "string or null — why you abandoned, null unless task_completion is \\"abandoned\\""');
  coreFields.push('"persona_alignment_note": "string — one sentence on how your behaviour reflects your persona traits"');

  const evalFieldLines = methodologyConfig.eval_schema.fields.map(
    f => `"${f.key}": "${f.type} — ${f.description}"`
  );

  const allFieldLines = [...coreFields, ...evalFieldLines];

  return `\n\n## Study Methodology\n\n` +
    `Methodology: ${methodologyConfig.methodology_id}\n\n` +
    `${methodologyConfig.persona_instruction_mode}\n\n` +
    `Respond with a JSON object containing EXACTLY these keys — no more, no fewer, no renaming:\n\n` +
    `{\n  ${allFieldLines.join(',\n  ')}\n}` +
    (navRequired ? '' : '\n\nThis methodology has no UI to navigate — never produce click_target or scroll_direction.');
}

function buildPersonaSystemPrompt(persona, personaLibrary, simulationPrompt, plan, methodologyConfig) {
  let personaBlock = '';

  if (Array.isArray(personaLibrary)) {
    const slug = (persona.persona_library_ref || '').replace(/^v4_/, '').replace(/_/g, '-');
    const match = personaLibrary.find(p => p.name === persona.name || (slug && p.slug === slug));
    if (match) personaBlock = formatPersonaProfile(match);
  }

  if (!personaBlock) {
    personaBlock = `## ${persona.name}\n${persona.context || 'Malaysian consumer, general profile.'}`;
  }

  const scenario    = plan?.study_context?.scenario || '';
  const hypotheses  = (plan?.hypotheses?.list || []).map(h => `${h.id}: ${h.statement}`).join('\n');
  const forbidden   = plan?.hypotheses?.forbidden_assumptions || '';
  const knownRisks  = plan?.hypotheses?.known_ux_risks || '';

  const methodologyBlock = buildTurnSchemaBlock(methodologyConfig);

  const hypothesesBlock = hypotheses
    ? `\n\n## Hypotheses Being Tested\n\n${hypotheses}`
    : '';

  const risksBlock = (forbidden || knownRisks)
    ? `\n\n## Research Constraints\n\n${forbidden ? `Do NOT assume:\n${forbidden}\n\n` : ''}${knownRisks ? `Known UX risks to watch for:\n${knownRisks}` : ''}`
    : '';

  // The scenario sets the situation the persona is in before attempting any
  // task — it primes realistic behaviour the same way a moderator's pre-task
  // framing would in a real session. Shown to the persona, unlike test_intent
  // (the researcher's analysis lens), which stays out of the persona prompt.
  const scenarioBlock = scenario
    ? `\n\n## Scenario\n\n${scenario}`
    : '';

  return `${simulationPrompt}${methodologyBlock}${hypothesesBlock}${risksBlock}\n\n---\n\n## Your Persona\n\n${personaBlock}${scenarioBlock}\n\n## Study Context for This Session\n\n${persona.context || ''}`;
}

function buildTaskPrompt(task, artefactContext, turnNumber) {
  return `Turn ${turnNumber}.

Task: ${task.task_name}
Instruction: ${task.instruction || task.task_name}
Success condition: ${task.success_condition || 'Complete the task as described'}
Abandon condition: ${task.abandon_condition || 'Give up after repeated confusion'}

Artefact context:
${artefactContext}

Respond with your JSON turn object.`;
}

function buildArtefactContext(plan) {
  const cfg   = plan.study_context?.artefact_config || {};
  const parts = [];
  if (cfg.artefact_link) parts.push(`URL / Link: ${cfg.artefact_link}`);
  if (Array.isArray(cfg.files) && cfg.files.length > 0) parts.push(`Uploaded files: ${cfg.files.join(', ')}`);
  if (cfg.fidelity_level) parts.push(`Fidelity: ${cfg.fidelity_level}`);
  if (cfg.artefact_notes) parts.push(`Notes: ${cfg.artefact_notes}`);
  parts.push(`Friction sensitivity: ${cfg.friction_sensitivity || 'moderate'} — calibrate your friction scores accordingly`);
  return parts.join('\n') || 'No artefact provided — reason from task descriptions only';
}

const CORE_KEYS = new Set([
  'action', 'screen_or_step', 'inner_monologue',
  'click_target', 'scroll_direction',
  'task_completion', 'abandon_trigger', 'persona_alignment_note',
]);

const VALID_SCROLL_DIRECTIONS = new Set(['up', 'down']);

const VALID_COMPLETION_STATES = new Set(['in_progress', 'completed', 'abandoned']);

// Coerces a raw eval-field value to the type declared in methodology-config.js
// (e.g. "number 0-10" → number, "categorical: likely | unlikely | unsure" → string).
function coerceEvalValue(rawValue, fieldType) {
  if (fieldType.startsWith('number')) {
    return typeof rawValue === 'number' ? rawValue : null;
  }
  if (fieldType === 'binary') {
    return typeof rawValue === 'boolean' ? rawValue : (rawValue ?? null);
  }
  return typeof rawValue === 'string' ? rawValue : null;
}

function parseTurnResponse(rawText, turnNumber, taskId, personaId, methodologyConfig) {
  const evalFields  = methodologyConfig.eval_schema.fields;
  const knownKeys   = new Set([...CORE_KEYS, ...evalFields.map(f => f.key)]);

  try {
    const parsed = extractJsonObject(rawText);

    const evalScores = {
      task_completion:   VALID_COMPLETION_STATES.has(parsed.task_completion) ? parsed.task_completion : 'in_progress',
      abandon_trigger:   typeof parsed.abandon_trigger === 'string' ? parsed.abandon_trigger : null,
      persona_alignment: parsed.persona_alignment_note || null,
    };
    for (const field of evalFields) {
      evalScores[field.key] = coerceEvalValue(parsed[field.key], field.type);
    }

    const extraEvalKeys = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!knownKeys.has(k)) extraEvalKeys[k] = v;
    }
    Object.assign(evalScores, extraEvalKeys);

    return {
      turn_number:     turnNumber,
      task_id:         taskId,
      persona_id:      personaId,
      action:           parsed.action || '',
      screen_or_step:   parsed.screen_or_step || '',
      inner_monologue:  parsed.inner_monologue || '',
      click_target:     typeof parsed.click_target === 'string' ? parsed.click_target : null,
      scroll_direction: VALID_SCROLL_DIRECTIONS.has(parsed.scroll_direction) ? parsed.scroll_direction : null,
      eval_scores: evalScores,
      raw_response: parsed,
    };
  } catch (err) {
    const evalScores = { task_completion: 'in_progress', abandon_trigger: null, persona_alignment: null };
    for (const field of evalFields) evalScores[field.key] = field.key === 'confusion_signal' ? 'PARSE_ERROR' : null;

    return {
      turn_number:  turnNumber,
      task_id:      taskId,
      persona_id:   personaId,
      parse_error:  err.message,
      raw_text:     rawText.slice(0, 500),
      eval_scores:  evalScores,
    };
  }
}

async function callModel(provider, systemPrompt, conversationHistory, image = null, everyTurn = false) {
  let userMessage;
  if (conversationHistory.length === 1) {
    userMessage = conversationHistory[0].content;
  } else {
    const prior = conversationHistory.slice(0, -1).map(msg => {
      const label = msg.role === 'user' ? 'TASK' : 'YOUR PREVIOUS RESPONSE';
      return `${label}:\n${msg.content}`;
    }).join('\n\n---\n\n');
    const current = conversationHistory[conversationHistory.length - 1];
    userMessage = `[CONVERSATION HISTORY]\n${prior}\n\n---\n\n[CURRENT TURN]\n${current.content}`;
  }
  // Static artefact image: only sent on turn 1 to establish visual context.
  // Live prototype sessions (everyTurn) send a fresh screenshot every turn,
  // since the screen actually changes as the persona clicks through it.
  const img = (everyTurn || conversationHistory.length === 1) ? image : null;
  return await provider.call(systemPrompt, userMessage, img);
}

async function runPersonaSession(provider, persona, tasks, plan, personaLibrary, simulationPrompt, options = {}) {
  const { image = null, browserSession = null, onTaskComplete = null } = options;

  const methodologyConfig = plan?.methodology_config || getMethodologyConfig(plan?.study_context?.methodology);

  const personaId       = getPersonaId(persona);
  const artefactContext = buildArtefactContext(plan);
  const systemPrompt    = buildPersonaSystemPrompt(persona, personaLibrary, simulationPrompt, plan, methodologyConfig);
  const maxTurns        = plan.test_scenarios?.session_config?.max_turns || methodologyConfig.session_config.max_turns;
  const stuckThreshold  = plan.test_scenarios?.session_config?.stuck_loop_threshold || methodologyConfig.session_config.stuck_loop_threshold;

  const sessionTurns          = [];
  const stuckLoopFlags        = [];
  const tasksCompleted        = [];
  let consecutiveSameScreen   = 0;
  let lastScreen              = '';
  let conversationHistory     = [];

  for (const task of tasks) {
    let turnNumber = 1;
    let taskDone   = false;

    while (!taskDone && turnNumber <= maxTurns) {
      const userMessage = buildTaskPrompt(task, artefactContext, turnNumber);
      conversationHistory.push({ role: 'user', content: userMessage });

      try {
        const turnImage = browserSession
          ? await browserSessionLib.screenshot(browserSession.page)
          : image;
        const rawText = await callModel(provider, systemPrompt, conversationHistory, turnImage, !!browserSession);
        const turn    = parseTurnResponse(rawText, turnNumber, task.task_id, personaId, methodologyConfig);
        sessionTurns.push(turn);
        conversationHistory.push({ role: 'assistant', content: rawText });

        if (browserSession) {
          if (turn.action === 'click' && turn.click_target) {
            turn.click_result = await browserSessionLib.executeClick(browserSession.page, turn.click_target);
          } else if (turn.action === 'scroll' && turn.scroll_direction) {
            await browserSessionLib.executeScroll(browserSession.page, turn.scroll_direction);
          }
        }

        if (turn.screen_or_step === lastScreen) {
          consecutiveSameScreen++;
          if (consecutiveSameScreen >= stuckThreshold) {
            stuckLoopFlags.push({
              task_id: task.task_id, turn: turnNumber,
              screen: turn.screen_or_step,
              note: `Stuck loop detected — ${consecutiveSameScreen} consecutive turns on same screen`,
            });
          }
        } else {
          consecutiveSameScreen = 0;
        }
        lastScreen = turn.screen_or_step;

        const completion = turn.eval_scores.task_completion;
        if (completion === 'completed') { tasksCompleted.push(task.task_id); taskDone = true; }
        else if (completion === 'abandoned') { taskDone = true; }
      } catch (err) {
        // Fail fast: a model call error is very likely to repeat on every
        // subsequent turn (bad API key, rate limit, provider outage). Retrying
        // up to max_turns on the same hard failure just burns API calls for
        // no benefit, so abandon this task immediately instead.
        sessionTurns.push({
          turn_number: turnNumber, task_id: task.task_id, persona_id: personaId,
          model_error: err.message,
          eval_scores: { task_completion: 'abandoned', abandon_trigger: `Model call failed: ${err.message}` },
        });
        taskDone = true;
      }
      turnNumber++;
    }

    if (onTaskComplete) {
      try { await onTaskComplete({ task_id: task.task_id }); } catch {}
    }
  }

  const sessionOutcome = tasksCompleted.length === tasks.length ? 'all_tasks_completed'
    : tasksCompleted.length > 0 ? 'partial_completion'
    : 'no_tasks_completed';

  return {
    persona_id:       personaId,
    persona_name:     persona.name,
    persona_priority: persona.priority,
    turns:            sessionTurns,
    session_outcome:  sessionOutcome,
    tasks_completed:  tasksCompleted,
    tasks_attempted:  tasks.map(t => t.task_id),
    stuck_loop_flags: stuckLoopFlags,
    total_turns:      sessionTurns.length,
  };
}

function buildEvalMatrix(sessions) {
  const rows = [];
  for (const session of sessions) {
    for (const turn of session.turns) {
      rows.push({
        persona_id: session.persona_id, persona_name: session.persona_name,
        task_id: turn.task_id, turn_number: turn.turn_number,
        screen_or_step: turn.screen_or_step || '', ...turn.eval_scores,
      });
    }
  }
  const summary = {};
  for (const row of rows) {
    const key = `${row.persona_id}__${row.task_id}`;
    if (!summary[key]) {
      summary[key] = {
        persona_id: row.persona_id, task_id: row.task_id,
        turn_count: 0, avg_friction: 0, friction_sum: 0, friction_count: 0,
        confusion_count: 0, trust_issues: 0, final_status: 'in_progress',
      };
    }
    const s = summary[key];
    s.turn_count++;
    if (typeof row.friction_score === 'number') { s.friction_sum += row.friction_score; s.friction_count++; }
    if (row.confusion_signal && row.confusion_signal !== 'null') s.confusion_count++;
    if (row.trust_signal     && row.trust_signal     !== 'null') s.trust_issues++;
    if (row.task_completion === 'completed' || row.task_completion === 'abandoned') {
      s.final_status = row.task_completion;
    }
  }
  for (const s of Object.values(summary)) {
    s.avg_friction = s.friction_count > 0
      ? Math.round((s.friction_sum / s.friction_count) * 10) / 10 : null;
    delete s.friction_sum; delete s.friction_count;
  }
  return { rows, summary: Object.values(summary) };
}

module.exports = {
  loadPersonaPrompts,
  loadSimulationPrompt,
  runPersonaSession,
  buildEvalMatrix,
};
