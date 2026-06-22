import React, { useEffect, useState } from 'react';
import PptxGenJS from 'pptxgenjs';
import { api } from '../api';
import { Tag } from '../components/UI';

/* ── Download utilities ──────────────────────────────────────────────────── */
function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

function buildCsv(run) {
  const plan     = run.plan || {};
  const sessions = run.sessions || [];
  const tasks    = plan.test_scenarios?.scenarios || [];
  const taskMap  = Object.fromEntries(tasks.map(t => [t.task_id, t.task_name]));
  const product  = run.intake?.q5_product_context?.product_name || run.intake?.q1_product || run.id;
  const feature  = run.intake?.q5_product_context?.feature_under_test || '';
  const method   = plan.study_context?.methodology || run.intake?.q6_methodology?.methodology || '';

  const cols = [
    'run_id','date','product','feature','methodology',
    'persona','priority','model',
    'task_id','task_name','turn_number',
    'action','friction_score','task_completion',
    'confusion_signal','trust_signal','abandon_trigger',
    'persona_alignment','inner_monologue',
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
        turn.action || '',
        es.friction_score ?? '',
        es.task_completion || '',
        es.confusion_signal || '', es.trust_signal || '', es.abandon_trigger || '',
        es.persona_alignment || '',
        turn.inner_monologue || '',
      ].map(escapeCsv).join(','));
    }
  }
  return rows.join('\n');
}

