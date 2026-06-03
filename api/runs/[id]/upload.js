require('dotenv').config();
const { getClient } = require('../../../src/lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: `Method ${req.method} not allowed` });

  const { id }       = req.query;
  const { filename } = req.body || {};
  if (!filename) return res.status(400).json({ error: 'filename required' });

  const supabase = getClient();
  const { data: run } = await supabase.from('runs').select('materials').eq('id', id).single();
  const current = run?.materials || [];
  if (!current.includes(filename)) {
    await supabase.from('runs')
      .update({ materials: [...current, filename], updated_at: new Date() }).eq('id', id);
  }

  res.json({ filename, url: `/api/runs/${id}/materials/${filename}` });
};
