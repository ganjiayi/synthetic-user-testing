/**
 * Core evaluation logic — shared by CLI (evaluator.js) and Vercel API routes.
 * No filesystem writes here; callers handle persistence.
 */

const path = require('path');
const fs   = require('fs');

function loadPersonaPrompts() {
  const p = path.join(process.cwd(), 'personas/v4_system_prompts.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function loadSimulationPrompt() {
  const p = path.join(process.cwd(), '.claude/agents/simulation-runner.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : buildDefaultSimulationPrompt();
}

function buildDefaultSimulationPrompt() {
  return `You are a synthetic UX testing agent simulating a real Malaysian consumer interacting with a website or app.

You will be given:
1. A persona profile describing who you are — your background, tech literacy, motivations, and frustrations
2. A task instruction telling you what to attempt
3. The current screen or artefact state

At each turn you must respond with a JSON object containing exactly these keys:

{
  "action": "string — what you do next (click, scroll, read, type, abandon, complete)",
  "screen_or_step": "string — which screen or element you are looking at",
  "inner_monologue": "string — what you are thinking in your own words, as this persona",
  "friction_score": number 0-10,
  "confusion_signal": "string or null — describe confusion if present, null if not",
  "trust_signal": "string or null — describe trust/distrust reaction if present, null if not",
  "task_completion": "in_progress | completed | abandoned",
  "abandon_trigger": "string or null — why you abandoned, null if still in progress or completed",
  "persona_alignment_note": "string — one sentence on how your behaviour reflects your persona traits"
}

Rules:
- Stay in character as the persona at all times
- friction_score 0 = completely smooth, 10 = blocked entirely
- Only set task_completion to 'completed' when you have reached the defined success condition
- Only set task_completion to 'abandoned' when you hit the defined abandon condition
- Your inner_monologue must sound like this specific persona — use their vocabulary, concerns, and communication style
- Respond with ONLY the JSON object — no preamble, no explanation`;
}

function buildPersonaSystemPrompt(persona, personaLibrary, simulationPrompt) {
  let personaBlock = '';

  if (personaLibrary) {
    const nameVariants = [
      persona.name,
      persona.name.toLowerCase(),
      persona.persona_library_ref,
    ].filter(Boolean);

    for (const variant of nameVariants) {
      const re = new RegExp(`#{1,3}[^\\n]*${variant}[^\\n]*\\n([\\s\\S]*?)(?=#{1,3}|$)`, 'i');
      const m = personaLibrary.match(re);
      if (m) { personaBlock = m[0]; break; }
    }
  }

  if (!personaBlock) {
    personaBlock = `## ${persona.name}\n${persona.context || 'Malaysian consumer, general profile.'}`;
  }

  return `${simulationPrompt}\n\n---\n\n## Your Persona\n\n${personaBlock}\n\n## Study Context for This Session\n\n${persona.context || ''}`;
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
  if (cfg.artefact_link)  parts.push(`URL / Link: ${cfg.artefact_link}`);
  if (cfg.input_format)   parts.push(`Format: ${cfg.input_format}`);
  if (cfg.fidelity_level) parts.push(`Fidelity: ${cfg.fidelity_level}`);
  if (cfg.artefact_notes) parts.push(`Notes: ${cfg.artefact_notes}`);
  parts.push(`Friction sensitivity: ${cfg.friction_sensitivity || 'moderate'} — calibrate your friction scores accordingly`);
  return parts.join('\n') || 'No artefact link provided — reason from description only';
}

function parseTurnResponse(rawText, turnNumber, taskId, personaId) {
  const cleaned = rawText
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      turn_number:     turnNumber,
      task_id:         taskId,
      persona_id:      personaId,
      action:          parsed.action || '',
      screen_or_step:  parsed.screen_or_step || '',
      inner_monologue: parsed.inner_monologue || '',
      eval_scores: {
        friction_score:    typeof parsed.friction_score === 'number' ? parsed.friction_score : null,
        confusion_signal:  parsed.confusion_signal || null,
        trust_signal:      parsed.trust_signal || null,
        task_completion:   parsed.task_completion || 'in_progress',
        abandon_trigger:   parsed.abandon_trigger || null,
        persona_alignment: parsed.persona_alignment_note || null,
      },
      raw_response: parsed,
    };
  } catch (err) {
    return {
      turn_number:  turnNumber,
      task_id:      taskId,
      persona_id:   personaId,
      parse_error:  err.message,
      raw_text:     rawText.slice(0, 500),
      eval_scores: {
        friction_score: null, confusion_signal: 'PARSE_ERROR',
        trust_signal: null, task_completion: 'in_progress',
        abandon_trigger: null, persona_alignment: null,
      },
    };
  }
}

async function callModel(provider, systemPrompt, conversationHistory) {
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
  return await provider.call(systemPrompt, userMessage);
}

async function runPersonaSession(provider, persona, tasks, plan, personaLibrary, simulationPrompt) {
  const personaId       = persona.persona_library_ref || persona.name.toLowerCase().replace(/\s+/g, '_');
  const artefactContext = buildArtefactContext(plan);
  const systemPrompt    = buildPersonaSystemPrompt(persona, personaLibrary, simulationPrompt);
  const maxTurns        = plan.test_scenarios?.session_config?.max_turns || 20;
  const stuckThreshold  = plan.test_scenarios?.session_config?.stuck_loop_threshold || 3;

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
        const rawText = await callModel(provider, systemPrompt, conversationHistory);
        const turn    = parseTurnResponse(rawText, turnNumber, task.task_id, personaId);
        sessionTurns.push(turn);
        conversationHistory.push({ role: 'assistant', content: rawText });

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
        sessionTurns.push({
          turn_number: turnNumber, task_id: task.task_id, persona_id: personaId,
          model_error: err.message, eval_scores: { task_completion: 'in_progress' },
        });
      }
      turnNumber++;
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
