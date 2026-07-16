import React, { useState } from 'react';
import { PLAN_SECTIONS } from '../data/questionnaire';
import { api } from '../api';

/* ── Toolbar button ── */
function TBtn({ label, onClick, primary }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.45rem 1rem',
      border: primary ? 'none' : '1px solid var(--border-md)',
      borderRadius: 'var(--radius-sm)',
      background: primary ? 'var(--teal)' : '#fff',
      color: primary ? '#fff' : 'var(--ink)',
      fontFamily: 'var(--sans)', fontSize: '12px', fontWeight: primary ? 500 : 400,
      cursor: 'pointer',
      transition: 'background .15s',
    }}>{label}</button>
  );
}

/* ── Empty state shown when no live plan is available ── */
function NoPlanSection() {
  return (
    <div style={{ padding: '3rem 0', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '1rem', opacity: .3 }}>◫</div>
      <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.4rem' }}>No plan generated yet</div>
      <div style={{ fontSize: '13px', color: 'var(--mute)' }}>
        Complete the questionnaire and click Generate plan to see your study plan here.
      </div>
    </div>
  );
}

/* ── Live plan section renderer ── */
function renderValue(val) {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) {
    if (val.length === 0) return '—';
    if (typeof val[0] === 'string') return val.join('\n');
    return val.map((v, i) => (
      <div key={i} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: i < val.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
        {Object.entries(v).map(([k, vv]) => (
          <div key={k} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.2rem', fontSize: '12px' }}>
            <span style={{ color: 'var(--mute)', minWidth: '120px', flexShrink: 0 }}>{k.replace(/_/g, ' ')}</span>
            <span style={{ color: 'var(--body)' }}>{String(vv)}</span>
          </div>
        ))}
      </div>
    ));
  }
  if (typeof val === 'object') {
    return Object.entries(val).map(([k, v]) => (
      <div key={k} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '12px' }}>
        <span style={{ color: 'var(--mute)', minWidth: '140px', flexShrink: 0 }}>{k.replace(/_/g, ' ')}</span>
        <span style={{ color: 'var(--body)' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
      </div>
    ));
  }
  return String(val);
}

function LivePlanSection({ sectionKey, data }) {
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return <div style={{ fontSize: '13px', color: 'var(--mute)', fontStyle: 'italic' }}>No data for this section.</div>;
  }
  return (
    <div>
      {Object.entries(data).map(([key, val]) => (
        <div key={key} style={{ marginBottom: '1.1rem' }}>
          <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.35rem' }}>
            {key.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--body)', lineHeight: 1.65, padding: '0.625rem 0.875rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', whiteSpace: 'pre-wrap' }}>
            {renderValue(val)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Section key → plan key mapping ── */
const SECTION_MAP = {
  ctx:     'study_context',
  goals:   'research_goals',
  personas:'user_segments',
  tasks:   'test_scenarios',
  eval:    'eval_metrics',
  method:  'method',
  output:  'output_handoff',
};

/* ── Run confirmation modal ── */
function RunConfirmModal({ plan, runId, onConfirm, onCancel }) {
  const personas = plan?.user_segments?.segments?.length
    || plan?.personas?.length
    || 5;
  const tasks    = plan?.test_scenarios?.scenarios?.length
    || plan?.tasks?.length
    || 2;
  const model    = plan?._meta?.model || 'gpt-4o';
  const estMins  = Math.ceil((personas * tasks * 45) / 60);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(8,8,8,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--canvas)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--hairline)',
        padding: '2rem', width: '420px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          Ready to run research?
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--body)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          This will start synthetic user sessions. Once launched it cannot be paused.
        </p>

        <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Personas',       value: `${personas} synthetic users` },
            { label: 'Tasks',          value: `${tasks} tasks per persona` },
            { label: 'Total sessions', value: `${personas * tasks} sessions` },
            { label: 'Model',          value: model },
            { label: 'Est. duration',  value: `~${estMins} minutes` },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: i < 4 ? '0.5rem' : 0 }}>
              <span style={{ color: 'var(--mute)' }}>{row.label}</span>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '0.6rem 1.25rem', border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-sm)', background: 'var(--canvas)',
            fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--body)', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '0.6rem 1.5rem', border: 'none',
            borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--on-primary)',
            fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}>▶ Start research</button>
        </div>
      </div>
    </div>
  );
}

