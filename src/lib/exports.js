/**
 * Server-side raw-export builders (target pipeline spec's "Deliverable 1" —
 * raw XLSX + Word transcript). Both filter sessions by the Step 6.5 QA
 * gate's decisions (run.qa_review.decisions): excluded sessions are omitted
 * from the main data and listed on their own audit section instead of
 * silently vanishing. Sessions with no recorded decision (QA review not yet
 * run, or a session added after the last review) default to included —
 * nothing is dropped without an explicit exclude decision.
 *
 * Node-only (no browser DOM), used by api/runs/[id]/export.js.
 *
 * getMethodologyEvalFields is duplicated from ui/src/lib/metrics.js rather
 * than imported — api/ and src/lib/ are CommonJS, ui/ is a separately-built
 * ES module React app, so the two can't share a require() boundary (same
 * split as scripts/local-report-helpers.js). Keep the eval-field fallback
 * list here in sync with the UI copy by hand if it changes.
 */
const XLSX = require('xlsx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const LEGACY_EVAL_FIELDS = [
  { key: 'friction_score',   type: 'number 0-10' },
  { key: 'confusion_signal', type: 'string or null' },
  { key: 'trust_signal',     type: 'string or null' },
  { key: 'abandon_trigger',  type: 'string or null' },
];

function getMethodologyEvalFields(plan) {
  return plan?.methodology_config?.eval_schema?.fields || LEGACY_EVAL_FIELDS;
}

function partitionSessionsByQaDecision(sessions, qaReview) {
  const decisionByPersona = Object.fromEntries((qaReview?.decisions || []).map(d => [d.persona_id, d]));
  const included = [];
  const excluded = [];
  for (const session of sessions) {
    const d = decisionByPersona[session.persona_id];
    if (d?.decision === 'exclude') excluded.push({ session, reason: d.reason || '' });
    else included.push(session);
  }
  return { included, excluded };
}

function buildDataRows(run, sessions) {
  const plan = run.plan || {};
  const tasks = plan.test_scenarios?.scenarios || [];
  const taskMap         = Object.fromEntries(tasks.map(t => [t.task_id, t.task_name]));
  const taskCategoryMap = Object.fromEntries(tasks.map(t => [t.task_id, t.top_task_category || '']));
  const taskPriorityMap = Object.fromEntries(tasks.map(t => [t.task_id, t.priority || '']));
  const product  = run.intake?.q5_product_context?.product_name || run.intake?.q1_product || run.id;
  const feature  = run.intake?.q5_product_context?.feature_under_test || '';
  const method   = plan.study_context?.methodology || run.intake?.q6_methodology?.methodology || '';
  const evalFields = getMethodologyEvalFields(plan);

  const cols = [
    'run_id', 'date', 'product', 'feature', 'methodology',
    'persona', 'priority', 'model',
    'task_id', 'task_name', 'top_task_category', 'task_priority',
    'variant_id', 'turn_number',
    'action', 'task_completion',
    ...evalFields.map(f => f.key),
    'persona_alignment', 'inner_monologue',
  ];

  const rows = [cols];
  for (const session of sessions) {
    for (const turn of (session.turns || [])) {
      const es = turn.eval_scores || {};
      rows.push([
        run.id,
        run.created_at ? new Date(run.created_at).toISOString().slice(0, 10) : '',
        product, feature, method,
        session.persona_name, session.persona_priority || '', session.provider || '',
        turn.task_id, taskMap[turn.task_id] || turn.task_id,
        taskCategoryMap[turn.task_id] || '', taskPriorityMap[turn.task_id] || '',
        turn.variant_id || '', turn.turn_number,
        turn.action || '', es.task_completion || '',
        ...evalFields.map(f => (es[f.key] ?? '')),
        es.persona_alignment || '',
        turn.inner_monologue || '',
      ]);
    }
  }
  return rows;
}

