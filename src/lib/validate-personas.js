/**
 * Validates every persona in personas/v4_library.json against
 * personas/schema.json, plus a slug-uniqueness check — src/lib/evaluate.js
 * looks personas up by exact slug match (p.slug === persona.persona_library_ref),
 * so a duplicate or malformed slug would silently break that lookup and fall
 * through to the generic one-line persona context instead of the full profile.
 */
const path = require('path');
const fs   = require('fs');
const Ajv  = require('ajv');

let _validate = null;

function getValidator() {
  if (_validate) return _validate;
  const schemaPath = path.join(process.cwd(), 'personas/schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  _validate = ajv.compile(schema);
  return _validate;
}

/**
 * @param {object} libraryData  parsed contents of personas/v4_library.json
 * @throws {Error} listing every schema violation and any duplicate slugs found
 */
function validatePersonaLibrary(libraryData) {
  const validate = getValidator();
  const personas = Array.isArray(libraryData?.personas) ? libraryData.personas : [];
  const problems = [];

  personas.forEach((persona, i) => {
    const label = persona?.slug || persona?.name || `personas[${i}]`;
    const valid = validate(persona);
    if (!valid) {
      validate.errors.forEach(e => {
        problems.push(`  - ${label}: ${e.instancePath || '(root)'} ${e.message}`);
      });
    }
  });

  const seenSlugs = new Map();
  personas.forEach((persona, i) => {
    const slug = persona?.slug;
    if (!slug) return;
    if (seenSlugs.has(slug)) {
      problems.push(`  - duplicate slug "${slug}" — personas[${seenSlugs.get(slug)}] and personas[${i}] both use it, only the last will ever be matched by lookups`);
    } else {
      seenSlugs.set(slug, i);
    }
  });

  if (problems.length > 0) {
    throw new Error(`personas/v4_library.json does not match personas/schema.json:\n${problems.join('\n')}`);
  }
}

module.exports = { validatePersonaLibrary };
