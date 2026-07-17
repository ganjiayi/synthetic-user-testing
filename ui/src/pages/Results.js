import React, { useState, useEffect } from 'react';
import { Tag } from '../components/UI';
import { api } from '../api';
import {
  getMethodologyEvalFields, headlineNumericField, computeMetrics,
  frictionColor, taskAverage, taskOutcome, sessionSignal, primaryFrictionSignal,
} from '../lib/metrics';

const AVATAR_PALETTE = [
  { bg: '#EEF3FF', color: '#1B4FD8' },
  { bg: '#EAF3DE', color: '#27500A' },
  { bg: '#FAEEDA', color: '#633806' },
  { bg: '#EEEDFE', color: '#3C3489' },
  { bg: '#F1EFE8', color: '#444441' },
];

function outcomeTag(o) {
  if (o === 'completed')    return { label: 'Completed',  type: 'teal' };
  if (o === 'abandoned')    return { label: 'Abandoned',  type: 'red'  };
  if (o === 'in_progress')  return { label: 'In progress', type: 'amber' };
  return { label: o, type: 'gray' };
}

function gngStyle(sig) {
  if (sig === 'no_go')      return { label: 'No Go',      bg: 'var(--red-lt)',   color: 'var(--red)',   border: 'rgba(196,43,43,.2)'  };
  if (sig === 'conditional') return { label: 'Conditional', bg: 'var(--amber-lt)', color: 'var(--amber)', border: 'rgba(201,123,47,.2)' };
  return                           { label: 'Go',          bg: 'var(--teal-lt)', color: 'var(--primary)',  border: 'rgba(15,138,110,.2)' };
}

// Builds the per-card view model from a raw session + the plan's task list —
// every field here is derived from real turn data (eval_scores, tasks_completed,
// session_outcome), never fabricated prose.
function buildSessionView(session, tasks, headlineKey, index) {
  const friction = {};
  const outcomes = {};
  for (const t of tasks) {
    const avg = taskAverage(session, t.task_id, headlineKey);
    if (avg !== null) friction[t.task_id] = avg;
    const outcome = taskOutcome(session, t.task_id);
    if (outcome) outcomes[t.task_id] = outcome;
  }
  const frictionValues = Object.values(friction);
  const frictionAvg = frictionValues.length
    ? +(frictionValues.reduce((a, b) => a + b, 0) / frictionValues.length).toFixed(1)
    : null;

  return {
    id: session.persona_id || `P${index + 1}`,
    persona: session.persona_name || 'Unknown persona',
    priority: session.persona_priority,
    avatar: AVATAR_PALETTE[index % AVATAR_PALETTE.length],
    friction, frictionAvg,
    outcomes,
    signal: sessionSignal(session),
    primarySignal: primaryFrictionSignal(session, headlineKey),
  };
}

function EmptyState({ message }) {
  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '1rem', opacity: .3 }}>⟳</div>
      <div style={{ fontSize: '14px', color: 'var(--mute)' }}>{message}</div>
    </div>
  );
}

