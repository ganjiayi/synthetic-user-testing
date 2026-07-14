/**
 * OpenAI provider
 * Calls the OpenAI Chat Completions API using the openai npm package.
 * Requires OPENAI_API_KEY in environment.
 */

const { isVisionCapable } = require('../lib/vision-support');

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
 * @param {{ b64: string, mediaType: string }|null} image  — optional image for vision
 * @returns {Promise<string>} model response text
 */
async function callOpenAI(systemPrompt, userMessage, image = null) {
  const client = getClient();

  const userContent = image
    ? [
        { type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.b64}`, detail: 'high' } },
        { type: 'text', text: userMessage },
      ]
    : userMessage;

  const response = await client.chat.completions.create({
    model:           DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
    max_tokens:      8192,
  });

  return response.choices[0]?.message?.content || '';
}

module.exports = {
  id:            'openai',
  modelName:     DEFAULT_MODEL,
  call:          callOpenAI,
  visionCapable: isVisionCapable(DEFAULT_MODEL, 'openai provider'),
};
