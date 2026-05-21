require('dotenv').config();
const multer = require('multer');
const { getClient } = require('../../../src/lib/supabase');

const storage = multer.memoryStorage();
const upload  = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: `Method ${req.method} not allowed` });

  const { id } = req.query;

  try {
    await runMiddleware(req, res, upload.single('file'));
  } catch (err) {
    return res.status(400).json({ error: `File parse error: ${err.message}` });
  }

  if (!req.file) return res.status(400).json({ error: 'No file received' });

  const supabase = getClient();
  const safe     = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');

  const { error: uploadError } = await supabase.storage
    .from('materials')
    .upload(`${id}/${safe}`, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data: run } = await supabase.from('runs').select('materials').eq('id', id).single();
  const current = run?.materials || [];
  if (!current.includes(safe)) {
    await supabase.from('runs')
      .update({ materials: [...current, safe], updated_at: new Date() }).eq('id', id);
  }

  res.json({ filename: safe, url: `/api/runs/${id}/materials/${safe}` });
};
