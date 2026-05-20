require('dotenv').config();
const { getClient } = require('../../../src/lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const supabase = getClient();

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
};
