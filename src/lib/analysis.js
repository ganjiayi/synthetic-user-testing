/**
 * Step 8 of the target pipeline spec: cross-session analysis, split
 * "math stays code / semantics stay LLM". Produces analysis.json — a
 * strictly descriptive artifact (no recommendations; those live in the
 * Step 9 report, see src/lib/report.js) — from whichever sessions the
 * Step 6.5 QA gate confirmed as included (callers pass an already-filtered
 * list, see src/lib/exports.js's partitionSessionsByQaDecision).
 *
 * Pass A (computePassA): deterministic rollup off the methodology's
 * eval_schema.fields — mirrors ui/src/lib/metrics.js's computeMetrics math
 * (same mean-over-pooled-turns calculation) so the app never reports two
 * different "average friction" numbers for the same run, extended with
 * median and per-task / per-persona-segment breakdowns.
 *
 * Pass B (generatePassB): one scoped LLM call that clusters the key_moments
 * and findings already persisted per-session (src/lib/report.js's
 * generateSessionDeliverables, called at session-run time — see
 * api/runs/[id]/evaluate.js) into named cross-session themes with verbatim
 * citations. The LLM proposes themes and citations; it never labels its own
 * confidence — signal_strength is stamped on afterward, in code, from the
 * citation count (see signalStrength below), matching every methodology's
 * data_integrity_rules ("fewer than 3 sessions -> limited signal").
 */
const { extractJsonObject } = require('./utils');

const MIN_SESSIONS_FOR_STRONG_SIGNAL = 3;

function signalStrength(sessionCount) {
  return sessionCount >= MIN_SESSIONS_FOR_STRONG_SIGNAL ? 'strong' : 'limited';
}

function mean(nums) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Sessions that actually produced a non-null value for this field — signal
// strength should reflect how many personas actually said something, not
// how many turns exist across however many sessions were run.
function sessionsWithSignal(sessions, fieldKey) {
  return sessions.filter(s => (s.turns || []).some(t => {
    const v = t.eval_scores?.[fieldKey];
    return v !== null && v !== undefined && v !== '' && v !== 'null';
  })).length;
}

function aggregateField(sessions, field) {
  const turns  = sessions.flatMap(s => s.turns || []);
  const values = turns.map(t => t.eval_scores?.[field.key]);
  const type   = field.type || '';
  const strength = signalStrength(sessionsWithSignal(sessions, field.key));

  if (type.startsWith('number')) {
    const numeric = values.filter(v => typeof v === 'number');
    const m = mean(numeric);
    return {
      type: 'numeric',
      mean:   m !== null ? Math.round(m * 10) / 10 : null,
      median: median(numeric),
      n:      numeric.length,
      signal_strength: strength,
    };
  }

  if (type.startsWith('categorical')) {
    const counts = {};
    for (const v of values) {
      if (!v || v === 'null') continue;
      counts[v] = (counts[v] || 0) + 1;
    }
    return {
      type: 'categorical',
      distribution: counts,
      n: Object.values(counts).reduce((a, b) => a + b, 0),
      signal_strength: strength,
    };
  }

  // Nullable string (confusion_signal, trust_signal, etc.) — a rate, not a
  // raw count, so it's comparable across runs with different session counts.
  const nonNull = values.filter(v => v && v !== 'null').length;
  return {
    type: 'nullable_string',
    non_null_rate: values.length ? Math.round((nonNull / values.length) * 100) / 100 : null,
    n: values.length,
    signal_strength: strength,
  };
}

function taskCompletionRate(sessions, taskId = null) {
  let completed = 0, attempted = 0;
  for (const s of sessions) {
    const ids = (s.tasks_attempted || []).filter(id => !taskId || id === taskId);
    for (const id of ids) {
      attempted++;
      if ((s.tasks_completed || []).includes(id)) completed++;
    }
  }
  return attempted > 0 ? Math.round((completed / attempted) * 100) / 100 : null;
}

function computeSlice(sessions, evalFields) {
  const fields = {};
  for (const field of evalFields) fields[field.key] = aggregateField(sessions, field);
  return {
    session_count: sessions.length,
    task_completion_rate: taskCompletionRate(sessions),
    fields,
  };
}