function buildXlsx(run) {
  const allSessions = run.sessions || [];
  const { included, excluded } = partitionSessionsByQaDecision(allSessions, run.qa_review);

  const wb = XLSX.utils.book_new();

  const dataSheet = XLSX.utils.aoa_to_sheet(buildDataRows(run, included));
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Session Data');

  const auditRows = [
    ['persona_id', 'persona_name', 'total_turns', 'session_outcome', 'exclude_reason'],
    ...excluded.map(({ session, reason }) => [
      session.persona_id,
      session.persona_name,
      session.total_turns ?? (session.turns || []).length,
      session.session_outcome || '',
      reason,
    ]),
  ];
  const auditSheet = XLSX.utils.aoa_to_sheet(auditRows);
  XLSX.utils.book_append_sheet(wb, auditSheet, 'Excluded Sessions');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function buildDocxTranscript(run) {
  const plan = run.plan || {};
  const allSessions = run.sessions || [];
  const { included, excluded } = partitionSessionsByQaDecision(allSessions, run.qa_review);

  const tasks       = plan.test_scenarios?.scenarios || [];
  const taskMap      = Object.fromEntries(tasks.map(t => [t.task_id, t]));
  const methodology  = plan.study_context?.methodology || run.intake?.q6_methodology?.methodology || '';
  const scenario     = plan.study_context?.scenario || run.intake?.q6_methodology?.scenario || '';
  const artefactDesc = run.intake?.q2_context?.artefact_notes || plan.study_context?.product || '';

  const children = [
    new Paragraph({ text: 'SynthUX Research Transcript', heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: artefactDesc, italics: true })] }),
  ];

  if (excluded.length > 0) {
    children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    children.push(new Paragraph({ text: 'Excluded from this transcript (QA review)', heading: HeadingLevel.HEADING_2 }));
    for (const { session, reason } of excluded) {
      children.push(new Paragraph({ text: `${session.persona_name} — ${reason || 'no reason recorded'}` }));
    }
  }

  for (const session of included) {
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    children.push(new Paragraph({ text: 'Session details', heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ children: [new TextRun({ text: `Persona: ${session.persona_name} (${session.persona_id})`, bold: true })] }));
    children.push(new Paragraph({ text: `Provider: ${session.provider || '—'}` }));
    children.push(new Paragraph({ text: `Methodology: ${methodology || '—'}` }));
    if (scenario) children.push(new Paragraph({ text: `Scenario: ${scenario}` }));

    for (const taskId of session.tasks_attempted || []) {
      const task = taskMap[taskId];
      if (task) {
        children.push(new Paragraph({ text: `Task: ${task.task_id} — ${task.task_name}` }));
        if (task.instruction) children.push(new Paragraph({ text: `Instruction: ${task.instruction}` }));
      }
    }
    children.push(new Paragraph({
      text: `Outcome: ${session.session_outcome} (${session.total_turns} turns, tasks completed: ${(session.tasks_completed || []).join(', ') || 'none'})`,
    }));

    children.push(new Paragraph({ text: 'Turn-by-turn transcript', heading: HeadingLevel.HEADING_2 }));

    for (const turn of session.turns || []) {
      if (turn.parse_error || turn.model_error) {
        children.push(new Paragraph({ text: `Turn ${turn.turn_number} — [no usable data: ${turn.parse_error || turn.model_error}]` }));
        continue;
      }
      const variantLabel = turn.variant_id === 'comparison' ? ' (Comparison turn)'
        : turn.variant_id ? ` (Variant ${turn.variant_id})`
        : '';
      children.push(new Paragraph({ text: `Turn ${turn.turn_number}${variantLabel}`, heading: HeadingLevel.HEADING_3 }));
      children.push(new Paragraph({ text: `Action: ${turn.action || '—'}` }));
      children.push(new Paragraph({ text: `Screen / step: ${turn.screen_or_step || '—'}` }));
      if (turn.click_target) children.push(new Paragraph({ text: `Click target: ${turn.click_target}` }));
      if (turn.scroll_direction) children.push(new Paragraph({ text: `Scroll: ${turn.scroll_direction}` }));
      if (turn.click_result) {
        const r = turn.click_result;
        children.push(new Paragraph({ text: `Click result: ${r.reason}${r.error ? ` (${r.error})` : ''}` }));
      }
      children.push(new Paragraph({ children: [new TextRun({ text: `"${turn.inner_monologue || '—'}"`, italics: true })] }));

      for (const [k, v] of Object.entries(turn.eval_scores || {})) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${k}: `, bold: true }),
            new TextRun({ text: v === null || v === undefined || v === '' ? '—' : String(v) }),
          ],
        }));
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// Step 9 Deliverable 2 — the interpretive Word report. reportContent is
// src/lib/report.js's generateAnalyzedReport() output; analysis is the
// persisted analysis.json (src/lib/analysis.js's computePassA/generatePassB).
// Findings render alongside their originating theme's citations so a
// recommendation is never presented without the evidence behind it visible
// on the same page.
function buildAnalyzedReportDocx(run, analysis, reportContent) {
  const plan        = run.plan || {};
  const productName  = plan.study_context?.product || run.intake?.q5_product_context?.product_name || run.id;
  const feature      = plan.research_goals?.feature_under_test || run.intake?.q5_product_context?.feature_under_test || '';
  const methodology  = plan.study_context?.methodology || run.intake?.q6_methodology?.methodology || '';

  const children = [
    new Paragraph({ text: `${productName}${feature ? ' — ' + feature : ''}`, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: `${methodology} · Generated ${new Date().toLocaleDateString()}`, italics: true })] }),
    new Paragraph({ text: '', spacing: { after: 200 } }),

    new Paragraph({ text: '1. Context & Session Summary', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: reportContent.context_and_summary || '—' }),
    new Paragraph({ text: `Based on ${analysis.based_on_session_count ?? '—'} included session(s), generated ${analysis.generated_at ? new Date(analysis.generated_at).toLocaleDateString() : '—'}.` }),
    new Paragraph({ text: '', spacing: { after: 200 } }),

    new Paragraph({ text: '2. Quantitative Highlights', heading: HeadingLevel.HEADING_1 }),
  ];

  if (reportContent.quant_highlights.length === 0) {
    children.push(new Paragraph({ text: 'No quantitative highlights.' }));
  }
  for (const line of reportContent.quant_highlights) {
    children.push(new Paragraph({ text: line, bullet: { level: 0 } }));
  }
  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  children.push(new Paragraph({ text: '3. Findings', heading: HeadingLevel.HEADING_1 }));
  const themeByName = Object.fromEntries((analysis.pass_b?.themes || []).map(t => [t.theme, t]));
  if (reportContent.findings.length === 0) {
    children.push(new Paragraph({ text: 'No findings surfaced.' }));
  }
  for (const finding of reportContent.findings) {
    const theme = themeByName[finding.theme];
    children.push(new Paragraph({
      children: [
        new TextRun({ text: finding.theme, bold: true }),
        ...(theme ? [new TextRun({ text: `  [${theme.signal_strength} signal, ${theme.citations.length} citation(s)]`, italics: true, color: '888888' })] : []),
      ],
    }));
    if (finding.interpretation) children.push(new Paragraph({ text: finding.interpretation }));
    for (const c of (theme?.citations || [])) {
      children.push(new Paragraph({ children: [new TextRun({ text: `"${c.quote}" — ${c.persona_name}`, italics: true })] }));
    }
  }
  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  children.push(new Paragraph({ text: '4. Recommendations', heading: HeadingLevel.HEADING_1 }));
  if (reportContent.recommendations.length === 0) {
    children.push(new Paragraph({ text: 'No recommendations.' }));
  }
  for (const rec of reportContent.recommendations) {
    children.push(new Paragraph({ text: rec, bullet: { level: 0 } }));
  }
  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  children.push(new Paragraph({ text: '5. Raw Data', heading: HeadingLevel.HEADING_1 }));
  children.push(new Paragraph({ text: 'The full turn-by-turn session data and transcript underlying this report are available as separate raw exports (XLSX and Word transcript) for the same study.' }));

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

module.exports = { buildXlsx, buildDocxTranscript, buildAnalyzedReportDocx, partitionSessionsByQaDecision, getMethodologyEvalFields };
