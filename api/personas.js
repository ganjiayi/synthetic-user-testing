const path = require('path');
const fs   = require('fs');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const libPath = path.join(process.cwd(), 'personas/v4_library.json');
    const library  = JSON.parse(fs.readFileSync(libPath, 'utf8'));
    return res.json(library);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