function computePassA(sessions, plan) {
  const evalFields = plan?.methodology_config?.eval_schema?.fields || [];
  const tasks       = plan?.test_scenarios?.scenarios || [];

  const byTask = {};
  for (const task of tasks) {
    const taskSessions = sessions.filter(s => (s.tasks_attempted || []).includes(task.task_id));
    byTask[task.task_id] = {
      task_name: task.task_name,
      ...computeSlice(taskSessions, evalFields),
    };
  }

  const bySegment = {};
  for (const priority of ['primary', 'secondary']) {
    const segmentSessions = sessions.filter(s => s.persona_priority === priority);
    if (segmentSessions.length === 0) continue;
    bySegment[priority] = computeSlice(segmentSessions, evalFields);
  }

  return {
    overall: computeSlice(sessions, evalFields),
    by_task: byTask,
    by_persona_segment: bySegment,
  };
}

/* ── Pass B — LLM theme clustering over already-persisted deliverables ── */

function buildPassBSystemPrompt() {
  return `You are a UX research analyst performing thematic synthesis across multiple already-completed synthetic user sessions. You will be given each session's persona name, plus its key moments and findings — these were already synthesized per-session from that session's own transcript. Do not re-interpret raw transcripts; only cluster what's given here.

Group the input into named cross-session themes. Respond with a single JSON object: { "themes": [ ... ] }. No other top-level keys.

Each theme:
{
  "theme": "string — short name for this theme",
  "description": "string — 1-2 sentences on what this theme is",
  "citations": [ { "persona_name": "string", "quote": "string — copied verbatim from the input, not paraphrased" } ]
}

Rules:
- Every citation's quote must be copied verbatim from the provided input — never invent or paraphrase a quote.
- A theme needs at least one citation. Do not propose a theme with no supporting evidence in the input.
- Do not merge unrelated observations just to make a bigger theme — a theme with one citation is fine if that's genuinely all the evidence.
- Do not label your own confidence, strength, or significance for any theme — that is computed separately, from the citation count, not from your judgment.
- Never state or imply statistical significance, confidence intervals, or p-values.
- Respond with ONLY the JSON object — no preamble, no explanation, no markdown code fences.`;
}

function buildPassBUserPrompt(sessions) {
  const blocks = sessions.map(s => {
    const d = s.deliverables;
    if (!d || d.error) return `## ${s.persona_name}\n(no synthesized deliverables available for this session)`;

    const momentLines = Object.entries(d.key_moments || {}).flatMap(([category, moments]) =>
      (moments || []).map(m => `- [${category}] "${m.quote}"${m.context ? ` — ${m.context}` : ''}`)
    );
    const findingsKey = Object.keys(d).find(k => k.endsWith('_findings'));
    const findingLines = findingsKey
      ? Object.entries(d[findingsKey] || {}).flatMap(([category, items]) => (items || []).map(item => `- [${category}] ${item}`))
      : [];

    return [
      `## ${s.persona_name}`,
      momentLines.length ? `Key moments:\n${momentLines.join('\n')}` : 'Key moments: none recorded.',
      findingLines.length ? `Findings:\n${findingLines.join('\n')}` : 'Findings: none recorded.',
    ].join('\n\n');
  });

  return `${blocks.join('\n\n---\n\n')}\n\nSynthesize the cross-session themes JSON object as instructed.`;
}

function parsePassB(rawText) {
  const parsed = extractJsonObject(rawText);
  const themes = Array.isArray(parsed.themes) ? parsed.themes : [];
  return themes
    .filter(t => t && typeof t.theme === 'string' && Array.isArray(t.citations) && t.citations.length > 0)
    .map(t => {
      const uniquePersonas = new Set(t.citations.map(c => c.persona_name)).size;
      return {
        theme: t.theme,
        description: typeof t.description === 'string' ? t.description : '',
        citations: t.citations
          .filter(c => c && typeof c.quote === 'string' && typeof c.persona_name === 'string')
          .map(c => ({ persona_name: c.persona_name, quote: c.quote })),
        signal_strength: signalStrength(uniquePersonas),
      };
    });
}

async function generatePassB(provider, sessions) {
  const eligible = sessions.filter(s => s.deliverables && !s.deliverables.error);
  if (eligible.length === 0) return { themes: [] };

  const systemPrompt = buildPassBSystemPrompt();
  const userPrompt    = buildPassBUserPrompt(eligible);
  const rawText       = await provider.call(systemPrompt, userPrompt);
  return { themes: parsePassB(rawText) };
}

module.exports = {
  computePassA,
  generatePassB,
  signalStrength,
  MIN_SESSIONS_FOR_STRONG_SIGNAL,
};
