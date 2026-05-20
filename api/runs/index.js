require('dotenv').config();
const { getClient } = require('../../src/lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { runId, intake } = req.body;
  if (!runId || !intake) return res.status(400).json({ error: 'runId and intake required' });

  const supabase = getClient();
  const { error } = await supabase.from('runs').insert({
    id:     runId,
    intake,
    status: 'intake_saved',
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ runId, status: 'intake_saved' });
};
