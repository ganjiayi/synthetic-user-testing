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

/**
 * Splits a conversational agent's raw reply into the natural-language part
 * and a trailing structured proposal, per the output contract appended to
 * these agents' system prompts at call time (see api/intake/chat/[agent].js).
 * Fails soft — a missing or malformed trailing block never throws; the
 * whole response is treated as `reply` and `proposal` comes back empty,
 * since a bad proposal must never block the user from typing directly
 * into the real fields.
 */
function splitReplyAndProposal(rawText) {
  const match = rawText.match(/```json\s*([\s\S]*?)```\s*$/);
  if (!match) return { reply: rawText.trim(), proposal: {} };

  const reply = rawText.slice(0, match.index).trim();
  try {
    return { reply, proposal: extractJsonObject(match[1]) };
  } catch {
    return { reply, proposal: {} };
  }
}

module.exports = { extractJsonObject, getPersonaId, splitReplyAndProposal };
