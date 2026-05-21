require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

let _client = null;
function getClient() {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  _client = new Anthropic({ apiKey });
  return _client;
}

async function callClaude(systemPrompt, userMessage) {
  const client = getClient();
  const message = await client.messages.create({
    model:      DEFAULT_MODEL,
    max_tokens: 8192,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
  });
  return message.content[0]?.text || '';
}

module.exports = {
  id:        'claude',
  modelName: DEFAULT_MODEL,
  call:      callClaude,
};
