require('dotenv').config();
const path = require('path');
const fs   = require('fs');
const { getClient } = require('../../../src/lib/supabase');

async function handler(req, res) {
  const { id } = req.query;
  const supabase = getClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('runs').select('plan').eq('id', id).single();
    if (error || !data?.plan) return res.status(404).json({ error: 'Plan not found' });
    return res.json(data.plan);
  }

  if (req.method === 'POST') {
    const { data: run, error: runError } = await supabase
      .from('runs').select('intake').eq('id', id).single();
    if (runError || !run?.intake) return res.status(404).json({ error: 'Run not found' });

    await supabase.from('runs')
      .update({ status: 'planning', updated_at: new Date() }).eq('id', id);

    try {
      const promptPath   = path.join(process.cwd(), '.claude/agents/research-planner.md');
      const systemPrompt = fs.readFileSync(promptPath, 'utf8');

      const userMessage = [
        'You are generating a Synthetic UX Research Study Plan from a validated intake config.',
        '',
        'Here is the complete intake for this study:',
        '',
        '```json',
        JSON.stringify(run.intake, null, 2),
        '```',
        '',
        'Generate a complete study plan as a single JSON object following the plan schema exactly.',
        'Respond with ONLY the JSON object — no preamble, no markdown fences, no explanation.',
      ].join('\n');

      const provider    = require('../../../src/providers/openai');
      const rawResponse = await provider.call(systemPrompt, userMessage);

      const cleaned = rawResponse
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const plan = JSON.parse(cleaned);

      plan._meta = {
        run_id:       id,
        generated_at: new Date().toISOString(),
        model:        provider.modelName,
        provider:     provider.id,
        plan_version: '1.0',
      };

      await supabase.from('runs')
        .update({ plan, status: 'plan_ready', updated_at: new Date() }).eq('id', id);

      return res.json({ status: 'plan_ready' });
    } catch (err) {
      await supabase.from('runs').update({
        status: 'error', stage: 'planning', error: err.message, updated_at: new Date(),
      }).eq('id', id);
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}

module.exports = handler;
