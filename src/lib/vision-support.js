/**
 * Static model -> vision-capability lookup, shared by both providers so the
 * table can't drift between claude.js and openai.js.
 *
 * Matched by prefix since model identifiers carry version/date suffixes
 * (e.g. "claude-3-5-sonnet-20241022", "gpt-4o-2024-08-06").
 *
 * Unrecognized models default to vision-capable=true with a warning, rather
 * than blocking by default — the narrow case this guards against is a
 * misconfigured *known* text-only model (e.g. claude-instant, gpt-3.5-turbo),
 * not every future model release.
 */
const KNOWN_MODELS = [
  // Claude — vision-capable
  { prefix: 'claude-sonnet-4',   capable: true },
  { prefix: 'claude-opus-4',     capable: true },
  { prefix: 'claude-3-7-sonnet', capable: true },
  { prefix: 'claude-3-5-sonnet', capable: true },
  { prefix: 'claude-3-5-haiku',  capable: true },
  { prefix: 'claude-3-opus',     capable: true },
  { prefix: 'claude-3-sonnet',   capable: true },
  { prefix: 'claude-3-haiku',    capable: true },
  // Claude — text-only (legacy, no vision)
  { prefix: 'claude-2',          capable: false },
  { prefix: 'claude-instant',    capable: false },

  // OpenAI — vision-capable
  { prefix: 'gpt-4o',      capable: true },
  { prefix: 'gpt-4-turbo', capable: true },
  { prefix: 'gpt-4-vision', capable: true },
  { prefix: 'o1',          capable: true },
  // OpenAI — text-only
  { prefix: 'gpt-4-0',     capable: false }, // base gpt-4-0314/0613, no vision
  { prefix: 'gpt-3.5',     capable: false },
];

function isVisionCapable(modelName, providerLabel) {
  const match = KNOWN_MODELS.find(m => modelName.startsWith(m.prefix));
  if (match) return match.capable;
  console.warn(
    `[${providerLabel || 'provider'}] Unrecognized model "${modelName}" — assuming vision-capable. ` +
    `Update src/lib/vision-support.js if this model is text-only.`
  );
  return true;
}

module.exports = { isVisionCapable };
