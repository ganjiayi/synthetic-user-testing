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

export default function IntakeReview({ goTo, draft }) {
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState('');
  const form = draft || {};

  const tasks = (form.tasks || []).filter(t => t.name || t.instruction);
  const personas = (form.personas || []).map(code => PERSONA_NAMES[code] || code);
  const materials = form.testMaterials || { files: [], urls: [] };

  const handleConfirm = async () => {
    setSubmitting(true);

    const live = await api.isAvailable();

    if (!live) {
      // No backend — go to demo plan
      setSubmitting(false);
      goTo('plan', { draft: form });
      return;
    }

    try {
      const runId  = generateRunId(form.feature || form.product || 'study');
      const intake = buildIntake(form, runId);

      setMsg('Creating study run…');
      await api.createRun(runId, intake);

      // Upload test materials
      const filesToUpload = (materials.files || []).filter(f => f.file instanceof File);
      if (filesToUpload.length > 0) {
        setMsg(`Uploading ${filesToUpload.length} test material${filesToUpload.length > 1 ? 's' : ''}…`);
        await api.uploadFiles(runId, filesToUpload.map(f => f.file));
      }

      setMsg('Generating research plan…');
      await api.startPlan(runId);

      // Poll until plan is ready
      let attempts = 0;
      while (attempts < 60) {
        await new Promise(r => setTimeout(r, 3000));
        const status = await api.getStatus(runId);
        if (status.status === 'plan_ready') break;
        if (status.status === 'error') throw new Error(status.error || 'Plan generation failed');
        attempts++;
      }

      const plan = await api.getPlan(runId);
      setSubmitting(false);
      goTo('plan', { runId, plan, draft: form });

    } catch (err) {
      setSubmitting(false);
      setMsg('');
      alert(`Could not generate plan: ${err.message}`);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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
          {submitting && (
            <span style={{ fontSize: '13px', color: 'var(--mute)', fontStyle: 'italic' }}>{msg}</span>
          )}
          <button
            onClick={() => goTo('questionnaire', { draft: form })}
            disabled={submitting}
            style={{
              padding: '0.5rem 1.1rem', border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-sm)', background: 'var(--canvas)',
              fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--body)',
              cursor: submitting ? 'default' : 'pointer',
            }}
          >← Edit</button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              padding: '0.5rem 1.5rem', border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: submitting ? 'var(--mute-soft)' : 'var(--primary)',
              color: 'var(--on-primary)',
              fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500,
              cursor: submitting ? 'default' : 'pointer',
            }}
          >
            {submitting ? msg || 'Working…' : 'Generate plan →'}
          </button>
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
