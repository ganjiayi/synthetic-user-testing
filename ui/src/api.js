import { PRODUCTS } from './data/questionnaire';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl    = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseBrowser = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

async function req(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body:    body ? JSON.stringify(body) : undefined,
  });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  if (!res.ok) {
    if (isJson) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  if (!isJson) {
    throw new Error(`Server returned an unexpected response (${res.status}). Check Vercel function logs.`);
  }
  return res.json();
}

export const api = {

  listRuns() {
    return req('GET', '/api/runs');
  },

  getRun(runId) {
    return req('GET', `/api/runs/${runId}`);
  },

  async isAvailable() {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(4000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  createRun(runId, intake) {
    return req('POST', '/api/runs', { runId, intake });
  },

  startPlan(runId) {
    return req('POST', `/api/runs/${runId}/plan`);
  },

  getPlan(runId) {
    return req('GET', `/api/runs/${runId}/plan`);
  },

  startEvaluation(runId) {
    return req('POST', `/api/runs/${runId}/evaluate`);
  },

  getSessions(runId) {
    return req('GET', `/api/runs/${runId}/sessions`);
  },

  getStatus(runId) {
    return req('GET', `/api/runs/${runId}/status`);
  },

  getDeliverables(runId) {
    return req('GET', `/api/runs/${runId}/report`);
  },

  async uploadFiles(runId, files) {
    if (!supabaseBrowser) throw new Error('Supabase browser client not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
    const results = [];
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const { error } = await supabaseBrowser.storage
        .from('materials')
        .upload(`${runId}/${safe}`, file, { contentType: file.type, upsert: true });
      if (error) throw new Error(`Upload failed for ${file.name}: ${error.message}`);
      results.push({ filename: safe });
    }
    return results;
  },

};

export const PERSONA_MAP = {
  ST: { name: 'Hakim',       ref: 'spontaneous-traditionalist', priority: 'primary',   context: 'Spontaneous Traditionalist — mobile-first, Sooka user, price-sensitive, impulsive.' },
  PI: { name: 'Syafiqah',    ref: 'progressive-influencer',     priority: 'secondary',  context: 'Progressive Influencer — urban professional, social-media driven.' },
  TE: { name: 'Marcus',      ref: 'trendsetter-explorer',       priority: 'secondary',  context: 'Trendsetter Explorer — high tech literacy, benchmarks against Netflix.' },
  FC: { name: 'Puan Rohani', ref: 'family-centric-devotee',     priority: 'primary',   context: 'Family-Centric Devotee — low tech literacy, family-first, long-term Astro customer.' },
  RC: { name: 'David',       ref: 'routine-conservative',       priority: 'secondary',  context: 'Routine Conservative — habitual, risk-averse, long-term Astro subscriber.' },
};

export function generateRunId(studyName) {
  const now  = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const slug = (studyName || 'study')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${dd}${mm}${yyyy}_${slug}_${rand}`;
}

export function buildIntake(form, runId) {
  const now         = new Date();
  const productMeta = PRODUCTS.find(p => p.id === form.product) || {};
  const productName = productMeta.name || form.product || '';

  return {
    meta: {
      run_id:          runId,
      researcher_name: '',
      date_submitted:  `${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}`,
      schema_version:  '1.0',
    },
    q1_product:   productName,
    q2_context: {
      lifecycle:       form.lifecycle || '',
      design_phase:    form.designPhase || '',
      fidelity:        form.fidelity || '',
      artefact_notes:  form.artefactNotes || '',
      is_interactive_prototype: !!form.isInteractivePrototype,
      test_materials: {
      files: (form.testMaterials?.files || []).map(f => f.name).filter(Boolean),
      urls:  form.testMaterials?.urls || [],
    },
    },
    q3_goals: {
      insight_type:       form.insightType || '',
      feature:            form.feature || '',
      why_now:            form.whyNow || '',
      primary_rq:         form.primaryRQ || '',
      secondary_rqs:      form.secondaryRQs || '',
    },
    q4_personas: {
      selected:          form.personas || [],
      priority_segment:  form.prioritySegment || '',
    },
    q4_persona_segments: {
      segments: Object.entries(PERSONA_MAP).map(([code, p]) => ({
        name:                p.name,
        context:             p.context,
        priority:            p.priority,
        persona_library_ref: p.ref,
        include:             (form.personas || []).includes(code),
      })),
      priority_segment: form.prioritySegment || '',
    },
    q5_product_context: {
      product_name:      productName,
      product_id:        form.product || '',
      product_desc:      productMeta.desc || '',
      feature_under_test:form.feature || '',
      why_this_why_now:  form.whyNow || '',
    },
    q6_methodology: {
      methodology:   form.methodology || '',
      scenario:      form.scenario || '',
      tasks:         form.tasks || [],
    },
    q7_hypotheses: {
      h1:                   form.h1 || '',
      h2:                   form.h2 || '',
      h3:                   form.h3 || '',
      known_risks:          form.knownRisks || '',
      forbidden_assumptions:form.forbiddenAssumptions || '',
    },
    q8_output: {
      model_providers: form.modelProviders?.length ? form.modelProviders : (form.modelProvider ? [form.modelProvider] : ['openai']),
      output_formats: form.outputFormats || [],
      additional_notes:form.additionalNotes || '',
    },
  };
}
