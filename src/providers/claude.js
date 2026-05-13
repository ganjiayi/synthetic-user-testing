/**
 * Claude provider
 * Calls the Claude Code CLI via spawnSync. No API key required —
 * uses the local Claude Code subscription.
 */

const { spawnSync } = require('child_process');
const fs             = require('fs');
const os             = require('os');
const path           = require('path');

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

function findClaudeBinary() {
  const fromPath = spawnSync('which', ['claude'], { encoding: 'utf8' });
  if (fromPath.status === 0 && fromPath.stdout.trim()) return fromPath.stdout.trim();

  const baseDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude-code');
  if (fs.existsSync(baseDir)) {
    const versions = fs.readdirSync(baseDir).sort().reverse();
    for (const v of versions) {
      const bin = path.join(baseDir, v, 'claude.app', 'Contents', 'MacOS', 'claude');
      if (fs.existsSync(bin)) return bin;
    }
  }
  throw new Error('Claude CLI binary not found. Ensure Claude Code is installed.');
}

/**
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {string} model response text
 */
function callClaude(systemPrompt, userMessage) {
  const claudeBin = findClaudeBinary();

  const tmpSystem = path.join(os.tmpdir(), `claude-sys-${Date.now()}.txt`);
  const tmpMsg    = path.join(os.tmpdir(), `claude-msg-${Date.now()}.txt`);
  fs.writeFileSync(tmpSystem, systemPrompt, 'utf8');
  fs.writeFileSync(tmpMsg,    userMessage,  'utf8');

  let result;
  try {
    result = spawnSync(claudeBin, [
      '--print', '--model', DEFAULT_MODEL,
      '--system-prompt', fs.readFileSync(tmpSystem, 'utf8'),
      '--tools', '', '--no-session-persistence',
      fs.readFileSync(tmpMsg, 'utf8'),
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 180000 });
  } finally {
    try { fs.unlinkSync(tmpSystem); } catch {}
    try { fs.unlinkSync(tmpMsg);    } catch {}
  }

  if (result.error) throw new Error(`Claude CLI spawn failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Claude CLI exited ${result.status}:\n${result.stderr}`);
  return result.stdout;
}

module.exports = {
  id:        'claude',
  modelName: DEFAULT_MODEL,
  call:      callClaude,
};
