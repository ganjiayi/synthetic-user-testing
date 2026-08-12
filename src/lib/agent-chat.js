/**
 * Shared config + system-prompt builder for the three conversational intake
 * agents, called through a stateless HTTP endpoint (api/intake/chat/[agent].js)
 * rather than the Claude Code Agent SDK. Their source .claude/agents/*.md
 * files are never modified — this appends a call-time-only instruction that
 * asks the model to end every reply with a trailing structured proposal, so
 * a plain conversational API call can still drive real form fields.
 */
const fs = require('fs');
const path = require('path');

const AGENTS = {
  'research-question': {
    file: 'research-question-crafter.md',
    shape: '{"primary_rq": "string", "secondary_rqs": ["string", ...]}',
  },
  'persona-fit': {
    file: 'persona-fit-suggester.md',
    shape: '{"segments": [{"code": "ST|PI|TE|FC|RC", "priority": "primary|secondary"}], "priority_segment": "one of those codes"}',
  },
  'methodology-task': {
    file: 'methodology-and-task-crafter.md',
    shape: '{"scenario": "string or null", "tasks": [{"name": "string", "instruction": "string", "whatToTest": "string", "noClickConstraint": true|false, "topTaskCategory": "Navigation|Discovery|Account|Payment|Support", "priority": "P0|P1|P2"}]}',
  },
};

function outputContract(shape) {
  return `

---

## API integration note (appended at call time — not part of the source file above)

You are being called through a stateless HTTP endpoint, not the Claude Code Agent SDK. You have no
file tools available despite what your frontmatter says — nothing you "write" touches any file.
Do this instead:

1. Reply to the user in natural language exactly as you would in conversation, following every
   instruction above.
2. After your reply, on its own line, output exactly one fenced block:
\`\`\`json
{ ... }
\`\`\`
   Shape: ${shape}
   Only include a key if you're proposing/confirming it this turn; omit keys you have nothing
   new to say about. If you're only asking a clarifying question, output {}.
3. Never omit the fenced block. Never put anything after it.`;
}

// repoRoot lets callers pass process.cwd() (API routes) or an explicit path
// (the throwaway local test script, run from an arbitrary working directory).
function loadAgentPrompt(agentKey, repoRoot) {
  const agent = AGENTS[agentKey];
  if (!agent) return null;
  const raw = fs.readFileSync(path.join(repoRoot, '.claude/agents', agent.file), 'utf8');
  return raw + outputContract(agent.shape);
}

module.exports = { AGENTS, loadAgentPrompt };
