/**
 * API utility for the SynthUX frontend.
 *
 * When REACT_APP_API_URL is set (Railway backend available) — uses real API.
 * When not set (Vercel demo mode, no backend) — returns null so pages fall
 * back to their hardcoded demo data automatically.
 */

const BASE = process.env.REACT_APP_API_URL || '';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body:    body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {

  /* Check if the backend is reachable */
  async isAvailable() {
    if (!BASE) return false;
    try {
      const res = await fetch(`${BASE}/api/health`, {
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /* Create a new run and save intake */
  createRun(runId, intake) {
    return req('POST', '/api/runs', { runId, intake });
  },

  /* Start plan generation (async — poll status) */
  startPlan(runId) {
    return req('POST', `/api/runs/${runId}/plan`);
  },

  /* Fetch the generated plan */
  getPlan(runId) {
    return req('GET', `/api/runs/${runId}/plan`);
  },

  /* Start persona evaluation sessions (async — poll status) */
  startEvaluation(runId) {
    return req('POST', `/api/runs/${runId}/evaluate`);
  },

  /* Fetch all persona session results */
  getSessions(runId) {
    return req('GET', `/api/runs/${runId}/sessions`);
  },

  /* Start report generation — Excel, DOCX, PPTX (async — poll status) */
  startReport(runId) {
    return req('POST', `/api/runs/${runId}/report`);
  },

  /* Poll run status */
  getStatus(runId) {
    return req('GET', `/api/runs/${runId}/status`);
  },

  /* Get a direct download URL for a report file */
  downloadUrl(runId, filename) {
    return `${BASE}/api/runs/${runId}/download/${filename}`;
  },

};

/* Generate a run ID from date + study name */
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
  return `${dd}${mm}${yyyy}_${slug}`;
}

/* Build an intake.json object from questionnaire form data */
export function buildIntake(form, runId) {
  const now = new Date();
  return {
    meta: {
      run_id:          runId,
      researcher_name: '',
      date_submitted:  `${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}`,
      schema_version:  '1.0',
    },
    q1_product:   form.product || '',
    q2_context: {
      lifecycle:       form.lifecycle || '',
      design_phase:    form.designPhase || '',
      fidelity:        form.fidelity || '',
      artefact_notes:  form.artefactNotes || '',
      test_materials:  form.testMaterials || { files: [], urls: [] },
    },
    q3_goals: {
      insight_type:       form.insightType || '',
      feature:            form.feature || '',
      why_now:            form.whyNow || '',
      primary_rq:         form.primaryRQ || '',
      secondary_rqs:      form.secondaryRQs || '',
      decision_to_support:form.decisionToSupport || '',
    },
    q4_personas: {
      selected:          form.personas || [],
      priority_segment:  form.prioritySegment || '',
    },
    q5_product_context: {
      product_name:      form.product || '',
      feature_under_test:form.feature || '',
      why_this_why_now:  form.whyNow || '',
    },
    q6_methodology: {
      methodology:   form.methodology || '',
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
      model_provider: form.modelProvider || 'openai',
      audience:       form.audience || [],
      output_formats: form.outputFormats || [],
      additional_notes:form.additionalNotes || '',
    },
  };
}
