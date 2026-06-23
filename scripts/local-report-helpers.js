/**
 * Local (Node, non-browser) ports of the report-generation logic that lives
 * in ui/src/pages/RunDetail.js, for use by scripts/run-local-test.js.
 *
 * Kept intentionally close to the React version so the two don't drift in
 * spirit — but these are plain functions writing to disk via fs, not
 * browser download triggers.
 */
const fs = require('fs');
const path = require('path');
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

function headlineNumericField(fields) {
  return fields.find(f => f.type.startsWith('number'))?.key || 'friction_score';
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

function buildCsv(run) {
  const plan      = run.plan || {};
  const sessions  = run.sessions || [];
  const tasks     = plan.test_scenarios?.scenarios || [];
  const taskMap   = Object.fromEntries(tasks.map(t => [t.task_id, t.task_name]));
  const product   = run.intake?.q5_product_context?.product_name || run.intake?.q1_product || run.id;
  const feature   = run.intake?.q5_product_context?.feature_under_test || '';
  const method    = plan.study_context?.methodology || run.intake?.q6_methodology?.methodology || '';
  const evalFields = getMethodologyEvalFields(plan);

  const cols = [
    'run_id', 'date', 'product', 'feature', 'methodology',
    'persona', 'priority', 'model',
    'task_id', 'task_name', 'turn_number',
    'action', 'task_completion',
    ...evalFields.map(f => f.key),
    'persona_alignment', 'inner_monologue',
  ];

  const rows = [cols.join(',')];
  for (const session of sessions) {
    for (const turn of (session.turns || [])) {
      const es = turn.eval_scores || {};
      rows.push([
        run.id,
        run.created_at ? new Date(run.created_at).toISOString().slice(0, 10) : '',
        product, feature, method,
        session.persona_name, session.persona_priority || '', session.provider || '',
        turn.task_id, taskMap[turn.task_id] || turn.task_id, turn.turn_number,
        turn.action || '', es.task_completion || '',
        ...evalFields.map(f => es[f.key] ?? ''),
        es.persona_alignment || '',
        turn.inner_monologue || '',
      ].map(escapeCsv).join(','));
    }
  }
  return rows.join('\n');
}

/* ── Word doc transcript, modeled on the existing "SynthUX Research Transcript" format ── */
function buildDocxTranscript(run) {
  const plan       = run.plan || {};
  const sessions   = run.sessions || [];
  const tasks      = plan.test_scenarios?.scenarios || [];
  const taskMap    = Object.fromEntries(tasks.map(t => [t.task_id, t]));
  const methodology = plan.study_context?.methodology || run.intake?.q6_methodology?.methodology || '';
  const scenario    = plan.study_context?.scenario || run.intake?.q6_methodology?.scenario || '';
  const artefactDesc = run.intake?.q2_context?.artefact_notes || plan.study_context?.product || '';

  const children = [
    new Paragraph({ text: 'SynthUX Research Transcript', heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: artefactDesc, italics: true })] }),
  ];

  for (const session of sessions) {
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
      children.push(new Paragraph({ text: `Turn ${turn.turn_number}`, heading: HeadingLevel.HEADING_3 }));
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

/* ── PPTX presentation — same slide structure as RunDetail.js's buildPresentation ── */
async function buildPptxPresentation(run, outPath) {
  const PptxGenJS = require(path.join(__dirname, '..', 'ui', 'node_modules', 'pptxgenjs'));
  const pptx     = new PptxGenJS();
  const plan     = run.plan || {};
  const sessions = run.sessions || [];
  const tasks    = plan.test_scenarios?.scenarios || [];
  const product  = run.intake?.q5_product_context?.product_name || run.intake?.q1_product || run.id;
  const feature  = run.intake?.q5_product_context?.feature_under_test || '';
  const method   = plan.study_context?.methodology || run.intake?.q6_methodology?.methodology || '';
  const rq       = plan.research_goals?.primary_rq || run.intake?.q3_goals?.primary_rq || '';
  const date     = run.created_at ? new Date(run.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-MY');

  pptx.layout  = 'LAYOUT_WIDE';
  pptx.author  = 'SynthUX';
  pptx.subject = `${product}${feature ? ' — ' + feature : ''}`;

  const INK = '080808', WHITE = 'FFFFFF', MUTE = '6B7280', GREEN = '16A34A', RED = 'DC2626', AMBER = 'D97706', BLUE = '1B4FD8', CREAM = 'F9F8F6';

  const evalFields    = getMethodologyEvalFields(plan);
  const headlineKey   = headlineNumericField(evalFields);
  const headlineLabel = headlineKey.replace(/_/g, ' ').toUpperCase();

  const allTurns      = sessions.flatMap(s => s.turns || []);
  const headlineScores = allTurns.map(t => t.eval_scores?.[headlineKey]).filter(n => typeof n === 'number');
  const avgHeadline    = headlineScores.length ? (headlineScores.reduce((a, b) => a + b, 0) / headlineScores.length).toFixed(1) : '—';
  const completedAll   = sessions.filter(s => s.session_outcome === 'all_tasks_completed').length;
  const completionPct  = sessions.length ? Math.round(completedAll / sessions.length * 100) : 0;

  const cover = pptx.addSlide();
  cover.background = { color: INK };
  cover.addText('SYNTHUX RESEARCH REPORT', { x: 0.5, y: 0.4, w: 12, h: 0.3, fontSize: 9, color: '555555', bold: true, charSpacing: 3 });
  cover.addText(product, { x: 0.5, y: 1.2, w: 12, h: 1.2, fontSize: 44, color: WHITE, bold: true, charSpacing: -1 });
  if (feature) cover.addText(feature, { x: 0.5, y: 2.3, w: 12, h: 0.6, fontSize: 22, color: '888888' });
  const metaY = feature ? 3.5 : 3.0;
  [
    { label: 'METHODOLOGY', value: method || 'Synthetic UX Study' },
    { label: 'SYNTHETIC USERS', value: String(sessions.length) },
    { label: 'DATE', value: date },
  ].forEach((m, i) => {
    const x = 0.5 + i * 4.2;
    cover.addText(m.label, { x, y: metaY, w: 4, h: 0.2, fontSize: 8, color: '444444', bold: true, charSpacing: 2 });
    cover.addText(m.value, { x, y: metaY + 0.25, w: 4, h: 0.4, fontSize: 16, color: WHITE });
  });

  const rqSlide = pptx.addSlide();
  rqSlide.background = { color: WHITE };
  rqSlide.addText('RESEARCH QUESTION', { x: 0.5, y: 0.35, w: 12, h: 0.25, fontSize: 9, color: MUTE, bold: true, charSpacing: 2 });
  rqSlide.addText('What we set out to learn', { x: 0.5, y: 0.65, w: 12, h: 0.55, fontSize: 26, color: INK, bold: true });
  if (rq) rqSlide.addText(`"${rq}"`, { x: 0.5, y: 1.4, w: 12, h: 1.2, fontSize: 15, color: '374151', italic: true, lineSpacingMultiple: 1.4 });
  const metricsY = rq ? 3.0 : 2.0;
  [
    { label: 'TASK COMPLETION', value: `${completionPct}%`, color: completionPct >= 60 ? GREEN : RED },
    { label: `AVG ${headlineLabel}`, value: avgHeadline, color: parseFloat(avgHeadline) >= 7 ? RED : parseFloat(avgHeadline) >= 4 ? AMBER : GREEN },
    { label: 'PERSONAS', value: `${completedAll} / ${sessions.length}`, color: INK },
  ].forEach((m, i) => {
    const x = 0.5 + i * 4.2;
    rqSlide.addText(m.value, { x, y: metricsY, w: 4, h: 0.7, fontSize: 40, color: m.color, bold: true });
    rqSlide.addText(m.label, { x, y: metricsY + 0.75, w: 4, h: 0.25, fontSize: 9, color: MUTE, bold: true, charSpacing: 2 });
  });

  for (const task of tasks) {
    const slide = pptx.addSlide();
    slide.background = { color: WHITE };
    const completedCount = sessions.filter(s => (s.tasks_completed || []).includes(task.task_id)).length;
    const pct = sessions.length ? Math.round(completedCount / sessions.length * 100) : 0;
    slide.addText(task.task_id, { x: 0.5, y: 0.3, w: 2, h: 0.25, fontSize: 9, color: BLUE, bold: true, charSpacing: 2 });
    slide.addText(task.task_name, { x: 0.5, y: 0.55, w: 12, h: 0.6, fontSize: 26, color: INK, bold: true });
    if (task.instruction) slide.addText(`"${task.instruction}"`, { x: 0.5, y: 1.2, w: 12, h: 0.6, fontSize: 12, color: MUTE, italic: true });
    const statY = task.instruction ? 2.0 : 1.5;
    slide.addText(`${pct}%`, { x: 0.5, y: statY, w: 2.5, h: 0.65, fontSize: 40, color: pct >= 60 ? GREEN : pct >= 40 ? AMBER : RED, bold: true });
    slide.addText('COMPLETED', { x: 0.5, y: statY + 0.7, w: 2.5, h: 0.2, fontSize: 9, color: MUTE, bold: true, charSpacing: 2 });
    slide.addText(`${completedCount} of ${sessions.length} personas`, { x: 0.5, y: statY + 0.95, w: 2.5, h: 0.25, fontSize: 11, color: MUTE });

    const tableY = statY + 1.35;
    const tableRows = [
      [
        { text: 'PERSONA', options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
        { text: 'OUTCOME', options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
        { text: 'TURNS', options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
        { text: 'LAST QUOTE', options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
      ],
      ...sessions.map(s => {
        const turns = (s.turns || []).filter(t => t.task_id === task.task_id);
        const done  = (s.tasks_completed || []).includes(task.task_id);
        const quote = turns.slice().reverse().find(t => t.inner_monologue)?.inner_monologue || '';
        return [
          { text: s.persona_name, options: { fontSize: 10, bold: true } },
          { text: done ? 'Completed' : 'Abandoned', options: { fontSize: 10, color: done ? GREEN : RED, bold: true } },
          { text: String(turns.length), options: { fontSize: 10 } },
          { text: quote ? `"${quote.slice(0, 100)}${quote.length > 100 ? '…' : ''}"` : '—', options: { fontSize: 9, italic: true, color: '555555' } },
        ];
      }),
    ];
    slide.addTable(tableRows, { x: 0.5, y: tableY, w: 12.3, border: { type: 'solid', color: 'E5E7EB', pt: 0.5 }, rowH: 0.38, colW: [2.0, 1.4, 0.8, 8.1] });
  }

  const usersSlide = pptx.addSlide();
  usersSlide.background = { color: WHITE };
  usersSlide.addText('SYNTHETIC USERS', { x: 0.5, y: 0.35, w: 12, h: 0.25, fontSize: 9, color: MUTE, bold: true, charSpacing: 2 });
  usersSlide.addText('Who participated', { x: 0.5, y: 0.65, w: 12, h: 0.55, fontSize: 26, color: INK, bold: true });
  const userRows = [
    [
      { text: 'PERSONA', options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
      { text: 'PRIORITY', options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
      { text: 'MODEL', options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
      { text: 'OUTCOME', options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
      { text: `AVG ${headlineLabel}`, options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
    ],
    ...sessions.map(s => {
      const scores = (s.turns || []).map(t => t.eval_scores?.[headlineKey]).filter(n => typeof n === 'number');
      const avg    = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
      const done   = s.session_outcome === 'all_tasks_completed';
      const outcomeText = done ? 'All tasks completed' : s.session_outcome === 'partial_completion' ? 'Partial' : 'No tasks completed';
      return [
        { text: s.persona_name, options: { fontSize: 10, bold: true } },
        { text: s.persona_priority || '—', options: { fontSize: 10 } },
        { text: s.provider || '—', options: { fontSize: 10 } },
        { text: outcomeText, options: { fontSize: 10, color: done ? GREEN : RED, bold: true } },
        { text: avg, options: { fontSize: 10, color: parseFloat(avg) >= 7 ? RED : parseFloat(avg) >= 4 ? AMBER : GREEN, bold: true } },
      ];
    }),
  ];
  usersSlide.addTable(userRows, { x: 0.5, y: 1.4, w: 12.3, border: { type: 'solid', color: 'E5E7EB', pt: 0.5 }, rowH: 0.42, colW: [2.8, 1.5, 1.5, 3.5, 3.0] });
  usersSlide.addText(`Generated by SynthUX · ${new Date().toLocaleDateString()}`, { x: 0.5, y: 6.8, w: 12, h: 0.2, fontSize: 8, color: 'CCCCCC' });

  const TURNS_PER_SLIDE = 2;
  const appendixCover = pptx.addSlide();
  appendixCover.background = { color: INK };
  appendixCover.addText('APPENDIX', { x: 0.5, y: 3.0, w: 12, h: 0.3, fontSize: 9, color: '555555', bold: true, charSpacing: 3 });
  appendixCover.addText('Full turn-by-turn transcripts', { x: 0.5, y: 3.35, w: 12, h: 0.8, fontSize: 32, color: WHITE, bold: true });
  appendixCover.addText('Raw per-turn actions, think-aloud, and eval scores for every persona and task below.', { x: 0.5, y: 4.15, w: 11, h: 0.5, fontSize: 13, color: '888888' });

  for (const s of sessions) {
    for (const task of tasks) {
      const taskTurns = (s.turns || []).filter(t => t.task_id === task.task_id);
      if (taskTurns.length === 0) continue;
      for (let i = 0; i < taskTurns.length; i += TURNS_PER_SLIDE) {
        const chunk = taskTurns.slice(i, i + TURNS_PER_SLIDE);
        const tSlide = pptx.addSlide();
        tSlide.background = { color: WHITE };
        tSlide.addText(`${task.task_id} — TRANSCRIPT — ${s.persona_name.toUpperCase()}`, { x: 0.5, y: 0.3, w: 12, h: 0.25, fontSize: 9, color: BLUE, bold: true, charSpacing: 1.5 });
        tSlide.addText(`Turns ${i + 1}–${Math.min(i + TURNS_PER_SLIDE, taskTurns.length)} of ${taskTurns.length}`, { x: 0.5, y: 0.58, w: 12, h: 0.3, fontSize: 11, color: MUTE });

        let y = 1.05;
        const blockH = (6.9 - y) / TURNS_PER_SLIDE;
        for (const t of chunk) {
          if (t.parse_error || t.model_error) {
            tSlide.addText(`Turn ${t.turn_number} — [no usable data: ${t.parse_error || t.model_error}]`, { x: 0.5, y, w: 12.3, h: blockH - 0.15, fontSize: 11, color: RED, italic: true });
            y += blockH;
            continue;
          }
          const actionLine = [`Turn ${t.turn_number}`, t.screen_or_step ? `· ${t.screen_or_step}` : ''].filter(Boolean).join(' ');
          const clickResultLabel = t.click_result && ({ not_found: '(element not found)', click_error: '(click failed)', no_change: '(no page change — likely non-functional)', changed: '(page changed)', click_disallowed: '(blocked — observation-only task)' })[t.click_result.reason];
          const actionDetail = [`Action: ${t.action || '—'}`, t.click_target ? `→ clicking "${t.click_target}" ${clickResultLabel || ''}`.trim() : '', t.scroll_direction ? `→ scrolling ${t.scroll_direction}` : ''].filter(Boolean).join('  ');
          const evalLine = Object.entries(t.eval_scores || {}).map(([k, v]) => `${k}: ${v === null || v === undefined ? '—' : v}`).join('   ·   ');

          tSlide.addText(actionLine, { x: 0.5, y, w: 12.3, h: 0.28, fontSize: 13, color: INK, bold: true });
          tSlide.addText(actionDetail, { x: 0.5, y: y + 0.3, w: 12.3, h: 0.25, fontSize: 10.5, color: BLUE });
          tSlide.addText(`"${t.inner_monologue || '—'}"`, { x: 0.5, y: y + 0.58, w: 12.3, h: blockH - 1.05, fontSize: 11, color: '374151', italic: true, valign: 'top' });
          tSlide.addText(evalLine, { x: 0.5, y: y + blockH - 0.42, w: 12.3, h: 0.32, fontSize: 8.5, color: MUTE, fontFace: 'Courier New' });
          y += blockH;
        }
      }
    }
  }

  await pptx.writeFile({ fileName: outPath });
}

module.exports = { buildCsv, buildDocxTranscript, buildPptxPresentation, getMethodologyEvalFields };
