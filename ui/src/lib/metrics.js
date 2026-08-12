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

// Browser twin of src/lib/exports.js's partitionSessionsByQaDecision (same
// split as this file's other duplicated helpers — api/ and src/lib/ are
// CommonJS, ui/ is a separately-built ES module app). Sessions with no
// recorded decision default to included, same as the server-side version —
// keep both in sync by hand if the QA decision shape changes.
export function partitionSessionsByQaDecision(sessions, qaReview) {
  const decisionByPersona = Object.fromEntries((qaReview?.decisions || []).map(d => [d.persona_id, d]));
  const included = [];
  const excluded = [];
  for (const session of sessions) {
    const d = decisionByPersona[session.persona_id];
    if (d?.decision === 'exclude') excluded.push(session);
    else included.push(session);
  }
  return { included, excluded };
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

  // Guarantee a numeric headline field and a categorical field (e.g.
  // preferred_variant on A/B Testing) each get a card slot, since those are
  // typically a methodology's actual primary signal — rather than always
  // taking eval_schema's first 3 fields regardless of position. Falls back
  // to declaration order for any remaining slots.
  const numberField      = evalFields.find(f => f.type.startsWith('number'));
  const categoricalField = evalFields.find(f => f.type.startsWith('categorical'));
  const prioritized       = [numberField, categoricalField].filter(Boolean);
  const remaining         = evalFields.filter(f => !prioritized.includes(f));

  for (const field of [...prioritized, ...remaining].slice(0, 3)) {
    if (field.type.startsWith('number')) {
      cards.push({ label: `Avg ${humanizeFieldKey(field.key)}`, key: `avg__${field.key}`, format: 'score', desc: field.description || '' });
    } else if (field.type.startsWith('categorical')) {
      cards.push({ label: humanizeFieldKey(field.key), key: `breakdown__${field.key}`, format: 'text', desc: field.description || '' });
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
      if (field.type.startsWith('categorical')) {
        // e.g. preferred_variant → "A: 3 · B: 1 · No Preference: 1" — a real
        // distribution across whatever values actually occurred, not just a
        // truthy count, since a categorical field's whole point is which
        // value was picked.
        const counts = {};
        for (const v of values) {
          if (!v || v === 'null') continue;
          counts[v] = (counts[v] || 0) + 1;
        }
        const entries = Object.entries(counts);
        metrics[`breakdown__${field.key}`] = entries.length
          ? entries.map(([k, n]) => `${humanizeFieldKey(k)}: ${n}`).join(' · ')
          : null;
      }
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
