const path = require('path');
const fs   = require('fs');
const { validateProduct } = require('../../src/lib/validate-product');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const productPath = path.join(process.cwd(), `products/${id}.json`);
  if (!fs.existsSync(productPath)) {
    return res.status(404).json({ error: `No product data for "${id}"` });
  }

  try {
    const productDB = JSON.parse(fs.readFileSync(productPath, 'utf8'));
    validateProduct(productDB, id);
    return res.json(productDB);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