async function buildPresentation(run) {
  const pptx    = new PptxGenJS();
  const plan    = run.plan || {};
  const sessions = run.sessions || [];
  const tasks   = plan.test_scenarios?.scenarios || [];
  const product = run.intake?.q5_product_context?.product_name || run.intake?.q1_product || run.id;
  const feature = run.intake?.q5_product_context?.feature_under_test || '';
  const method  = plan.study_context?.methodology || run.intake?.q6_methodology?.methodology || '';
  const rq      = plan.research_goals?.primary_rq || run.intake?.q3_goals?.primary_rq || '';
  const date    = run.created_at ? new Date(run.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  pptx.layout    = 'LAYOUT_WIDE';
  pptx.author    = 'SynthUX';
  pptx.subject   = `${product}${feature ? ' — ' + feature : ''}`;

  /* colour palette */
  const INK    = '080808';
  const WHITE  = 'FFFFFF';
  const MUTE   = '6B7280';
  const GREEN  = '16A34A';
  const RED    = 'DC2626';
  const AMBER  = 'D97706';
  const BLUE   = '1B4FD8';
  const CREAM  = 'F9F8F6';

  const allTurns       = sessions.flatMap(s => s.turns || []);
  const frictionScores = allTurns.map(t => t.eval_scores?.friction_score).filter(n => typeof n === 'number');
  const avgFriction    = frictionScores.length ? (frictionScores.reduce((a,b)=>a+b,0)/frictionScores.length).toFixed(1) : '—';
  const completedAll   = sessions.filter(s => s.session_outcome === 'all_tasks_completed').length;
  const completionPct  = sessions.length ? Math.round(completedAll / sessions.length * 100) : 0;

  /* ── Slide 1: Cover ──────────────────────────────────────────────────── */
  const cover = pptx.addSlide();
  cover.background = { color: INK };

  cover.addText('SYNTHUX RESEARCH REPORT', {
    x: 0.5, y: 0.4, w: 12, h: 0.3,
    fontSize: 9, color: '555555', bold: true, charSpacing: 3,
  });
  cover.addText(product, {
    x: 0.5, y: 1.2, w: 12, h: 1.2,
    fontSize: 44, color: WHITE, bold: true, charSpacing: -1,
  });
  if (feature) {
    cover.addText(feature, {
      x: 0.5, y: 2.3, w: 12, h: 0.6,
      fontSize: 22, color: '888888', bold: false,
    });
  }

  const metaY = feature ? 3.5 : 3.0;
  [
    { label: 'METHODOLOGY', value: method || 'Synthetic UX Study' },
    { label: 'SYNTHETIC USERS', value: String(sessions.length) },
    { label: 'DATE', value: date },
  ].forEach((m, i) => {
    const x = 0.5 + i * 4.2;
    cover.addText(m.label, { x, y: metaY,      w: 4, h: 0.2, fontSize: 8,  color: '444444', bold: true, charSpacing: 2 });
    cover.addText(m.value, { x, y: metaY + 0.25, w: 4, h: 0.4, fontSize: 16, color: WHITE,   bold: false });
  });

  /* ── Slide 2: Research question + top metrics ────────────────────────── */
  const rqSlide = pptx.addSlide();
  rqSlide.background = { color: WHITE };

  rqSlide.addText('RESEARCH QUESTION', { x: 0.5, y: 0.35, w: 12, h: 0.25, fontSize: 9, color: MUTE, bold: true, charSpacing: 2 });
  rqSlide.addText('What we set out to learn', { x: 0.5, y: 0.65, w: 12, h: 0.55, fontSize: 26, color: INK, bold: true });

  if (rq) {
    rqSlide.addText(`"${rq}"`, {
      x: 0.5, y: 1.4, w: 12, h: 1.2,
      fontSize: 15, color: '374151', italic: true, lineSpacingMultiple: 1.4,
    });
  }

  const metricsY = rq ? 3.0 : 2.0;
  [
    { label: 'TASK COMPLETION', value: `${completionPct}%`, color: completionPct >= 60 ? GREEN : RED },
    { label: 'AVG FRICTION SCORE', value: avgFriction, color: parseFloat(avgFriction) >= 7 ? RED : parseFloat(avgFriction) >= 4 ? AMBER : GREEN },
    { label: 'PERSONAS', value: `${completedAll} / ${sessions.length}`, color: INK },
  ].forEach((m, i) => {
    const x = 0.5 + i * 4.2;
    rqSlide.addText(m.value,  { x, y: metricsY,        w: 4, h: 0.7, fontSize: 40, color: m.color, bold: true });
    rqSlide.addText(m.label,  { x, y: metricsY + 0.75, w: 4, h: 0.25, fontSize: 9, color: MUTE, bold: true, charSpacing: 2 });
  });

  /* ── Slide per task ──────────────────────────────────────────────────── */
  for (const task of tasks) {
    const slide = pptx.addSlide();
    slide.background = { color: WHITE };

    const completedCount = sessions.filter(s => (s.tasks_completed || []).includes(task.task_id)).length;
    const pct = sessions.length ? Math.round(completedCount / sessions.length * 100) : 0;

    slide.addText(task.task_id, { x: 0.5, y: 0.3, w: 2, h: 0.25, fontSize: 9, color: BLUE, bold: true, charSpacing: 2 });
    slide.addText(task.task_name, { x: 0.5, y: 0.55, w: 12, h: 0.6, fontSize: 26, color: INK, bold: true });
    if (task.instruction) {
      slide.addText(`"${task.instruction}"`, { x: 0.5, y: 1.2, w: 12, h: 0.45, fontSize: 12, color: MUTE, italic: true });
    }

    const statY = task.instruction ? 1.85 : 1.5;
    slide.addText(`${pct}%`, { x: 0.5, y: statY, w: 2.5, h: 0.65, fontSize: 40, color: pct>=60?GREEN:pct>=40?AMBER:RED, bold: true });
    slide.addText('COMPLETED', { x: 0.5, y: statY + 0.7, w: 2.5, h: 0.2, fontSize: 9, color: MUTE, bold: true, charSpacing: 2 });
    slide.addText(`${completedCount} of ${sessions.length} personas`, { x: 0.5, y: statY + 0.95, w: 2.5, h: 0.25, fontSize: 11, color: MUTE });

    /* table of persona outcomes */
    const tableY = statY + 1.35;
    const tableRows = [
      [
        { text: 'PERSONA',  options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
        { text: 'OUTCOME',  options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
        { text: 'TURNS',    options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
        { text: 'LAST QUOTE', options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
      ],
      ...sessions.map(s => {
        const turns   = (s.turns || []).filter(t => t.task_id === task.task_id);
        const done    = (s.tasks_completed || []).includes(task.task_id);
        const quote   = turns.slice().reverse().find(t => t.inner_monologue)?.inner_monologue || '';
        return [
          { text: s.persona_name,                                    options: { fontSize: 10, bold: true } },
          { text: done ? 'Completed' : 'Abandoned',                  options: { fontSize: 10, color: done ? GREEN : RED, bold: true } },
          { text: String(turns.length),                              options: { fontSize: 10 } },
          { text: quote ? `"${quote.slice(0, 100)}${quote.length > 100 ? '…' : ''}"` : '—', options: { fontSize: 9, italic: true, color: '555555' } },
        ];
      }),
    ];

    slide.addTable(tableRows, {
      x: 0.5, y: tableY, w: 12.3,
      border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
      rowH: 0.38,
      colW: [2.0, 1.4, 0.8, 8.1],
    });
  }

  /* ── Slide: Synthetic users summary ─────────────────────────────────── */
  const usersSlide = pptx.addSlide();
  usersSlide.background = { color: WHITE };

  usersSlide.addText('SYNTHETIC USERS', { x: 0.5, y: 0.35, w: 12, h: 0.25, fontSize: 9, color: MUTE, bold: true, charSpacing: 2 });
  usersSlide.addText('Who participated', { x: 0.5, y: 0.65, w: 12, h: 0.55, fontSize: 26, color: INK, bold: true });

  const userRows = [
    [
      { text: 'PERSONA',   options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
      { text: 'PRIORITY',  options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
      { text: 'MODEL',     options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
      { text: 'OUTCOME',   options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
      { text: 'AVG FRICTION', options: { fontSize: 8, bold: true, color: MUTE, fill: CREAM } },
    ],
    ...sessions.map(s => {
      const scores = (s.turns||[]).map(t=>t.eval_scores?.friction_score).filter(n=>typeof n==='number');
      const avg    = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : '—';
      const done   = s.session_outcome === 'all_tasks_completed';
      const outcomeText = done ? 'All tasks completed' : s.session_outcome === 'partial_completion' ? 'Partial' : 'No tasks completed';
      return [
        { text: s.persona_name,              options: { fontSize: 10, bold: true } },
        { text: s.persona_priority || '—',   options: { fontSize: 10 } },
        { text: s.provider || '—',           options: { fontSize: 10 } },
        { text: outcomeText,                 options: { fontSize: 10, color: done ? GREEN : RED, bold: true } },
        { text: avg,                         options: { fontSize: 10, color: parseFloat(avg)>=7?RED:parseFloat(avg)>=4?AMBER:GREEN, bold: true } },
      ];
    }),
  ];

  usersSlide.addTable(userRows, {
    x: 0.5, y: 1.4, w: 12.3,
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    rowH: 0.42,
    colW: [2.8, 1.5, 1.5, 3.5, 3.0],
  });

  usersSlide.addText(`Generated by SynthUX · ${new Date().toLocaleDateString()}`, {
    x: 0.5, y: 6.8, w: 12, h: 0.2, fontSize: 8, color: 'CCCCCC',
  });

  await pptx.writeFile({ fileName: `${run.id}_presentation.pptx` });
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusTag(s) {
  if (s === 'evaluation_complete' || s === 'complete') return <Tag label="Completed" type="teal" />;
  if (s === 'error') return <Tag label="Error" type="red" />;
  return <Tag label="In progress" type="blue" />;
}

function frictionColor(n) { return n >= 7 ? 'var(--red)' : n >= 4 ? 'var(--amber)' : 'var(--teal)'; }
function frictionBg(n)    { return n >= 7 ? 'var(--red-lt)' : n >= 4 ? 'var(--amber-lt)' : 'var(--teal-lt)'; }

function Field({ label, value }) {
  if (!value || value === '—') return null;
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.3rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--body)', lineHeight: 1.65, padding: '0.625rem 0.875rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)' }}>
        {value}
      </div>
    </div>
  );
}

function SectionHead({ children }) {
  return (
    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.75rem', marginTop: '1.75rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

/* ── Methodology metric card definitions ─────────────────────────────────── */
const METHODOLOGY_CARDS = {
  'Usability Testing': [
    { label: 'Task completion rate', key: 'completion_rate', format: 'pct', desc: 'Personas completing all tasks' },
    { label: 'Avg friction score',   key: 'avg_friction',    format: 'score', desc: 'Out of 10 across all turns' },
    { label: 'Confusion signals',    key: 'confusion_count', format: 'count', desc: 'Turns flagged with confusion' },
    { label: 'Sessions abandoned',   key: 'abandon_count',   format: 'count', desc: 'Personas who did not finish' },
  ],
  'UX Testing': [
    { label: 'Task completion rate',  key: 'completion_rate',     format: 'pct',   desc: 'Personas completing all tasks' },
    { label: 'Avg friction score',    key: 'avg_friction',        format: 'score', desc: 'Out of 10 across all turns' },
    { label: 'Comprehension signals', key: 'comprehension_count', format: 'count', desc: 'Turns showing correct understanding' },
    { label: 'Confusion signals',     key: 'confusion_count',     format: 'count', desc: 'Turns flagged with confusion' },
  ],
  'Concept Testing': [
    { label: 'Concept clarity',   key: 'concept_clarity_count', format: 'count', desc: 'Turns with clarity signal' },
    { label: 'Trust signals',     key: 'trust_count',           format: 'count', desc: 'Positive trust reactions' },
    { label: 'Confusion signals', key: 'confusion_count',       format: 'count', desc: 'Turns flagged with confusion' },
    { label: 'Avg friction score',key: 'avg_friction',          format: 'score', desc: 'Out of 10 across all turns' },
  ],
  'Desirability Testing': [
    { label: 'Emotional resonance', key: 'emotional_resonance_count', format: 'count', desc: 'Turns with resonance signal' },
    { label: 'Brand alignment',     key: 'brand_alignment_count',     format: 'count', desc: 'Turns with alignment signal' },
    { label: 'Trust signals',       key: 'trust_count',               format: 'count', desc: 'Positive trust reactions' },
    { label: 'Confusion signals',   key: 'confusion_count',           format: 'count', desc: 'Turns flagged with confusion' },
  ],
};

function computeMetrics(sessions) {
  const allTurns = sessions.flatMap(s => s.turns || []);
  const total    = sessions.length;

  const frictionScores = allTurns.map(t => t.eval_scores?.friction_score).filter(n => typeof n === 'number');
  const avgFriction    = frictionScores.length
    ? (frictionScores.reduce((a, b) => a + b, 0) / frictionScores.length)
    : null;

  return {
    completion_rate:          total ? sessions.filter(s => s.session_outcome === 'all_tasks_completed').length / total : null,
    avg_friction:             avgFriction,
    confusion_count:          allTurns.filter(t => t.eval_scores?.confusion_signal && t.eval_scores.confusion_signal !== 'null').length,
    abandon_count:            sessions.filter(s => s.session_outcome !== 'all_tasks_completed').length,
    comprehension_count:      allTurns.filter(t => t.eval_scores?.comprehension_signal && t.eval_scores.comprehension_signal !== 'null').length,
    concept_clarity_count:    allTurns.filter(t => t.eval_scores?.concept_clarity     && t.eval_scores.concept_clarity     !== 'null').length,
    emotional_resonance_count:allTurns.filter(t => t.eval_scores?.emotional_resonance && t.eval_scores.emotional_resonance !== 'null').length,
    brand_alignment_count:    allTurns.filter(t => t.eval_scores?.brand_alignment     && t.eval_scores.brand_alignment     !== 'null').length,
    trust_count:              allTurns.filter(t => t.eval_scores?.trust_signal        && t.eval_scores.trust_signal        !== 'null').length,
  };
}

function MetricCard({ label, value, format, desc }) {
  let display = '—';
  if (value !== null && value !== undefined) {
    if (format === 'pct')   display = `${Math.round(value * 100)}%`;
    else if (format === 'score') display = typeof value === 'number' ? value.toFixed(1) : value;
    else display = String(value);
  }
  const isScore = format === 'score' && value !== null;
  const scoreColor = isScore ? frictionColor(parseFloat(display)) : 'var(--ink)';

  return (
    <div style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#fff' }}>
      <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 700, color: isScore ? scoreColor : 'var(--ink)', lineHeight: 1, marginBottom: '0.3rem' }}>
        {display}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--mute-soft)' }}>{desc}</div>
    </div>
  );
}

/* ── Collapsible persona session block ───────────────────────────────────── */
function PersonaTaskBlock({ session, taskId }) {
  const [open, setOpen] = React.useState(false);
  const turns    = (session.turns || []).filter(t => t.task_id === taskId);
  const completed = (session.tasks_completed || []).includes(taskId);
  const abandoned = turns.some(t => t.eval_scores?.task_completion === 'abandoned');
  const outcome   = completed ? 'Completed' : abandoned ? 'Abandoned' : 'In progress';
  const outcomeColor = completed ? 'var(--teal)' : abandoned ? 'var(--red)' : 'var(--amber)';

  if (turns.length === 0) return null;

  const avgFriction = (() => {
    const scores = turns.map(t => t.eval_scores?.friction_score).filter(n => typeof n === 'number');
    return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
  })();

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', overflow: 'hidden' }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem', cursor: 'pointer',
          background: open ? 'var(--cream)' : '#fff',
          borderBottom: open ? '1px solid var(--border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{session.persona_name}</span>
          {session.provider && (
            <span style={{ fontSize: '10px', padding: '0.15rem 0.45rem', borderRadius: '4px', background: session.provider === 'claude' ? '#FDF3E7' : '#E6F5F1', color: session.provider === 'claude' ? '#D97706' : '#10A37F', fontWeight: 500 }}>
              {session.provider === 'claude' ? 'Claude' : 'OpenAI'}
            </span>
          )}
          {session.persona_priority === 'primary' && (
            <span style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 500 }}>Primary</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '11px', color: 'var(--mute)' }}>{turns.length} turn{turns.length !== 1 ? 's' : ''}</span>
          {avgFriction !== null && (
            <span style={{ fontSize: '11px', fontWeight: 600, color: frictionColor(parseFloat(avgFriction)) }}>
              friction {avgFriction}
            </span>
          )}
          <span style={{ fontSize: '11px', fontWeight: 600, color: outcomeColor }}>{outcome}</span>
          <span style={{ fontSize: '11px', color: 'var(--mute)' }}>{open ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Turn-by-turn raw data */}
      {open && (
        <div style={{ padding: '0.75rem 1rem', background: '#fafafa' }}>
          {turns.map((turn, i) => {
            const es     = turn.eval_scores || {};
            const isDone = es.task_completion === 'completed' || es.task_completion === 'abandoned';
            return (
              <div key={i} style={{
                paddingBottom: '0.875rem', marginBottom: '0.875rem',
                borderBottom: i < turns.length - 1 ? '1px solid var(--hairline)' : 'none',
              }}>
                {/* Turn header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--blue)', flexShrink: 0 }}>
                    Turn {turn.turn_number}
                  </span>
                  {turn.action && (
                    <span style={{ fontSize: '10px', padding: '0.1rem 0.4rem', background: 'var(--cream)', border: '1px solid var(--hairline)', borderRadius: '4px', color: 'var(--body)' }}>
                      {turn.action}
                    </span>
                  )}
                  {typeof es.friction_score === 'number' && (
                    <span style={{ fontSize: '10px', fontWeight: 600, color: frictionColor(es.friction_score), marginLeft: 'auto', flexShrink: 0 }}>
                      friction {es.friction_score}
                    </span>
                  )}
                  {isDone && (
                    <span style={{ fontSize: '10px', fontWeight: 600, color: es.task_completion === 'completed' ? 'var(--teal)' : 'var(--red)', flexShrink: 0 }}>
                      {es.task_completion === 'completed' ? '✓ Completed' : '✕ Abandoned'}
                    </span>
                  )}
                </div>

                {/* Inner monologue — the key raw data */}
                {turn.inner_monologue && (
                  <div style={{
                    fontSize: '12px', color: 'var(--body)', lineHeight: 1.7,
                    fontStyle: 'italic',
                    padding: '0.5rem 0.75rem',
                    background: '#fff', border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.35rem',
                  }}>
                    "{turn.inner_monologue}"
                  </div>
                )}

                {/* Signals row */}
                {(es.confusion_signal || es.trust_signal || es.abandon_trigger) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                    {es.confusion_signal && es.confusion_signal !== 'null' && (
                      <span style={{ fontSize: '10px', padding: '0.15rem 0.5rem', background: 'var(--amber-lt)', border: '1px solid rgba(194,113,4,.2)', borderRadius: '4px', color: 'var(--amber)' }}>
                        Confusion: {es.confusion_signal}
                      </span>
                    )}
                    {es.trust_signal && es.trust_signal !== 'null' && (
                      <span style={{ fontSize: '10px', padding: '0.15rem 0.5rem', background: 'var(--blue-lt)', border: '1px solid rgba(27,79,216,.15)', borderRadius: '4px', color: 'var(--blue)' }}>
                        Trust: {es.trust_signal}
                      </span>
                    )}
                    {es.abandon_trigger && es.abandon_trigger !== 'null' && (
                      <span style={{ fontSize: '10px', padding: '0.15rem 0.5rem', background: 'var(--red-lt)', border: '1px solid rgba(196,43,43,.2)', borderRadius: '4px', color: 'var(--red)' }}>
                        Abandon: {es.abandon_trigger}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Report ─────────────────────────────────────────────────────────── */
function ReportTab({ run }) {
  const plan     = run.plan;
  const sessions = run.sessions || [];
  const intake   = run.intake;

  const methodology = plan?.study_context?.methodology || intake?.q6_methodology?.methodology || '';
  const tasks       = plan?.test_scenarios?.scenarios || [];
  const personas    = plan?.user_segments?.segments || [];
  const evalKeys    = plan?.eval_metrics?.default_keys || [];
  const rqPrimary   = plan?.research_goals?.primary_rq || intake?.q3_goals?.primary_rq || '';
  const rqSecondary = plan?.research_goals?.secondary_rqs || intake?.q3_goals?.secondary_rqs || '';
  const feature     = plan?.research_goals?.feature_under_test || intake?.q5_product_context?.feature_under_test || '';
  const artefact    = plan?.study_context?.artefact_config || {};
  const orchestration = plan?.method?.orchestration || '';

  if (!plan && sessions.length === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '1rem', opacity: .35 }}>⟳</div>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.4rem' }}>Study in progress</div>
        <div style={{ fontSize: '13px', color: 'var(--mute)' }}>
          The research plan is being generated. Check back once the study has finished running.
        </div>
      </div>
    );
  }

  const metrics     = sessions.length > 0 ? computeMetrics(sessions) : null;
  const cardDefs    = METHODOLOGY_CARDS[methodology] || METHODOLOGY_CARDS['Usability Testing'];

  /* "How it was conducted" narrative */
  const artefactDesc = artefact.artefact_link
    ? `a live prototype at ${artefact.artefact_link}`
    : artefact.files?.length
    ? `uploaded test materials (${artefact.files.join(', ')})`
    : 'task descriptions and scenario context';

  const conductedNarrative = orchestration || (methodology && tasks.length
    ? `The ${methodology} was conducted through ${
        methodology === 'Usability Testing' ? 'task-based scenarios' :
        methodology === 'UX Testing'        ? 'a combination of task-based scenarios and open-ended exploration' :
        methodology === 'Concept Testing'   ? 'concept exposure and structured reaction prompts' :
        'impression-based exploration and emotional response prompts'
      } of ${feature || 'the product flow'}. Participants interacted with ${artefactDesc} and were observed across ${tasks.length} task${tasks.length !== 1 ? 's' : ''}.`
    : '');

  return (
    <div>

      {/* ── 4 Metric cards ─────────────────────────────────────────────── */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
          {cardDefs.map(card => (
            <MetricCard
              key={card.key}
              label={card.label}
              value={metrics[card.key]}
              format={card.format}
              desc={card.desc}
            />
          ))}
        </div>
      )}

      {/* ── Research overview ──────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <SectionHead>Research overview</SectionHead>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 2rem', marginBottom: '1.25rem' }}>
          {rqPrimary && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.3rem' }}>Primary research question</div>
              <div style={{ fontSize: '13px', color: 'var(--body)', lineHeight: 1.65 }}>{rqPrimary}</div>
            </div>
          )}
          {rqSecondary && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.3rem' }}>Secondary research questions</div>
              <div style={{ fontSize: '13px', color: 'var(--body)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{rqSecondary}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.3rem' }}>Date of study</div>
            <div style={{ fontSize: '13px', color: 'var(--body)' }}>{formatDate(run.created_at)}</div>
          </div>
          {methodology && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.3rem' }}>Methodology</div>
              <div style={{ fontSize: '13px', color: 'var(--body)' }}>{methodology}</div>
            </div>
          )}
        </div>

        {/* Synthetic users */}
        {(personas.length > 0 || sessions.length > 0) && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.5rem' }}>
              Synthetic users ({personas.length || sessions.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {(personas.length > 0 ? personas : sessions.map(s => ({ name: s.persona_name, priority: s.persona_priority }))).map((p, i) => (
                <span key={i} style={{
                  fontSize: '12px', padding: '0.25rem 0.65rem',
                  background: p.priority === 'primary' ? 'var(--blue-lt)' : 'var(--cream)',
                  border: `1px solid ${p.priority === 'primary' ? 'rgba(27,79,216,.2)' : 'var(--border)'}`,
                  color: p.priority === 'primary' ? 'var(--blue)' : 'var(--body)',
                  borderRadius: '5px', fontWeight: p.priority === 'primary' ? 500 : 400,
                }}>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* How conducted */}
        {conductedNarrative && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.3rem' }}>How the study was conducted</div>
            <div style={{ fontSize: '13px', color: 'var(--body)', lineHeight: 1.75 }}>{conductedNarrative}</div>
          </div>
        )}

        {/* Tasks list */}
        {tasks.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.5rem' }}>
              Participants were asked to complete
            </div>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.35rem', fontSize: '13px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--blue)', flexShrink: 0 }}>{t.task_id}</span>
                <span style={{ color: 'var(--body)' }}>
                  <strong style={{ fontWeight: 500, color: 'var(--ink)' }}>{t.task_name}</strong>
                  {t.instruction ? ` — ${t.instruction}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Metrics collected */}
        {evalKeys.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.4rem' }}>
              Metrics collected and measured
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {evalKeys.map(k => (
                <span key={k} style={{ fontSize: '11px', fontFamily: 'monospace', padding: '0.2rem 0.5rem', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--body)' }}>
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Per-task raw data ───────────────────────────────────────────── */}
      {tasks.length > 0 && sessions.length > 0 && tasks.map((task, ti) => {
        const taskSessions = sessions.filter(s => (s.turns || []).some(t => t.task_id === task.task_id));
        const completedCount = sessions.filter(s => (s.tasks_completed || []).includes(task.task_id)).length;
        const pct = sessions.length ? Math.round(completedCount / sessions.length * 100) : 0;
        const turnsPerSession = taskSessions.map(s => (s.turns || []).filter(t => t.task_id === task.task_id).length);
        const avgTurns = turnsPerSession.length
          ? (turnsPerSession.reduce((a, b) => a + b, 0) / turnsPerSession.length).toFixed(1)
          : null;

        return (
          <div key={task.task_id} style={{ marginBottom: '2rem' }}>
            {/* Task header */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: '0.75rem',
              padding: '0.875rem 0', borderTop: ti === 0 ? '1px solid var(--border)' : 'none',
              borderBottom: '1px solid var(--border)', marginBottom: '0.875rem',
            }}>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue)' }}>{task.task_id}</span>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', flex: 1, margin: 0 }}>{task.task_name}</h3>
            </div>

            {task.instruction && (
              <div style={{ fontSize: '12px', color: 'var(--mute)', lineHeight: 1.6, marginBottom: '0.875rem', fontStyle: 'italic' }}>
                "{task.instruction}"
              </div>
            )}

            {/* Task summary stats */}
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.2rem' }}>Completed</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: pct >= 60 ? 'var(--teal)' : pct >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                  {pct}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--mute-soft)' }}>{completedCount} of {sessions.length} personas</div>
              </div>
              {avgTurns !== null && (
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.2rem' }}>Avg turns to complete</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>{avgTurns}</div>
                  <div style={{ fontSize: '10px', color: 'var(--mute-soft)' }}>turns per persona</div>
                </div>
              )}
            </div>

            {/* Raw data per persona */}
            {sessions.map((session, si) => (
              <PersonaTaskBlock key={si} session={session} taskId={task.task_id} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ── Tab: Questionnaire ──────────────────────────────────────────────────── */
function QuestionnaireTab({ intake }) {
  if (!intake) {
    return <div style={{ padding: '2rem', color: 'var(--mute)', fontSize: '13px' }}>No intake data available.</div>;
  }

  const q = intake;

  return (
    <div>
      <SectionHead>Study context</SectionHead>
      <Field label="Product"         value={q.q1_product || q.q5_product_context?.product_name} />
      <Field label="Feature under test" value={q.q5_product_context?.feature_under_test} />
      <Field label="Product lifecycle"  value={q.q2_context?.lifecycle} />
      <Field label="Design phase"       value={q.q2_context?.design_phase} />
      <Field label="Fidelity"           value={q.q2_context?.fidelity} />
      <Field label="Artefact notes"     value={q.q2_context?.artefact_notes} />

      <SectionHead>Research goals</SectionHead>
      <Field label="Insight type"         value={q.q3_goals?.insight_type} />
      <Field label="Why this, why now"    value={q.q3_goals?.why_now || q.q5_product_context?.why_this_why_now} />
      <Field label="Primary research question" value={q.q3_goals?.primary_rq} />
      <Field label="Secondary questions"  value={q.q3_goals?.secondary_rqs} />
      <Field label="Decision to support"  value={q.q3_goals?.decision_to_support} />

      <SectionHead>Personas selected</SectionHead>
      {(q.q4_personas?.selected || []).length > 0
        ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {q.q4_personas.selected.map((p, i) => (
              <Tag key={i} label={p} type={p === q.q4_personas?.priority_segment ? 'blue' : 'gray'} />
            ))}
          </div>
        )
        : <div style={{ fontSize: '13px', color: 'var(--mute)', marginBottom: '1rem' }}>No personas recorded.</div>
      }
      <Field label="Priority segment" value={q.q4_personas?.priority_segment} />

      <SectionHead>Methodology</SectionHead>
      <Field label="Methodology" value={q.q6_methodology?.methodology} />
      <Field label="Scenario" value={q.q6_methodology?.scenario} />
      {(q.q6_methodology?.tasks || []).length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.3rem' }}>Tasks</div>
          {q.q6_methodology.tasks.filter(t => t.name || t.instruction).map((t, i) => (
            <div key={i} style={{ padding: '0.625rem 0.875rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', fontSize: '13px', color: 'var(--body)', lineHeight: 1.6, marginBottom: '0.4rem' }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', marginBottom: t.instruction ? '0.2rem' : 0 }}>{t.name || '—'}</div>
              {t.instruction && <div style={{ fontSize: '12px', color: 'var(--mute)', whiteSpace: 'pre-line' }}>{t.instruction}</div>}
              {t.whatToTest && <div style={{ fontSize: '11px', color: 'var(--mute-soft)', marginTop: '0.25rem', whiteSpace: 'pre-line' }}><strong>Testing:</strong> {t.whatToTest}</div>}
            </div>
          ))}
        </div>
      )}

      <Field label="What must not be assumed" value={q.q7_hypotheses?.forbidden_assumptions} />

      <SectionHead>Output preferences</SectionHead>
      <Field label="AI models" value={(q.q8_output?.model_providers || []).map(p => p === 'openai' ? 'OpenAI — gpt-4o' : 'Claude — claude-sonnet-4-6').join(', ')} />
      {(q.q8_output?.audience || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {q.q8_output.audience.map((a, i) => <Tag key={i} label={a} type="gray" />)}
        </div>
      )}
      <Field label="Additional notes" value={q.q8_output?.additional_notes} />
    </div>
  );
}

/* ── Tab: Images ─────────────────────────────────────────────────────────── */
function ImagesTab({ run }) {
  const materials = run.materials || [];
  const urls      = run.intake?.q2_context?.test_materials?.urls || [];

  if (materials.length === 0 && urls.length === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '1rem', opacity: .3 }}>🖼</div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.35rem' }}>No test materials</div>
        <div style={{ fontSize: '13px', color: 'var(--mute)' }}>No images or files were uploaded for this study.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Uploaded files */}
      {materials.length > 0 && (
        <>
          <SectionHead>Uploaded files ({materials.length})</SectionHead>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {materials.map((filename, i) => {
              const isImage = /\.(png|jpe?g|gif|webp)$/i.test(filename);
              const src     = `/api/runs/${run.id}/materials/${filename}`;
              return (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#fff' }}>
                  {isImage
                    ? <img src={src} alt={filename} style={{ width: '100%', display: 'block', maxHeight: '220px', objectFit: 'cover', objectPosition: 'top' }} />
                    : <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', fontSize: '28px' }}>📄</div>
                  }
                  <div style={{ padding: '0.625rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.4rem' }}>
                      {filename}
                    </div>
                    <a href={src} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--blue)', textDecoration: 'none' }}>
                      Open ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Linked URLs */}
      {urls.length > 0 && (
        <>
          <SectionHead>Prototype / staging links ({urls.length})</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {urls.map((url, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)' }}>
                <span style={{ fontSize: '14px', opacity: .6 }}>{url.includes('figma.com') ? '◈' : '🔗'}</span>
                <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--blue)', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {url}
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── RunDetail page ──────────────────────────────────────────────────────── */
const TABS = [
  { id: 'report',        label: 'Research report' },
  { id: 'questionnaire', label: 'Questionnaire'   },
  { id: 'images',        label: 'Test materials'  },
];

export default function RunDetail({ goTo, runId }) {
  const [run,   setRun]   = useState(null);
  const [tab,   setTab]   = useState('report');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!runId) return;
    api.getRun(runId)
      .then(setRun)
      .catch(err => setError(err.message));
  }, [runId]);

  const product = run?.intake?.q5_product_context?.product_name || run?.intake?.q1_product || runId;
  const feature = run?.intake?.q5_product_context?.feature_under_test || '';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{ padding: '0.875rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--paper)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button
            onClick={() => goTo('history')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--mute)', fontFamily: 'var(--sans)', padding: 0, marginBottom: '0.3rem', display: 'block' }}
          >
            ← All studies
          </button>
          <div style={{ fontSize: '11px', color: 'var(--mute-soft)', marginBottom: '0.1rem' }}>
            {run ? formatDate(run.created_at) : '—'} · {runId}
          </div>
          <h2 style={{ fontSize: '20px', color: 'var(--ink)', lineHeight: 1.2 }}>
            {product}{feature ? <span style={{ fontWeight: 400, color: 'var(--mute)' }}> — {feature}</span> : ''}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {run && run.sessions?.length > 0 && (
            <>
              <button
                onClick={() => triggerDownload(buildCsv(run), `${run.id}_raw_data.csv`, 'text/csv')}
                style={{ padding: '0.4rem 0.875rem', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)', background: '#fff', fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}
              >↓ Excel / CSV</button>
              <button
                onClick={() => buildPresentation(run)}
                style={{ padding: '0.4rem 0.875rem', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)', background: '#fff', fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}
              >↓ Presentation</button>
            </>
          )}
          {run && statusTag(run.status)}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--paper)', padding: '0 2rem', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '0.75rem 1.1rem',
              border: 'none',
              borderBottom: t.id === tab ? '2px solid var(--ink)' : '2px solid transparent',
              background: 'none',
              fontFamily: 'var(--sans)',
              fontSize: '13px',
              fontWeight: t.id === tab ? 500 : 400,
              color: t.id === tab ? 'var(--ink)' : 'var(--mute)',
              cursor: 'pointer',
              transition: 'all .12s',
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2.25rem', background: '#fff', maxWidth: '900px', width: '100%' }}>

        {error && (
          <div style={{ padding: '1rem', background: 'var(--red-lt)', border: '1px solid rgba(238,29,54,.2)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--red)' }}>
            Could not load study: {error}
          </div>
        )}

        {!run && !error && (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--mute)', fontSize: '13px' }}>
            Loading study…
          </div>
        )}

        {run && tab === 'report'        && <ReportTab        run={run} />}
        {run && tab === 'questionnaire' && <QuestionnaireTab intake={run.intake} />}
        {run && tab === 'images'        && <ImagesTab        run={run} />}
      </div>
    </div>
  );
}
