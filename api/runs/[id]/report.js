require('dotenv').config();
const { getClient } = require('../../../src/lib/supabase');
const { generateSessionDeliverables } = require('../../../src/lib/report');

function providerForName(name) {
  return require(`../../../src/providers/${name}`);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const supabase = getClient();

  const [runRes, sessionsRes] = await Promise.all([
    supabase.from('runs').select('plan, intake').eq('id', id).single(),
    supabase.from('sessions').select('persona_id, persona_name, data').eq('run_id', id).order('created_at'),
  ]);

  if (runRes.error || !runRes.data) return res.status(404).json({ error: 'Run not found' });
  if (!sessionsRes.data?.length) {
    return res.status(404).json({ error: 'No sessions found. Run evaluation first.' });
  }

  const plan          = runRes.data.plan || {};
  const providerNames = runRes.data.intake?.q8_output?.model_providers || ['claude'];

  const deliverables = [];
  for (const row of sessionsRes.data) {
    const session     = row.data;
    const sessionProv = session.provider || providerNames[0];
    try {
      const provider = providerForName(sessionProv);
      const result   = await generateSessionDeliverables(provider, session, plan);
      deliverables.push(result);
    } catch (err) {
      deliverables.push({
        persona_id:   row.persona_id,
        persona_name: row.persona_name,
        error:        err.message,
      });
    }
  }

  res.json({ run_id: id, deliverables });
};
