require('dotenv').config();
const { getClient } = require('../../../src/lib/supabase');
const {
  loadPersonaPrompts,
  loadSimulationPrompt,
  runPersonaSession,
  buildEvalMatrix,
} = require('../../../src/lib/evaluate');
const browserSessionLib = require('../../../src/lib/browser-session');

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const supabase = getClient();

  const { data: run, error: runError } = await supabase
    .from('runs').select('plan, intake').eq('id', id).single();
  if (runError || !run?.plan) {
    return res.status(400).json({ error: 'Plan not found. Generate plan first.' });
  }

  await supabase.from('runs')
    .update({ status: 'evaluating', updated_at: new Date() }).eq('id', id);

  try {
    const plan           = run.plan;
    const providerNames  = run.intake?.q8_output?.model_providers || ['openai'];
    const personaLib     = loadPersonaPrompts();
    const simPrompt      = loadSimulationPrompt();
    const activePersonas = (plan.user_segments?.segments || []).filter(s => s.include !== false);
    const activeTasks    = plan.test_scenarios?.scenarios || [];

    // Interactive prototype runs (e.g. a Claude Design HTML export deployed
    // to Vercel) are flagged by artefact_type === 'interactive_prototype',
    // set by the research-planner agent from q2_context.is_interactive_prototype.
    // These drive a real Playwright browser session instead of a static image.
    const artefactCfg     = plan.study_context?.artefact_config || {};
    const isLivePrototype = artefactCfg.artefact_type === 'interactive_prototype' && !!artefactCfg.artefact_link;

    // Load artefact image from Supabase Storage if files were uploaded
    let artefactImage = null;
    if (!isLivePrototype) {
      const uploadedFiles = artefactCfg.files || [];
      if (uploadedFiles.length > 0) {
        const imageExts = new Set(['jpg','jpeg','png','gif','webp']);
        const imageFile = uploadedFiles.find(f => imageExts.has(f.split('.').pop().toLowerCase()));
        if (imageFile) {
          try {
            const { data: blob } = await supabase.storage.from('materials').download(`${id}/${imageFile}`);
            if (blob) {
              const buf      = Buffer.from(await blob.arrayBuffer());
              const ext      = imageFile.split('.').pop().toLowerCase();
              const mimeMap  = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
              artefactImage  = { b64: buf.toString('base64'), mediaType: mimeMap[ext] || 'image/jpeg' };
            }
          } catch {}
        }
      }
    }

    const totalTasks     = providerNames.length * activePersonas.length * (activeTasks.length || 1);
    let   completedTasks = 0;

    const sessions = [];
    for (const providerName of providerNames) {
      const provider = require(`../../../src/providers/${providerName}`);
      // Only pass image to providers that support vision (OpenAI gpt-4o, Claude)
      const img = artefactImage;
      for (const persona of activePersonas) {
        let browserSession = null;
        if (isLivePrototype) {
          browserSession = await browserSessionLib.openSession(artefactCfg.artefact_link);
        }

        let session;
        try {
          session = await runPersonaSession(provider, persona, activeTasks, plan, personaLib, simPrompt, {
            image:           img,
            browserSession,
            onTaskComplete:  async ({ task_id }) => {
              completedTasks++;
              await supabase.from('runs').update({
                stage:      JSON.stringify({
                  completed: completedTasks,
                  total:     totalTasks,
                  provider:  providerName,
                  persona:   persona.name,
                  task:      task_id,
                }),
                updated_at: new Date(),
              }).eq('id', id);
            },
          });
        } finally {
          if (browserSession) await browserSessionLib.closeSession(browserSession);
        }

        session.provider = providerName;
        sessions.push(session);

        await supabase.from('sessions').insert({
          run_id:       id,
          persona_id:   providerNames.length > 1 ? `${providerName}::${session.persona_id}` : session.persona_id,
          persona_name: session.persona_name,
          data:         session,
        });
      }
    }

    const evalMatrix = buildEvalMatrix(sessions);

    await supabase.from('runs').update({
      status:      'evaluation_complete',
      updated_at:  new Date(),
    }).eq('id', id);

    return res.json({
      status:         'evaluation_complete',
      sessions_count: sessions.length,
      eval_summary:   evalMatrix.summary,
    });
  } catch (err) {
    await supabase.from('runs').update({
      status: 'error', stage: 'evaluating', error: err.message, updated_at: new Date(),
    }).eq('id', id);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = handler;
