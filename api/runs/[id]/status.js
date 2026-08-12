require('dotenv').config();
const { getClient } = require('../../../src/lib/supabase');
const { getMethodologyConfig, DEFAULT_METHODOLOGY } = require('../../../src/lib/methodology-config');
const { computeRunFlags, computeSessionFlags } = require('../../../src/lib/qa-gate');

// Consolidated onto the polling endpoint (rather than a new api/runs/[id]/qa.js
// file) to stay under Vercel Hobby's 12-function cap — see the "action" query
// param dispatch at the bottom, same pattern as api/intake.js.

async function handleStatus(req, res, id, supabase) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('runs')
    .select('status, stage, error, updated_at, materials')
    .eq('id', id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Run not found' });

  res.json({
    status:     data.status,
    updated_at: data.updated_at,
    ...(data.stage     && { stage:     data.stage }),
    ...(data.error     && { error:     data.error }),
    ...(data.materials && { materials: data.materials }),
  });
}

async function handleQaReviewGet(req, res, id, supabase) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [runRes, sessionsRes] = await Promise.all([
    supabase.from('runs').select('plan, qa_review').eq('id', id).single(),
    supabase.from('sessions').select('persona_id, persona_name, data').eq('run_id', id).order('created_at'),
  ]);

  if (runRes.error || !runRes.data) return res.status(404).json({ error: 'Run not found' });
  if (!sessionsRes.data?.length) {
    return res.status(404).json({ error: 'No sessions found. Run evaluation first.' });
  }

  const methodology = runRes.data.plan?.study_context?.methodology || DEFAULT_METHODOLOGY;
  const config       = getMethodologyConfig(methodology);
  const sessions     = sessionsRes.data.map(row => row.data);
  const flagged      = computeRunFlags(sessions, config.qa_thresholds);

  const existingDecisions = runRes.data.qa_review?.decisions || [];
  const decisionByPersona = Object.fromEntries(existingDecisions.map(d => [d.persona_id, d]));

  // computeRunFlags derives persona_id from each session's own data, which
  // isn't provider-prefixed for multi-provider runs — realign with the
  // sessions table row's persona_id, the canonical identifier the POST
  // handler below (and exports) key off of, so a decision sent back by the
  // client always resolves to the right row.
  const sessionsWithDecisions = flagged.map((s, i) => {
    const personaId = sessionsRes.data[i].persona_id;
    return {
      ...s,
      persona_id:   personaId,
      persona_name: sessionsRes.data[i].persona_name,
      decision:     decisionByPersona[personaId]?.decision || null,
      reason:       decisionByPersona[personaId]?.reason || null,
    };
  });

  res.json({
    run_id:        id,
    methodology,
    qa_thresholds: config.qa_thresholds,
    sessions:      sessionsWithDecisions,
    confirmed_at:  runRes.data.qa_review?.confirmed_at || null,
  });
}

async function handleQaReviewPost(req, res, id, supabase) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { decisions } = req.body || {};
  if (!Array.isArray(decisions) || decisions.length === 0) {
    return res.status(400).json({ error: 'decisions array required' });
  }
  for (const d of decisions) {
    if (!d.persona_id || !['include', 'exclude'].includes(d.decision)) {
      return res.status(400).json({ error: `Invalid decision entry: ${JSON.stringify(d)}` });
    }
  }

  const [runRes, sessionsRes] = await Promise.all([
    supabase.from('runs').select('plan').eq('id', id).single(),
    supabase.from('sessions').select('persona_id, data').eq('run_id', id),
  ]);
  if (runRes.error || !runRes.data) return res.status(404).json({ error: 'Run not found' });
  if (!sessionsRes.data?.length) {
    return res.status(404).json({ error: 'No sessions found. Run evaluation first.' });
  }

  const methodology = runRes.data.plan?.study_context?.methodology || DEFAULT_METHODOLOGY;
  const config       = getMethodologyConfig(methodology);
  const sessionByPersona = Object.fromEntries(sessionsRes.data.map(row => [row.persona_id, row.data]));

  // Server-side enforcement — a decision that disagrees with the computed
  // flag state (including a flagged session, or excluding a clean one)
  // requires a stated reason. Trusting a client-sent reason without
  // re-checking would let the requirement be bypassed silently.
  for (const d of decisions) {
    const session   = sessionByPersona[d.persona_id];
    const flags     = session ? computeSessionFlags(session, config.qa_thresholds) : [];
    const isOverride = (flags.length > 0 && d.decision === 'include') || (flags.length === 0 && d.decision === 'exclude');
    if (isOverride && !d.reason) {
      return res.status(400).json({ error: `A reason is required for ${d.persona_id}: this decision overrides the computed flag state.` });
    }
  }

  const qa_review = { decisions, confirmed_at: new Date().toISOString() };

  const { error } = await supabase.from('runs')
    .update({ qa_review, status: 'qa_reviewed', updated_at: new Date() })
    .eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ run_id: id, status: 'qa_reviewed', qa_review });
}

module.exports = async (req, res) => {
  const { id, action } = req.query;
  const supabase = getClient();

  if (!action)              return handleStatus(req, res, id, supabase);
  if (action === 'qa_review') {
    return req.method === 'GET' ? handleQaReviewGet(req, res, id, supabase)
      : req.method === 'POST'   ? handleQaReviewPost(req, res, id, supabase)
      : res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(404).json({ error: `Unknown action: ${action}` });
};
