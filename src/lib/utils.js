/**
 * Extracts and parses a JSON object from a model response, tolerating
 * markdown code fences and leading/trailing prose around the object.
 * Throws if no valid JSON object can be parsed.
 */
function extractJsonObject(rawText) {
  let cleaned = rawText
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  if (cleaned[0] !== '{' || cleaned[cleaned.length - 1] !== '}') {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];
  }

  return JSON.parse(cleaned);
}

/**
 * Derives the canonical persona id used to key sessions and match
 * personas back to plan.user_segments.segments.
 */
function getPersonaId(persona) {
  return persona.persona_library_ref || (persona.name || '').toLowerCase().replace(/\s+/g, '_');
}

module.exports = { extractJsonObject, getPersonaId };
