require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { isVisionCapable } = require('../lib/vision-support');

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

let _client = null;
function getClient() {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  _client = new Anthropic({ apiKey });
  return _client;
}

async function callClaude(systemPrompt, userMessage, image = null) {
  const client = getClient();
  const userContent = image
    ? [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.b64 } },
        { type: 'text',  text: userMessage },
      ]
    : userMessage;
  const message = await client.messages.create({
    model:      DEFAULT_MODEL,
    max_tokens: 8192,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userContent }],
  });
  return message.content[0]?.text || '';
}

// Multi-turn variant for conversational intake agents — the endpoint holds no
// server-side memory, so the full transcript is resent every turn by the caller.
async function chatClaude(systemPrompt, messages) {
  const client = getClient();
  const message = await client.messages.create({
    model:      DEFAULT_MODEL,
    max_tokens: 8192,
    system:     systemPrompt,
    messages:   messages.map(m => ({ role: m.role, content: m.text })),
  });
  return message.content[0]?.text || '';
}

module.exports = {
  id:            'claude',
  modelName:     DEFAULT_MODEL,
  call:          callClaude,
  chat:          chatClaude,
  visionCapable: isVisionCapable(DEFAULT_MODEL, 'claude provider'),
};
