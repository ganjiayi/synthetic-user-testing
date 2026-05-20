require('dotenv').config();
const { getClient } = require('../../src/lib/supabase');

module.exports = async (req, res) => {
  const supabase = getClient();

  // ── GET: list all runs (summary fields only) ─────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('runs')
      .select('id, created_at, status, intake')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const runs = (data || []).map(run => ({
      id:         run.id,
      created_at: run.created_at,
      status:     run.status,
      product:    run.intake?.q5_product_context?.product_name || run.intake?.q1_product || '—',
      primary_rq: run.intake?.q3_goals?.primary_rq || '—',
    }));

    return res.json({ runs });
  }

  // ── POST: create new run ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { runId, intake } = req.body;
    if (!runId || !intake) return res.status(400).json({ error: 'runId and intake required' });

    const { error } = await supabase.from('runs').insert({
      id:     runId,
      intake,
      status: 'intake_saved',
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ runId, status: 'intake_saved' });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
