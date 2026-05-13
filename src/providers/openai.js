/**
 * OpenAI provider
 * Calls the OpenAI Chat Completions API using the openai npm package.
 * Requires OPENAI_API_KEY in environment.
 */

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

let _client = null;

function getClient() {
  if (_client) return _client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set.\n' +
      'Add it to your .env file:\n' +
      '  OPENAI_API_KEY=sk-...\n'
    );
  }

  const { OpenAI } = require('openai');
  _client = new OpenAI({ apiKey });
  return _client;
}

/**
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<string>} model response text
 */
async function callOpenAI(systemPrompt, userMessage) {
  const client = getClient();

  const response = await client.chat.completions.create({
    model:    DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
    max_tokens:  2000,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}

module.exports = {
  id:        'openai',
  modelName: DEFAULT_MODEL,
  call:      callOpenAI,
};
