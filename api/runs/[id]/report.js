require('dotenv').config();
const { getClient } = require('../../../src/lib/supabase');
const { generateSessionDeliverables } = require('../../../src/lib/report');
const { computePassA, generatePassB } = require('../../../src/lib/analysis');
const { partitionSessionsByQaDecision } = require('../../../src/lib/exports');
const { isQaConfirmed } = require('../../../src/lib/qa-gate');

// Consolidated onto this endpoint (rather than a new api/runs/[id]/analysis.js
// file) to stay under Vercel Hobby's 12-function cap — same "action" query
// param dispatch as api/intake.js and api/runs/[id]/status.js.

function providerForName(name) {
  return require(`../../../src/providers/${name}`);
}

async function fetchRunAndSessions(id, supabase, runSelect) {
  const [runRes, sessionsRes] = await Promise.all([
    supabase.from('runs').select(runSelect).eq('id', id).single(),
    supabase.from('sessions').select('persona_id, persona_name, data').eq('run_id', id).order('created_at'),
  ]);
  return { runRes, sessionsRes };
}

async function handleDeliverables(req, res, id, supabase) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { runRes, sessionsRes } = await fetchRunAndSessions(id, supabase, 'plan, intake, qa_review');
  if (runRes.error || !runRes.data) return res.status(404).json({ error: 'Run not found' });
  if (!sessionsRes.data?.length) {
    return res.status(404).json({ error: 'No sessions found. Run evaluation first.' });
  }

  const plan          = runRes.data.plan || {};
  const providerNames = runRes.data.intake?.q8_output?.model_providers || ['claude'];

  // Same QA-decision filtering as the raw exports and analysis — a session
  // the researcher excluded shouldn't get synthesized into deliverables
  // either, even though this endpoint only feeds Pass B today.
  const { included } = partitionSessionsByQaDecision(sessionsRes.data, runRes.data.qa_review);

  const deliverables = [];
  for (const row of included) {
    const session = row.data;

    // Sessions run since key_moments/findings persistence landed already
    // carry synthesized deliverables (see api/runs/[id]/evaluate.js) — use
    // them directly rather than re-calling the LLM on every report view.
    if (session.deliverables && !session.deliverables.error) {
      deliverables.push({ persona_id: row.persona_id, persona_name: row.persona_name, ...session.deliverables });
      continue;
    }

    // Fallback for runs that predate persistence, or where synthesis failed
    // at session-run time — synthesize live, same as before.
    const sessionProv = session.provider || providerNames[0];
    try {
      const provider = providerForName(sessionProv);
      const result   = await generateSessionDeliverables(provider, session, plan);
      deliverables.push(result);
    } catch (err) {
      deliverables.push({
        persona_id:   row.persona_id,
        persona_name: row.persona_name,
        error:        err.message,
      });
    }
  }

  res.json({ run_id: id, deliverables });
}

async function handleAnalysisGet(req, res, id, supabase) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase.from('runs').select('analysis').eq('id', id).single();
  if (error || !data) return res.status(404).json({ error: 'Run not found' });
  if (!data.analysis) return res.status(404).json({ error: 'Analysis not yet generated for this run.' });

  res.json({ run_id: id, ...data.analysis });
}

async function handleAnalysisPost(req, res, id, supabase) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { runRes, sessionsRes } = await fetchRunAndSessions(id, supabase, 'plan, intake, qa_review');
  if (runRes.error || !runRes.data) return res.status(404).json({ error: 'Run not found' });
  if (!sessionsRes.data?.length) {
    return res.status(404).json({ error: 'No sessions found. Run evaluation first.' });
  }

  // Analysis is the one downstream consumer that actually enforces the QA
  // gate rather than treating it as advisory — a researcher must explicitly
  // confirm the QA review (api/runs/[id]/status.js's qa_review POST) before
  // Pass A/B can run at all. Raw exports (export.js) and the legacy
  // CSV/PPTX toolbar deliberately stay advisory-only (they filter excluded
  // sessions but don't require confirmation first), since blocking those
  // would break existing behaviour researchers already rely on; analysis is
  // new functionality with no such backward-compatibility constraint.
  if (!isQaConfirmed(runRes.data)) {
    return res.status(409).json({ error: 'QA review must be confirmed before analysis can be generated — go to the QA review tab and confirm your include/exclude decisions first.' });
  }

  const plan          = runRes.data.plan || {};
  const providerNames = runRes.data.intake?.q8_output?.model_providers || ['claude'];
  const allSessions    = sessionsRes.data.map(row => ({ ...row.data, persona_id: row.persona_id, persona_name: row.persona_name }));
  const { included }   = partitionSessionsByQaDecision(allSessions, runRes.data.qa_review);

  if (included.length === 0) {
    return res.status(400).json({ error: 'No included sessions to analyze — every session is excluded in the QA review.' });
  }

  try {
    const pass_a   = computePassA(included, plan);
    const provider = providerForName(providerNames[0]);
    const pass_b   = await generatePassB(provider, included);

    const analysis = {
      pass_a,
      pass_b,
      generated_at: new Date().toISOString(),
      based_on_session_count: included.length,
    };

    const { error } = await supabase.from('runs').update({ analysis, updated_at: new Date() }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ run_id: id, ...analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = async (req, res) => {
  const { id, action } = req.query;
  const supabase = getClient();

  if (!action) return handleDeliverables(req, res, id, supabase);
  if (action === 'analysis') {
    return req.method === 'GET' ? handleAnalysisGet(req, res, id, supabase)
      : req.method === 'POST'   ? handleAnalysisPost(req, res, id, supabase)
      : res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(404).json({ error: `Unknown action: ${action}` });
};
