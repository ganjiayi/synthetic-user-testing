require('dotenv').config();
const { getClient } = require('../../../src/lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const supabase = getClient();

  const [runRes, sessionsRes] = await Promise.all([
    supabase.from('runs')
      .select('id, created_at, updated_at, status, stage, error, intake, plan, materials')
      .eq('id', id).single(),
    supabase.from('sessions')
      .select('persona_id, persona_name, data')
      .eq('run_id', id).order('created_at'),
  ]);

  if (runRes.error || !runRes.data) return res.status(404).json({ error: 'Run not found' });

  res.json({
    ...runRes.data,
    sessions: (sessionsRes.data || []).map(s => s.data),
  });
};
