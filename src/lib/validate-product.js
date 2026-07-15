/**
 * Validates a loaded product record (e.g. products/ACM.json) against
 * products/schema.json before it's used to build a research-planner prompt.
 *
 * Without this, a malformed product file (missing section, wrong type,
 * bad enum value) would silently reach the LLM prompt as broken JSON
 * context, producing a garbled or wrong study plan with no error pointing
 * back to the actual cause.
 */
const path = require('path');
const fs   = require('fs');
const Ajv  = require('ajv');

let _validate = null;

function getValidator() {
  if (_validate) return _validate;
  const schemaPath = path.join(process.cwd(), 'products/schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  _validate = ajv.compile(schema);
  return _validate;
}

/**
 * @param {object} productData  parsed contents of products/<id>.json
 * @param {string} productId    used only to make the error message readable
 * @throws {Error} listing every schema violation found, if any
 */
function validateProduct(productData, productId) {
  const validate = getValidator();
  const valid = validate(productData);
  if (!valid) {
    const problems = validate.errors
      .map(e => `  - ${e.instancePath || '(root)'} ${e.message}`)
      .join('\n');
    throw new Error(
      `products/${productId}.json does not match products/schema.json:\n${problems}`
    );
  }
}

module.exports = { validateProduct };
