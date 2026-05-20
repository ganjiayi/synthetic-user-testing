require('dotenv').config();
const { getClient } = require('../../../src/lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const supabase = getClient();

  const { data, error } = await supabase
    .from('sessions')
    .select('persona_id, persona_name, data')
    .eq('run_id', id)
    .order('created_at');

  if (error) return res.status(500).json({ error: error.message });
  if (!data?.length) return res.status(404).json({ error: 'Sessions not found' });

  const sessions = data.map(row => ({ ...row.data, persona_id: row.persona_id, persona_name: row.persona_name }));
  res.json({ sessions, count: sessions.length });
};
