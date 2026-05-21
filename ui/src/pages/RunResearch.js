import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const DEMO_STEPS = [
  { persona: 'Persona 1', archetype: 'Primary segment',   task: 'T1 — Task 1' },
  { persona: 'Persona 1', archetype: 'Primary segment',   task: 'T2 — Task 2' },
  { persona: 'Persona 2', archetype: 'Secondary segment', task: 'T1 — Task 1' },
  { persona: 'Persona 2', archetype: 'Secondary segment', task: 'T2 — Task 2' },
  { persona: 'Persona 3', archetype: 'Secondary segment', task: 'T1 — Task 1' },
  { persona: 'Persona 3', archetype: 'Secondary segment', task: 'T2 — Task 2' },
  { persona: 'Persona 4', archetype: 'Primary segment',   task: 'T1 — Task 1' },
  { persona: 'Persona 4', archetype: 'Primary segment',   task: 'T2 — Task 2' },
  { persona: 'Persona 5', archetype: 'Secondary segment', task: 'T1 — Task 1' },
  { persona: 'Persona 5', archetype: 'Secondary segment', task: 'T2 — Task 2' },
];

const STEP_MS = 2600;

export default function RunResearch({ goTo, runId }) {
  const [step,      setStep]    = useState(0);
  const [done,      setDone]    = useState(false);
  const [liveMode,  setLiveMode] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const pollRef = useRef(null);

  // Live mode — real API polling
  useEffect(() => {
    if (!runId) return;

    api.isAvailable().then(available => {
      if (!available) return;
      setLiveMode(true);

      // Start evaluation
      api.startEvaluation(runId).catch(() => {});

      // Poll status every 5s
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.getStatus(runId);
          setStatusMsg(status.status);

          if (status.status === 'evaluation_complete') {
            clearInterval(pollRef.current);
            setDone(true);
            setStep(DEMO_STEPS.length);
            setTimeout(() => goTo('runDetail', { runId }), 1200);
          }
          if (status.status === 'error') {
            clearInterval(pollRef.current);
            setStatusMsg(`Error: ${status.error}`);
            setDone(true);
          }
        } catch {}
      }, 5000);
    });

    return () => clearInterval(pollRef.current);
  }, [runId]);

  // Demo mode — simulated timer
  useEffect(() => {
    if (liveMode || done) return;
    const t = setTimeout(() => {
      setStep(s => {
        const next = s + 1;
        if (next >= DEMO_STEPS.length) setDone(true);
        return next;
      });
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [step, done, liveMode]);

  const pct       = Math.min(100, Math.round((step / DEMO_STEPS.length) * 100));
  const secsLeft  = Math.max(0, Math.round(((DEMO_STEPS.length - step) * STEP_MS) / 1000));
  const current   = DEMO_STEPS[Math.min(step, DEMO_STEPS.length - 1)];
  const completed = DEMO_STEPS.slice(0, step);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '3rem 2rem', background: 'var(--paper)',
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: done ? 'var(--teal)' : 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '0.75rem' }}>
            {done ? 'Research complete' : 'Running synthetic sessions'}
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '36px', color: 'var(--ink)', marginBottom: '0.5rem' }}>
            {done ? 'All sessions complete' : 'Testing in progress…'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--mute)' }}>
            {done
              ? '5 personas · 2 tasks · 10 sessions completed'
              : `5 personas · 2 tasks · ~${secsLeft}s remaining`}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{pct}% complete</span>
            {!done && <span style={{ fontSize: '13px', color: 'var(--mute-soft)' }}>~{secsLeft}s remaining</span>}
          </div>
          <div style={{ height: '8px', background: 'var(--cream)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: done ? 'var(--teal)' : 'var(--blue)',
              borderRadius: '4px',
              transition: 'width 0.7s ease, background 0.4s',
            }} />
          </div>
        </div>

        {/* Active step indicator */}
        {!done && (
          <div style={{
            padding: '1rem 1.25rem', marginBottom: '1.25rem',
            background: 'var(--blue-lt)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--blue-md)',
            display: 'flex', alignItems: 'center', gap: '0.875rem',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--blue)', flexShrink: 0,
              animation: 'synthux-pulse 1.4s infinite',
            }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--blue)' }}>
                {current.persona} · {current.task}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--body)', marginTop: '1px' }}>
                {current.archetype}
              </div>
            </div>
          </div>
        )}

        {/* Completed steps list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '1.75rem' }}>
          {completed.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 1rem',
              background: '#fff', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', fontSize: '12px',
            }}>
              <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '13px' }}>✓</span>
              <span style={{ color: 'var(--ink-strong)', flex: 1 }}>{s.persona} — {s.task}</span>
              <span style={{ color: 'var(--mute-soft)', fontSize: '11px' }}>{s.archetype}</span>
            </div>
          ))}
        </div>

        {/* Done state */}
        {done && (
          <>
            <div style={{
              padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
              background: 'var(--teal-lt)', borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(15,138,110,.25)',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                Sessions complete — results ready
              </div>
              <div style={{ fontSize: '12px', color: 'var(--primary)', lineHeight: 1.6 }}>
                Friction scores, session logs, and eval matrix generated across all 5 personas.
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => goTo(runId ? 'runDetail' : 'results', { runId })}
                style={{
                  padding: '0.875rem 2.5rem',
                  background: 'var(--primary)', color: 'var(--on-primary)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--sans)', fontSize: '15px', fontWeight: 500,
                  cursor: 'pointer',
                }}
              >View results →</button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes synthux-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
