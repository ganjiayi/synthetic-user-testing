require('dotenv').config();
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { getClient } = require('../../../src/lib/supabase');
const {
  loadPersonaPrompts,
  loadSimulationPrompt,
  runPersonaSession,
  buildEvalMatrix,
} = require('../../../src/lib/evaluate');
const { getPersonaId } = require('../../../src/lib/utils');
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

    // effectiveArtefactUrl: when set, a real Playwright session is opened
    // against it (live prototype link, or a rendered uploaded HTML file —
    // see the html_unrendered branch below). artefactTypeResolved is logged
    // into every turn's grounding_status (src/lib/evaluate.js) so a
    // grounding failure is visible in session data, not silent.
    let effectiveArtefactUrl = isLivePrototype ? artefactCfg.artefact_link : null;
    let artefactTypeResolved = isLivePrototype ? 'live_screenshot' : 'none';
    let artefactImage        = null;
    let htmlRenderError      = null;

    if (!isLivePrototype) {
      const uploadedFiles = artefactCfg.files || [];
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
            artefactTypeResolved = 'static_image';
          }
        } catch {}
      } else {
        // An uploaded HTML file with the "interactive prototype" box left
        // unchecked used to fall through to filename-only text context —
        // the persona never actually saw the page. Render it the same way
        // a live prototype renders, instead of guessing or skipping silently.
        const htmlFile = uploadedFiles.find(f => ['html', 'htm'].includes(f.split('.').pop().toLowerCase()));
        if (htmlFile) {
          try {
            const { data: blob, error: dlError } = await supabase.storage.from('materials').download(`${id}/${htmlFile}`);
            if (dlError || !blob) throw new Error(dlError?.message || 'download returned no data');
            const buf     = Buffer.from(await blob.arrayBuffer());
            const tmpPath = path.join(os.tmpdir(), `synthux-${id}-${htmlFile}`);
            fs.writeFileSync(tmpPath, buf);
            effectiveArtefactUrl = `file://${tmpPath}`;
            artefactTypeResolved = 'live_screenshot';
          } catch (err) {
            htmlRenderError      = err.message;
            artefactTypeResolved = 'html_unrendered';
          }
        }
      }
    }

    const totalTasks     = providerNames.length * activePersonas.length * (activeTasks.length || 1);
    let   completedTasks = 0;

    const sessions = [];
    for (const providerName of providerNames) {
      const provider = require(`../../../src/providers/${providerName}`);
      const img = artefactImage;
      for (const persona of activePersonas) {
        let session;

        if (htmlRenderError) {
          // The researcher uploaded an HTML artefact and it failed to
          // render — block this task rather than letting the persona
          // answer as if it had seen a page it never actually saw.
          session = {
            persona_id:       getPersonaId(persona),
            persona_name:     persona.name,
            persona_priority: persona.priority,
            turns: [{
              turn_number: 1, task_id: activeTasks[0]?.task_id || 'T1', persona_id: getPersonaId(persona),
              model_error: `Artefact rendering failed: ${htmlRenderError}`,
              grounding_status: {
                persona_match: null, artefact_type_resolved: 'html_unrendered',
                image_attached_this_turn: false, vision_capable_model: provider.visionCapable !== false,
              },
              eval_scores: { task_completion: 'abandoned', abandon_trigger: `Uploaded HTML artefact could not be rendered: ${htmlRenderError}` },
            }],
            session_outcome: 'no_tasks_completed',
            tasks_completed: [], tasks_attempted: activeTasks.map(t => t.task_id),
            stuck_loop_flags: [], total_turns: 1,
          };
        } else {
          let browserSession = null;
          if (effectiveArtefactUrl) {
            browserSession = await browserSessionLib.openSession(effectiveArtefactUrl);
          }

          try {
            session = await runPersonaSession(provider, persona, activeTasks, plan, personaLib, simPrompt, {
              image:            img,
              browserSession,
              groundingContext: { artefactTypeResolved },
              onTaskComplete:   async ({ task_id }) => {
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
