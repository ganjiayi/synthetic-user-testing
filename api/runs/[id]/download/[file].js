require('dotenv').config();
const { getClient } = require('../../../../src/lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, file } = req.query;
  const supabase = getClient();

  const { data, error } = await supabase.storage
    .from('materials')
    .createSignedUrl(`${id}/report/${file}`, 3600);

  if (error) return res.status(404).json({ error: 'File not found' });

  res.redirect(data.signedUrl);
};
