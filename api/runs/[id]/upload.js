require('dotenv').config();
const formidable = require('formidable');
const fs         = require('fs');
const { getClient } = require('../../../src/lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: `Method ${req.method} not allowed` });

  const { id } = req.query;
  const supabase = getClient();

  const form = formidable({ maxFileSize: 15 * 1024 * 1024, uploadDir: '/tmp', keepExtensions: true });

  let files;
  try {
    [, files] = await form.parse(req);
  } catch (err) {
    return res.status(400).json({ error: `File parse error: ${err.message}` });
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: 'No file received' });

  const safe   = file.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const buffer = fs.readFileSync(file.filepath);

  const { error: uploadError } = await supabase.storage
    .from('materials')
    .upload(`${id}/${safe}`, buffer, { contentType: file.mimetype, upsert: true });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data: run } = await supabase.from('runs').select('materials').eq('id', id).single();
  const current = run?.materials || [];
  if (!current.includes(safe)) {
    await supabase.from('runs')
      .update({ materials: [...current, safe], updated_at: new Date() }).eq('id', id);
  }

  res.json({ filename: safe, url: `/api/runs/${id}/materials/${safe}` });
};