export default function PlanViewer({ goTo, runId, plan }) {
  const [activeSection, setActiveSection] = useState('ctx');
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [livePlan,      setLivePlan]      = useState(plan);
  const [regenerating,  setRegenerating]  = useState(false);
  const [regenError,    setRegenError]    = useState('');

  const isLive    = !!livePlan;
  const current   = PLAN_SECTIONS.find(s => s.id === activeSection);
  const product   = livePlan?.study_context?.product || livePlan?.research_goals?.product_name || '';
  const feature   = livePlan?.research_goals?.feature_under_test || '';
  const studyName = product ? `${product}${feature ? ' — ' + feature : ''}` : 'Study plan';

  const handleRunClick = () => setShowConfirm(true);
  const handleConfirm  = () => { setShowConfirm(false); goTo('running', { runId }); };
  const handleCancel   = () => setShowConfirm(false);

  // Rejects the current plan and loops back to planning for this same run,
  // instead of the only other options being "download" or "run" — the
  // research planner is re-invoked with the same intake, producing a fresh
  // plan in place rather than starting a brand-new run.
  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenError('');
    try {
      await api.startPlan(runId);
      const freshPlan = await api.getPlan(runId);
      setLivePlan(freshPlan);
    } catch (err) {
      setRegenError(err.message || 'Could not regenerate plan');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.875rem 2rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--paper)',
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--mute-soft)', marginBottom: '0.1rem' }}>
            Study plan {isLive && <span style={{ color: 'var(--teal)', fontWeight: 500 }}>· Live</span>}
          </div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--ink)' }}>
            {studyName}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {regenError && (
            <span style={{ fontSize: '12px', color: 'var(--red)', marginRight: '0.25rem' }}>{regenError}</span>
          )}
          <TBtn
            label={regenerating ? '↺ Regenerating…' : '↺ Reject & regenerate'}
            onClick={isLive && !regenerating ? handleRegenerate : undefined}
          />
          <TBtn label="↓ Download plan" onClick={() => {
            if (isLive && livePlan) {
              const blob = new Blob([JSON.stringify(livePlan, null, 2)], { type: 'application/json' });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement('a');
              a.href = url; a.download = `${livePlan._meta?.run_id || 'study-plan'}.json`; a.click();
              URL.revokeObjectURL(url);
            } else {
              alert('Download is available after generating a live study plan.');
            }
          }} />
          <TBtn label="▶  Run research" onClick={!regenerating ? handleRunClick : undefined} primary />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '210px 1fr', overflow: 'hidden' }}>

        {/* Side nav */}
        <div style={{ padding: '1.25rem 1rem', borderRight: '1px solid var(--border)', background: 'var(--cream)', overflowY: 'auto' }}>
          {PLAN_SECTIONS.map(s => (
            <div key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.75rem', borderRadius: '7px',
                marginBottom: '2px', cursor: 'pointer',
                background: s.id === activeSection ? '#fff' : 'transparent',
                border: s.id === activeSection ? '1px solid var(--border)' : '1px solid transparent',
                fontSize: '13px',
                fontWeight: s.id === activeSection ? 500 : 400,
                color: s.id === activeSection ? 'var(--ink)' : 'var(--mute)',
                transition: 'all .12s',
              }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              {s.label}
            </div>
          ))}

          {isLive && (
            <div style={{ margin: '1.5rem 0 0', padding: '0.75rem', background: 'rgba(0,215,34,0.08)', borderRadius: '7px', border: '1px solid rgba(0,215,34,0.2)' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--teal)', marginBottom: '0.2rem' }}>Generated plan</div>
              <div style={{ fontSize: '11px', color: 'var(--body)', lineHeight: 1.5 }}>
                Run ID: {livePlan?._meta?.run_id || '—'}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem 2.25rem', overflowY: 'auto', background: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '0.4rem' }}>
            Section {String(PLAN_SECTIONS.findIndex(s => s.id === activeSection) + 1).padStart(2, '0')}
          </div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '26px', color: 'var(--ink)', marginBottom: '1.75rem' }}>
            {current?.label}
          </h2>

          {isLive
            ? <LivePlanSection sectionKey={activeSection} data={livePlan[SECTION_MAP[activeSection]]} />
            : <NoPlanSection />
          }
        </div>
      </div>

      {showConfirm && (
        <RunConfirmModal
          plan={livePlan}
          runId={runId}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
