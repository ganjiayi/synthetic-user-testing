/**
 * Shared session-metrics helpers — used by both RunDetail.js (full run view)
 * and Results.js (results overview) so the two pages never compute the same
 * numbers two different ways.
 */

// Legacy fallback for runs generated before plan.methodology_config existed —
// matches exactly what every run produced before this field was introduced.
export const LEGACY_EVAL_FIELDS = [
  { key: 'friction_score',   type: 'number 0-10' },
  { key: 'confusion_signal', type: 'string or null' },
  { key: 'trust_signal',     type: 'string or null' },
  { key: 'abandon_trigger',  type: 'string or null' },
];

export function getMethodologyEvalFields(plan) {
  return plan?.methodology_config?.eval_schema?.fields || LEGACY_EVAL_FIELDS;
}

// The single number-typed field a methodology surfaces as its "headline" score
// (friction_score for task-based methodologies, appeal_rating for reaction/
// impression-based ones, etc) — falls back to friction_score for legacy plans.
export function headlineNumericField(fields) {
  return fields.find(f => f.type.startsWith('number'))?.key || 'friction_score';
}

export function humanizeFieldKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function frictionColor(n) {
  return n >= 7 ? 'var(--red)' : n >= 4 ? 'var(--amber)' : 'var(--teal)';
}

export function buildMetricCards(evalFields) {
  const cards = [
    { label: 'Task completion rate', key: 'completion_rate', format: 'pct', desc: 'Personas completing all tasks' },
  ];
  for (const field of evalFields.slice(0, 3)) {
    if (field.type.startsWith('number')) {
      cards.push({ label: `Avg ${humanizeFieldKey(field.key)}`, key: `avg__${field.key}`, format: 'score', desc: field.description || '' });
    } else {
      cards.push({ label: `${humanizeFieldKey(field.key)} signals`, key: `count__${field.key}`, format: 'count', desc: field.description || 'Turns with this signal present' });
    }
  }
  return cards.slice(0, 4);
}

export function computeMetrics(sessions, evalFields) {
  const allTurns = sessions.flatMap(s => s.turns || []);
  const total    = sessions.length;

  const metrics = {
    completion_rate: total ? sessions.filter(s => s.session_outcome === 'all_tasks_completed').length / total : null,
    abandon_count:   sessions.filter(s => s.session_outcome !== 'all_tasks_completed').length,
  };

  for (const field of evalFields) {
    const values = allTurns.map(t => t.eval_scores?.[field.key]);
    if (field.type.startsWith('number')) {
      const numeric = values.filter(v => typeof v === 'number');
      metrics[`avg__${field.key}`] = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : null;
    } else {
      metrics[`count__${field.key}`] = values.filter(v => v && v !== 'null' && v !== false).length;
    }
  }

  return metrics;
}

// Per-task average of the headline field, for one session — e.g. avg
// friction_score across all turns of task T2 for a single persona.
export function taskAverage(session, taskId, headlineKey) {
  const scores = (session.turns || [])
    .filter(t => t.task_id === taskId)
    .map(t => t.eval_scores?.[headlineKey])
    .filter(n => typeof n === 'number');
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

// Completed / abandoned / in_progress for one task within one session —
// same derivation RunDetail.js's PersonaTaskBlock uses.
export function taskOutcome(session, taskId) {
  const turns = (session.turns || []).filter(t => t.task_id === taskId);
  if (turns.length === 0) return null;
  const completed = (session.tasks_completed || []).includes(taskId);
  const abandoned = turns.some(t => t.eval_scores?.task_completion === 'abandoned');
  return completed ? 'completed' : abandoned ? 'abandoned' : 'in_progress';
}

// Deterministic, non-fabricated go/no-go relabeling of session_outcome —
// there is no LLM-generated verdict anywhere in the pipeline, so this is a
// direct mapping, not a synthesized judgment.
export function sessionSignal(session) {
  if (session.session_outcome === 'all_tasks_completed') return 'go';
  if (session.session_outcome === 'partial_completion')  return 'conditional';
  return 'no_go';
}

// The most severe real signal string recorded on this session's turns — the
// actual confusion_signal/abandon_trigger/trust_signal text the persona
// produced during the session, not an invented summary paragraph. Picks the
// turn with the highest headline score, then whichever signal field it has.
export function primaryFrictionSignal(session, headlineKey) {
  const turns = session.turns || [];
  if (turns.length === 0) return null;
  const worst = turns.reduce((a, b) => {
    const av = a.eval_scores?.[headlineKey];
    const bv = b.eval_scores?.[headlineKey];
    return (typeof bv === 'number' && (typeof av !== 'number' || bv > av)) ? b : a;
  });
  const es = worst.eval_scores || {};
  const text = es.abandon_trigger || es.confusion_signal || es.trust_signal || null;
  return text ? { taskId: worst.task_id, text } : null;
}
