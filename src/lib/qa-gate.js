/**
 * Step 6.5 QA gate — computes review flags for each session before it feeds
 * exports (raw XLSX/DOCX) or analysis (Pass A/B). Flags are advisory only:
 * no session is ever auto-dropped here. A flagged session is surfaced to the
 * researcher in the QA review screen, who makes an explicit include/exclude
 * call (persisted separately — see api/runs/[id]/status.js's qa_review
 * action and src/lib/methodology-config.js's qa_thresholds field for where
 * the per-methodology threshold values come from).
 */

// Longest run of consecutive turns matching predicate — used for the
// consecutive-parse/model-error check below.
function longestConsecutiveRun(turns, predicate) {
  let max = 0;
  let current = 0;
  for (const turn of turns) {
    if (predicate(turn)) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

function computeSessionFlags(session, qaThresholds) {
  const flags = [];
  const turns = session.turns || [];
  const totalTurns = session.total_turns ?? turns.length;

  if (totalTurns < qaThresholds.min_turns_for_signal) {
    flags.push({
      code:   'too_short',
      label:  'Too short for reliable signal',
      detail: `Only ${totalTurns} turn(s) recorded — below the minimum of ${qaThresholds.min_turns_for_signal} turns.`,
    });
  }

  const firstAbandonTurn = turns.find(t => t.eval_scores?.task_completion === 'abandoned')?.turn_number;
  if (firstAbandonTurn !== undefined && firstAbandonTurn <= qaThresholds.early_abandon_turn) {
    flags.push({
      code:   'early_abandon',
      label:  'Suspiciously early abandon',
      detail: `Abandoned at turn ${firstAbandonTurn}, at or before the early-abandon threshold (turn ${qaThresholds.early_abandon_turn}).`,
    });
  }

  const maxConsecutiveErrors = longestConsecutiveRun(turns, t => !!(t.parse_error || t.model_error));
  if (maxConsecutiveErrors >= qaThresholds.max_consecutive_parse_errors) {
    flags.push({
      code:   'consecutive_errors',
      label:  'Consecutive parse/model errors',
      detail: `${maxConsecutiveErrors} consecutive parse/model-error turns — likely a harness or model issue, not a real persona reaction.`,
    });
  }

  const stuckLoopCount = (session.stuck_loop_flags || []).length;
  if (stuckLoopCount >= qaThresholds.stuck_loop_tolerance) {
    flags.push({
      code:   'stuck_loop',
      label:  'Repeated stuck-loop signal',
      detail: `${stuckLoopCount} stuck-loop flag(s) recorded — at or above the tolerance of ${qaThresholds.stuck_loop_tolerance}.`,
    });
  }

  return flags;
}

// One row per session, including clean sessions (flags: []) — the QA screen
// shows the full set so a researcher can see what wasn't flagged too, not
// just what was.
function computeRunFlags(sessions, qaThresholds) {
  return sessions.map(session => ({
    persona_id:      session.persona_id,
    persona_name:    session.persona_name,
    total_turns:     session.total_turns ?? (session.turns || []).length,
    session_outcome: session.session_outcome,
    flags:           computeSessionFlags(session, qaThresholds),
  }));
}

// Shared guard for anything downstream of the gate (raw exports, Pass A/B
// analysis) — a run is confirmed once a qa_review with a confirmed_at has
// been written (see api/runs/[id]/status.js's qa_review POST). Re-running
// evaluate.js appends new session rows but doesn't clear qa_review, so a
// stale confirmation for a session set that's since grown is still possible —
// callers that care about that should compare confirmed_at against the
// sessions' own timestamps rather than trusting presence alone.
function isQaConfirmed(run) {
  return !!run?.qa_review?.confirmed_at;
}

module.exports = { computeSessionFlags, computeRunFlags, isQaConfirmed };
