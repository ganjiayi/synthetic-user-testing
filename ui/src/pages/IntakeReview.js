import React, { useState } from 'react';
import { api, generateRunId, buildIntake } from '../api';

/* ── Small field display ── */
function Field({ label, value }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.35rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--body)', lineHeight: 1.65, padding: '0.625rem 0.875rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', whiteSpace: 'pre-wrap' }}>
        {Array.isArray(value) ? value.join(', ') : String(value)}
      </div>
    </div>
  );
}

/* ── Section block ── */
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--hairline)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

const PERSONA_NAMES = {
  ST: 'Spontaneous Traditionalist',
  PI: 'Progressive Influencer',
  TE: 'Trendsetter Explorer',
  FC: 'Family-Centric Devotee',
  RC: 'Routine Conservative',
};

/* ── Loading overlay shown during plan generation ── */
function PlanLoadingScreen({ step }) {
  const steps = [
    { key: 'run',    label: 'Creating study run',          done: step > 0 },
    { key: 'upload', label: 'Uploading test materials',    done: step > 1 },
    { key: 'plan',   label: 'Generating research plan',    done: step > 2 },
    { key: 'fetch',  label: 'Finalising plan',             done: step > 3 },
  ];
  const active = steps.findIndex(s => !s.done);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--paper)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Spinner */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--ink)',
        animation: 'intake-spin 0.8s linear infinite',
        marginBottom: '2rem',
      }} />

      <h2 style={{ fontFamily: 'var(--serif)', fontSize: '28px', color: 'var(--ink)', marginBottom: '0.5rem', textAlign: 'center' }}>
        Generating your research plan
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--mute)', marginBottom: '2.5rem', textAlign: 'center' }}>
        Your inputs are being processed by the AI. This usually takes 30–60 seconds.
      </p>

      {/* Step list */}
      <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {steps.map((s, i) => {
          const isActive  = i === active;
          const isDone    = s.done;
          const isPending = !isDone && !isActive;
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: '0.875rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: isDone ? 'var(--teal-lt)' : isActive ? 'var(--blue-lt)' : 'var(--cream)',
              border: `1px solid ${isDone ? 'rgba(15,138,110,.2)' : isActive ? 'rgba(27,79,216,.2)' : 'var(--border)'}`,
            }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
                background: isDone ? 'var(--teal)' : isActive ? 'var(--blue)' : 'var(--border)',
                color: isDone || isActive ? '#fff' : 'var(--mute)',
              }}>
                {isDone ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                color: isDone ? 'var(--teal)' : isActive ? 'var(--blue)' : 'var(--mute)',
              }}>
                {s.label}{isActive ? '…' : ''}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes intake-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function IntakeReview({ goTo, draft }) {
  const [loadingStep, setLoadingStep] = useState(-1); // -1 = not loading
  const form = draft || {};

  const tasks = (form.tasks || []).filter(t => t.name || t.instruction);
  const personas = (form.personas || []).map(code => PERSONA_NAMES[code] || code);
  const materials = form.testMaterials || { files: [], urls: [] };

  const isLoading = loadingStep >= 0;

  const handleConfirm = async () => {
    setLoadingStep(0);
    try {
      const runId  = generateRunId(form.feature || form.product || 'study');
      const intake = buildIntake(form, runId);

      await api.createRun(runId, intake);
      setLoadingStep(1);

      const filesToUpload = (materials.files || []).filter(f => f.file instanceof File);
      if (filesToUpload.length > 0) {
        await api.uploadFiles(runId, filesToUpload.map(f => f.file));
      }
      setLoadingStep(2);

      await api.startPlan(runId);
      setLoadingStep(3);

      const plan = await api.getPlan(runId);
      setLoadingStep(-1);
      goTo('plan', { runId, plan, draft: form });

    } catch (err) {
      setLoadingStep(-1);
      alert(`Could not generate plan: ${err.message}`);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {isLoading && <PlanLoadingScreen step={loadingStep} />}

      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.875rem 2rem', borderBottom: '1px solid var(--hairline)',
        background: 'var(--canvas)', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--mute)', marginBottom: '0.1rem' }}>Step 8 of 8</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Review your study setup
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => goTo('questionnaire', { draft: form })}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1.1rem', border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-sm)', background: 'var(--canvas)',
              fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--body)',
              cursor: isLoading ? 'default' : 'pointer',
            }}
          >← Edit</button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1.5rem', border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: isLoading ? 'var(--mute-soft)' : 'var(--primary)',
              color: 'var(--on-primary)',
              fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500,
              cursor: isLoading ? 'default' : 'pointer',
            }}
          >Generate plan →</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* Left column */}
        <div style={{ padding: '2rem 2rem 2rem 2.5rem', overflowY: 'auto', borderRight: '1px solid var(--hairline)' }}>

          <Section title="Product & context">
            <Field label="Product" value={form.product} />
            <Field label="Feature under test" value={form.feature} />
            <Field label="Lifecycle phase" value={form.lifecycle} />
            <Field label="Design phase" value={form.designPhase} />
            <Field label="Fidelity" value={form.fidelity} />
          </Section>

          <Section title="Research goals">
            <Field label="Insight type" value={form.insightType} />
            <Field label="Why this, why now" value={form.whyNow} />
            <Field label="Primary research question" value={form.primaryRQ} />
            <Field label="Secondary research questions" value={form.secondaryRQs} />
            <Field label="Decision to support" value={form.decisionToSupport} />
          </Section>

          <Section title="Test materials">
            {materials.files.length === 0 && materials.urls.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--mute)', fontStyle: 'italic' }}>No files or links added.</div>
            ) : (
              <>
                {materials.files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', color: 'var(--body)', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: .5 }}>📄</span> {f.name}
                    {f.preview && <img src={f.preview} alt={f.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--hairline)' }} />}
                  </div>
                ))}
                {materials.urls.map((u, i) => (
                  <div key={i} style={{ fontSize: '13px', color: 'var(--blue)', marginBottom: '0.3rem' }}>
                    🔗 {u.length > 60 ? u.slice(0, 58) + '…' : u}
                  </div>
                ))}
              </>
            )}
          </Section>
        </div>

        {/* Right column */}
        <div style={{ padding: '2rem 2.5rem 2rem 2rem', overflowY: 'auto' }}>

          <Section title="Research methodology">
            <Field label="Methodology" value={form.methodology} />
          </Section>

          <Section title="Personas">
            {personas.length === 0
              ? <div style={{ fontSize: '13px', color: 'var(--mute)', fontStyle: 'italic' }}>No personas selected.</div>
              : personas.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', color: 'var(--body)', marginBottom: '0.35rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, display: 'inline-block' }} />
                  {p}
                </div>
              ))
            }
          </Section>

          <Section title="Tasks">
            {tasks.length === 0
              ? <div style={{ fontSize: '13px', color: 'var(--mute)', fontStyle: 'italic' }}>No tasks defined.</div>
              : tasks.map((t, i) => (
                <div key={i} style={{ marginBottom: '0.875rem', padding: '0.75rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--blue)', fontFamily: 'monospace', marginBottom: '0.25rem' }}>T{i + 1}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.15rem' }}>{t.name || '—'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--body)' }}>{t.instruction || '—'}</div>
                </div>
              ))
            }
          </Section>

          <Section title="Output">
            <Field label="AI models" value={(form.modelProviders || []).map(p => p === 'openai' ? 'OpenAI — gpt-4o' : 'Claude — claude-sonnet-4-6').join(', ') || 'Not selected'} />
            <Field label="Primary audience" value={form.audience} />
            <Field label="Output formats" value={form.outputFormats} />
          </Section>
        </div>
      </div>
    </div>
  );
}
