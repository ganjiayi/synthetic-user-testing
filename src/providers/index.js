/**
 * Model provider selector
 *
 * Resolution order:
 *   1. --model <claude|openai> CLI flag
 *   2. MODEL_PROVIDER environment variable
 *   3. Interactive prompt (if running in a TTY)
 *   4. Exit with a clear error
 *
 * Usage in pipeline scripts:
 *   const provider = await require('../providers').getProvider();
 *   const response = await provider.call(systemPrompt, userMessage);
 *   console.log('Model:', provider.id, provider.modelName);
 */

const readline = require('readline');

function parseCliFlag() {
  const idx = process.argv.indexOf('--model');
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1].toLowerCase();
  }
  return null;
}

function promptUser() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\nNo model provider configured.');
    console.log('Which model should run this study?\n');
    console.log('  1. Claude (claude-sonnet-4-6)  — uses Claude Code CLI, no API key needed');
    console.log('  2. OpenAI (gpt-4o)             — requires OPENAI_API_KEY in .env\n');
    rl.question('Enter 1 or 2: ', (answer) => {
      rl.close();
      if (answer.trim() === '1') return resolve('claude');
      if (answer.trim() === '2') return resolve('openai');
      console.error('\nInvalid choice. Please enter 1 or 2.');
      process.exit(1);
    });
  });
}

async function resolveProviderName() {
  // 1. CLI flag
  const flag = parseCliFlag();
  if (flag) {
    if (!['claude', 'openai'].includes(flag)) {
      console.error(`Unknown --model value: "${flag}". Use claude or openai.`);
      process.exit(1);
    }
    return flag;
  }

  // 2. Environment variable
  const env = (process.env.MODEL_PROVIDER || '').toLowerCase();
  if (env === 'claude' || env === 'openai') return env;

  // 3. Interactive prompt (TTY only)
  if (process.stdin.isTTY) return await promptUser();

  // 4. Non-interactive with no config — fail clearly
  console.error(
    '\nNo model provider specified.\n' +
    'Set MODEL_PROVIDER=claude or MODEL_PROVIDER=openai in .env,\n' +
    'or pass --model claude / --model openai as a CLI flag.\n'
  );
  process.exit(1);
}

async function getProvider() {
  const name = await resolveProviderName();

  if (name === 'claude') {
    return require('./claude');
  }

  if (name === 'openai') {
    require('dotenv').config();
    return require('./openai');
  }
}

module.exports = { getProvider };