export default function Results({ goTo, runId }) {
  const [expanded, setExpanded] = useState(null);
  const [plan,     setPlan]     = useState(null);
  const [sessions, setSessions] = useState(null); // null = not yet loaded
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!runId) { setSessions([]); return; }
    let cancelled = false;
    (async () => {
      const available = await api.isAvailable();
      if (!available) { if (!cancelled) { setSessions([]); setLoadError('Backend unavailable.'); } return; }
      try {
        const [planData, sessionsData] = await Promise.all([
          api.getPlan(runId).catch(() => null),
          api.getSessions(runId),
        ]);
        if (cancelled) return;
        setPlan(planData);
        setSessions(sessionsData?.sessions || []);
      } catch (err) {
        if (!cancelled) { setSessions([]); setLoadError(err.message || 'Could not load session data'); }
      }
    })();
    return () => { cancelled = true; };
  }, [runId]);

  const tasks       = plan?.test_scenarios?.scenarios || [];
  const evalFields   = getMethodologyEvalFields(plan);
  const headlineKey  = headlineNumericField(evalFields);
  const loading      = sessions === null;
  const liveSessions = sessions || [];

  const views = liveSessions.map((s, i) => buildSessionView(s, tasks, headlineKey, i));

  const metrics      = liveSessions.length > 0 ? computeMetrics(liveSessions, evalFields) : null;
  const avgFriction  = metrics?.[`avg__${headlineKey}`] != null ? metrics[`avg__${headlineKey}`].toFixed(1) : '—';
  const converted    = views.filter(v => v.signal === 'go').length;
  const noGo         = views.filter(v => v.signal === 'no_go').length;
  const conditional  = views.filter(v => v.signal === 'conditional').length;

  const productName  = plan?.study_context?.product || plan?.research_goals?.product_name || '';
  const feature       = plan?.research_goals?.feature_under_test || '';
  const studyTitle    = productName ? `${productName}${feature ? ' — ' + feature : ''}` : (runId || 'Study results');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.875rem 2rem', borderBottom: '1px solid var(--border)',
        background: 'var(--paper)', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--mute-soft)', marginBottom: '0.1rem' }}>Session results</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--ink)' }}>
            {studyTitle}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            disabled={liveSessions.length === 0}
            onClick={() => {
              const rows = [
                ['persona', 'task', 'friction', 'outcome', 'signal', 'primary_friction_signal'].join(','),
                ...views.flatMap(v =>
                  Object.keys(v.outcomes).map(taskId =>
                    [v.persona, taskId, v.friction[taskId] ?? '', v.outcomes[taskId], v.signal,
                     `"${(v.primarySignal?.text || '').replace(/"/g, '""')}"`].join(',')
                  )
                ),
              ].join('\n');
              const blob = new Blob([rows], { type: 'text/csv' });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement('a');
              a.href = url; a.download = `${runId || 'study'}_results.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: '0.45rem 1rem', border: '1px solid var(--border-md)',
              borderRadius: 'var(--radius-sm)', background: '#fff',
              fontFamily: 'var(--sans)', fontSize: '12px',
              cursor: liveSessions.length === 0 ? 'not-allowed' : 'pointer',
              color: liveSessions.length === 0 ? 'var(--mute-soft)' : 'var(--ink)',
            }}
          >↓ Download CSV</button>
          <button
            onClick={() => goTo('runDetail', { runId })}
            style={{
              padding: '0.45rem 1.25rem', border: 'none',
              borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--on-primary)',
              fontFamily: 'var(--sans)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            }}
          >Analyze data →</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem' }}>

        {loading && <EmptyState message="Loading session data…" />}
        {!loading && liveSessions.length === 0 && (
          <EmptyState message={loadError || 'No session data yet for this run — evaluation may still be in progress.'} />
        )}

        {!loading && liveSessions.length > 0 && (
          <>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Converted',   value: `${converted}/${views.length}`,   sub: 'personas',       color: 'var(--ink)' },
                { label: 'Conditional', value: `${conditional}/${views.length}`, sub: 'near conversion', color: 'var(--amber)' },
                { label: 'No Go',       value: `${noGo}/${views.length}`,        sub: 'personas',       color: 'var(--red)' },
                { label: 'Avg friction', value: avgFriction, sub: 'out of 10', color: avgFriction !== '—' ? frictionColor(parseFloat(avgFriction)) : 'var(--ink)' },
              ].map((stat, i) => (
                <div key={i} style={{
                  padding: '1.1rem 1.25rem', background: '#fff',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.4rem' }}>
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: '28px', color: stat.color, lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--mute-soft)', marginTop: '0.25rem' }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Session cards */}
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.75rem' }}>
              Persona sessions
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {views.map(v => {
                const gng    = gngStyle(v.signal);
                const isOpen = expanded === v.id;

                return (
                  <div key={v.id} style={{
                    background: '#fff', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', overflow: 'hidden',
                  }}>
                    {/* Row */}
                    <div
                      onClick={() => setExpanded(isOpen ? null : v.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '180px 1fr 56px 100px 18px',
                        alignItems: 'center', gap: '1rem',
                        padding: '0.875rem 1.25rem', cursor: 'pointer',
                      }}
                    >
                      {/* Persona */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: v.avatar.bg, color: v.avatar.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 600, flexShrink: 0,
                        }}>{v.persona.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{v.persona}</div>
                          {v.priority === 'primary' && (
                            <div style={{ fontSize: '11px', color: 'var(--blue)' }}>Primary</div>
                          )}
                        </div>
                      </div>

                      {/* Task outcomes */}
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {Object.entries(v.outcomes).map(([tid, o]) => {
                          const t = outcomeTag(o);
                          return <Tag key={tid} label={`${tid}: ${t.label}`} type={t.type} />;
                        })}
                      </div>

                      {/* Friction avg */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: v.frictionAvg !== null ? frictionColor(v.frictionAvg) : 'var(--mute-soft)' }}>
                          {v.frictionAvg ?? '—'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--mute-soft)' }}>avg</div>
                      </div>

                      {/* Go/No-Go pill */}
                      <div style={{
                        padding: '0.25rem 0.7rem', borderRadius: '12px',
                        background: gng.bg, color: gng.color,
                        fontSize: '11px', fontWeight: 500,
                        border: `1px solid ${gng.border}`,
                        textAlign: 'center', whiteSpace: 'nowrap',
                      }}>{gng.label}</div>

                      {/* Chevron */}
                      <div style={{ color: 'var(--mute-soft)', fontSize: '12px', textAlign: 'right', transition: 'transform .15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</div>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div style={{
                        borderTop: '1px solid var(--border)',
                        background: 'var(--cream)',
                        padding: '1.1rem 1.25rem',
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.4rem' }}>
                          Primary friction signal
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--ink-strong)', lineHeight: 1.7, margin: '0 0 0.875rem' }}>
                          {v.primarySignal
                            ? <>"{v.primarySignal.text}" <span style={{ color: 'var(--mute)' }}>({v.primarySignal.taskId})</span></>
                            : 'No confusion, trust, or abandon signal recorded on any turn.'}
                        </p>
                        <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.4rem' }}>
                          Friction by task
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {Object.entries(v.friction).map(([task, score]) => (
                            <div key={task} style={{
                              padding: '0.3rem 0.75rem', background: '#fff',
                              borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px',
                            }}>
                              <span style={{ color: 'var(--mute)' }}>{task}:</span>{' '}
                              <span style={{ fontWeight: 600, color: frictionColor(score) }}>{score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom CTA */}
            <div style={{
              marginTop: '2rem', padding: '1.5rem 2rem',
              background: 'var(--primary)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: '#fff', marginBottom: '0.25rem' }}>
                  Ready to generate the research report
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.75)' }}>
                  {views.length} session{views.length !== 1 ? 's' : ''} · {tasks.length} task{tasks.length !== 1 ? 's' : ''} each · friction map · recommended actions
                </div>
              </div>
              <button
                onClick={() => goTo('runDetail', { runId })}
                style={{
                  padding: '0.75rem 2rem', background: '#fff', color: 'var(--primary)',
                  border: 'none', borderRadius: '8px',
                  fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                }}
              >Analyze data →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
