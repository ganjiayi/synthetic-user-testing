import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Tag } from '../components/UI';

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

/* ── Tab: Report ─────────────────────────────────────────────────────────── */
function ReportTab({ run }) {
  const plan     = run.plan;
  const sessions = run.sessions || [];
  const intake   = run.intake;

  const personas  = plan?.user_segments?.segments || [];
  const tasks     = plan?.test_scenarios?.scenarios || [];
  const hypotheses = plan?.hypotheses?.list || [];

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

  return (
    <div>
      {/* Study signal banner */}
      {sessions.length > 0 && (() => {
        const allScores = sessions.flatMap(s =>
          (s.turns || []).map(t => t.eval_scores?.friction_score).filter(n => typeof n === 'number')
        );
        const avg = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : null;
        const completed = sessions.filter(s => s.session_outcome === 'all_tasks_completed').length;
        const isGood = avg !== null && avg < 4;

        return (
          <div style={{
            padding: '1rem 1.5rem', marginBottom: '2rem',
            background: isGood ? 'var(--teal-lt)' : 'var(--red-lt)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${isGood ? 'rgba(0,138,21,.2)' : 'rgba(196,43,43,.2)'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 600, color: isGood ? 'var(--teal)' : 'var(--red)', marginBottom: '0.2rem' }}>
                {isGood ? 'Go — ready to ship' : 'No Go — return to design'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--mute)' }}>
                {completed} of {sessions.length} personas completed all tasks · avg friction {avg ?? '—'} / 10
              </div>
            </div>
            {avg !== null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 600, color: frictionColor(parseFloat(avg)), lineHeight: 1 }}>{avg}</div>
                <div style={{ fontSize: '10px', color: 'var(--mute-soft)', marginTop: '2px' }}>avg friction</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Goals */}
      {plan?.research_goals && (
        <>
          <SectionHead>Research goals</SectionHead>
          <Field label="Core question"      value={plan.research_goals.core_question} />
          <Field label="Primary RQ"         value={plan.research_goals.primary_rq} />
          <Field label="Decision to support" value={plan.research_goals.decision_to_support} />
        </>
      )}

      {/* Personas */}
      {personas.length > 0 && (
        <>
          <SectionHead>Personas ({personas.length})</SectionHead>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.625rem', marginBottom: '0.5rem' }}>
            {personas.map((p, i) => (
              <div key={i} style={{ padding: '0.875rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#fff' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--mute)', lineHeight: 1.5 }}>{p.context}</div>
                {p.priority === 'primary' && <div style={{ marginTop: '0.5rem' }}><Tag label="Primary" type="blue" /></div>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <>
          <SectionHead>Tasks ({tasks.length})</SectionHead>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '0.5rem' }}>
            <thead>
              <tr>
                {['ID', 'Task', 'Success condition', 'Abandon condition'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--blue)', fontFamily: 'monospace' }}>{t.task_id}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>{t.task_name}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--teal)', fontSize: '11px' }}>{t.success_condition || '—'}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--red)',  fontSize: '11px' }}>{t.abandon_condition  || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Hypotheses */}
      {hypotheses.length > 0 && (
        <>
          <SectionHead>Hypotheses</SectionHead>
          {hypotheses.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(13,17,23,.05)', fontSize: '12px', color: 'var(--body)', lineHeight: 1.6 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--blue)', flexShrink: 0 }}>{h.id}</span>
              <span>{h.statement}</span>
            </div>
          ))}
        </>
      )}

      {/* Session results */}
      {sessions.length > 0 && (
        <>
          <SectionHead>Session results — friction map</SectionHead>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '0.5rem' }}>
            <thead>
              <tr>
                {['Persona', 'Model', 'Tasks completed', 'Avg friction', 'Outcome'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const scores = (s.turns || []).map(t => t.eval_scores?.friction_score).filter(n => typeof n === 'number');
                const avg    = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
                const outcome = s.session_outcome === 'all_tasks_completed' ? 'Completed'
                  : s.session_outcome === 'partial_completion' ? 'Partial'
                  : 'No tasks completed';
                const outcomeType = s.session_outcome === 'all_tasks_completed' ? 'teal'
                  : s.session_outcome === 'partial_completion' ? 'amber' : 'red';

                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{s.persona_name}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {s.provider
                        ? <Tag label={s.provider === 'claude' ? 'Claude' : 'OpenAI'} type={s.provider === 'claude' ? 'amber' : 'teal'} />
                        : <span style={{ color: 'var(--mute-soft)', fontSize: '12px' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--body)' }}>{(s.tasks_completed || []).join(', ') || '—'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {avg !== '—'
                        ? <span style={{ display: 'inline-block', padding: '0.2rem 0.65rem', background: frictionBg(parseFloat(avg)), color: frictionColor(parseFloat(avg)), borderRadius: '5px', fontWeight: 600 }}>{avg}</span>
                        : '—'}
                    </td>
                    <td style={{ padding: '0.75rem' }}><Tag label={outcome} type={outcomeType} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
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
      {(q.q6_methodology?.tasks || []).length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.3rem' }}>Tasks</div>
          {q.q6_methodology.tasks.map((t, i) => (
            <div key={i} style={{ padding: '0.625rem 0.875rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', fontSize: '13px', color: 'var(--body)', lineHeight: 1.6, marginBottom: '0.4rem' }}>
              {t}
            </div>
          ))}
        </div>
      )}

      <SectionHead>Hypotheses</SectionHead>
      <Field label="H1" value={q.q7_hypotheses?.h1} />
      <Field label="H2" value={q.q7_hypotheses?.h2} />
      <Field label="H3" value={q.q7_hypotheses?.h3} />
      <Field label="Known risks"            value={q.q7_hypotheses?.known_risks} />
      <Field label="Forbidden assumptions"  value={q.q7_hypotheses?.forbidden_assumptions} />

      <SectionHead>Output preferences</SectionHead>
      <Field label="Model provider" value={q.q8_output?.model_provider} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
