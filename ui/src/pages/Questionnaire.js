import React, { useState } from 'react';
import { STEPS, PRODUCTS, PERSONAS } from '../data/questionnaire';
import { SelectCard, PersonaCard, Pill, AutofillNotice, FieldGroup, TextInput, UploadZone } from '../components/UI';

/* ── Shared style helpers ── */
const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '1.25rem' };
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' };
const pillRow = { display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '1.1rem' };
const taskGrid = { display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' };

/* ══════════════════════════════════════════════════════
   Step content components
═══════════════════════════════════════════════════════ */

function StepProduct({ form, setForm }) {
  const urgencyOpts = ['Immediate','Within 24 hours','Within 48 hours','End of sprint'];
  return (
    <>
      <div style={grid3}>
        {PRODUCTS.map(p => (
          <SelectCard key={p.id} {...p} selected={form.product === p.id}
            onClick={() => setForm(f => ({ ...f, product: p.id }))} />
        ))}
      </div>
      {form.product === 'ACM' && (
        <AutofillNotice>
          Astro.com.my loaded — product description, 7 known pain points, and agent instructions auto-populated. Section 6B pre-filled from the product database.
        </AutofillNotice>
      )}
      <FieldGroup label="Urgency">
        <div style={pillRow}>
          {urgencyOpts.map(o => (
            <Pill key={o} label={o} selected={form.urgency === o}
              onClick={() => setForm(f => ({ ...f, urgency: o }))} />
          ))}
        </div>
      </FieldGroup>
    </>
  );
}

function StepContext({ form, setForm }) {
  const lifecycle = ['Pre-launch','Public beta','Live — scaling','Live — mature'];
  const phases    = ['Empathise','Define','Ideate','Prototype','Test','Post-launch'];
  const fidelity  = ['Wireframe','Mid-fidelity','High-fidelity','Production'];

  const calMap = {
    'Pre-launch':          'High tolerance — agent accepts significant friction',
    'Public beta':         'Moderate tolerance — agent flags high-friction patterns',
    'Live — scaling': 'Low tolerance — agent escalates friction more readily',
    'Live — mature':  'Minimal tolerance — agent treats friction as production issues',
  };

  return (
    <>
      <FieldGroup label="Product lifecycle phase">
        <div style={grid2}>
          {lifecycle.map(l => (
            <SelectCard key={l} name={l} selected={form.lifecycle === l}
              onClick={() => setForm(f => ({ ...f, lifecycle: l }))} />
          ))}
        </div>
        {form.lifecycle && (
          <div style={{ fontSize: '11px', color: 'var(--blue)', marginTop: '-0.75rem', marginBottom: '1.1rem' }}>
            Agent calibration → {calMap[form.lifecycle]}
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="Design thinking phase">
        <div style={pillRow}>
          {phases.map(p => (
            <Pill key={p} label={p} selected={form.designPhase === p}
              onClick={() => setForm(f => ({ ...f, designPhase: p }))} />
          ))}
        </div>
      </FieldGroup>

      <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0 1.25rem' }} />

      <FieldGroup
        label="Test materials"
        hint="Upload Figma JPEG exports, screenshots, or documents — or paste a Figma prototype link, staging URL, or any live URL. Add as many files and links as needed."
      >
        <UploadZone
          value={form.testMaterials}
          onChange={v => setForm(f => ({ ...f, testMaterials: v }))}
        />
      </FieldGroup>

      <FieldGroup label="Fidelity level">
        <div style={pillRow}>
          {fidelity.map(fi => (
            <Pill key={fi} label={fi} selected={form.fidelity === fi}
              onClick={() => setForm(f => ({ ...f, fidelity: fi }))} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Additional notes about the test material">
        <TextInput rows={2}
          placeholder="e.g. Mobile screens only. Bahasa Malaysia version not yet available. Covers homepage and pack page only."
          value={form.artefactNotes || ''}
          onChange={e => setForm(f => ({ ...f, artefactNotes: e.target.value }))} />
      </FieldGroup>
    </>
  );
}

function StepGoals({ form, setForm }) {
  const insightOpts = ['Qualitative','Quantitative','Mixed'];
  return (
    <>
      <FieldGroup label="Core research question *"
        hint="One question only. Everything else in the study organises around answering this.">
        <TextInput rows={2}
          placeholder="e.g. Does the new homepage clearly communicate that Astro no longer requires a set-top box?"
          value={form.coreQuestion || ''}
          onChange={e => setForm(f => ({ ...f, coreQuestion: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label="What a good answer looks like">
        <TextInput rows={2}
          placeholder="e.g. If 4 out of 5 personas correctly identify the boxless product without reading the FAQ, we can proceed."
          value={form.goodAnswer || ''}
          onChange={e => setForm(f => ({ ...f, goodAnswer: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label="Insight type">
        <div style={pillRow}>
          {insightOpts.map(o => (
            <Pill key={o} label={o} selected={form.insightType === o}
              onClick={() => setForm(f => ({ ...f, insightType: o }))} />
          ))}
        </div>
      </FieldGroup>
      <div style={{ height: '1px', background: 'var(--border)', margin: '1.5rem 0' }} />
      <FieldGroup label="Feature or flow under test">
        <TextInput placeholder="e.g. Homepage revamp — new boxless product line messaging"
          value={form.feature || ''}
          onChange={e => setForm(f => ({ ...f, feature: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label="Why this, why now">
        <TextInput rows={2}
          placeholder="Strategic reason this is being tested now"
          value={form.whyNow || ''}
          onChange={e => setForm(f => ({ ...f, whyNow: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label="Primary research question">
        <TextInput rows={2}
          placeholder="RQ1: What elements of the revamped homepage do users fail to interpret as describing a boxless product?"
          value={form.primaryRQ || ''}
          onChange={e => setForm(f => ({ ...f, primaryRQ: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label="Secondary research questions">
        <TextInput rows={3}
          placeholder={"RQ2: How do different persona segments respond to the 'Easy streaming, endless entertainment' messaging?\nRQ3: What is the primary drop-off point in the homepage-to-pack-selection flow?"}
          value={form.secondaryRQs || ''}
          onChange={e => setForm(f => ({ ...f, secondaryRQs: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label="Decision this research must support">
        <TextInput rows={2}
          placeholder="e.g. Whether to proceed with the homepage launch on the scheduled date or return to design for one more sprint."
          value={form.decisionToSupport || ''}
          onChange={e => setForm(f => ({ ...f, decisionToSupport: e.target.value }))} />
      </FieldGroup>
    </>
  );
}

function StepPersonas({ form, setForm }) {
  const toggle = (code) => {
    const current = form.personas || [];
    const next = current.includes(code) ? current.filter(c => c !== code) : [...current, code];
    setForm(f => ({ ...f, personas: next }));
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
        {PERSONAS.map(p => (
          <PersonaCard key={p.code} {...p}
            selected={(form.personas || []).includes(p.code)}
            onClick={() => toggle(p.code)} />
        ))}
      </div>
      <FieldGroup label="Priority segment">
        <TextInput placeholder="e.g. Family-Centric Devotee — primary upgrade target for the boxless transition campaign"
          value={form.prioritySegment || ''}
          onChange={e => setForm(f => ({ ...f, prioritySegment: e.target.value }))} />
      </FieldGroup>
    </>
  );
}

function StepTasks({ form, setForm }) {
  const modes = ['Single-pass','Multi-turn','Exploratory'];
  const tasks = form.tasks || [
    { name: '', instruction: '', success: '' },
    { name: '', instruction: '', success: '' },
    { name: '', instruction: '', success: '' },
  ];
  const updateTask = (i, field, val) => {
    const next = tasks.map((t, idx) => idx === i ? { ...t, [field]: val } : t);
    setForm(f => ({ ...f, tasks: next }));
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1.25rem' }}>
        <FieldGroup label="Entry point">
          <TextInput placeholder="e.g. astro.com.my homepage"
            value={form.entryPoint || ''}
            onChange={e => setForm(f => ({ ...f, entryPoint: e.target.value }))} />
        </FieldGroup>
        <FieldGroup label="Session mode">
          <div style={pillRow}>
            {modes.map(m => (
              <Pill key={m} label={m} selected={form.sessionMode === m}
                onClick={() => setForm(f => ({ ...f, sessionMode: m }))} />
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label="Max turns per session">
          <TextInput placeholder="20 (recommended)"
            value={form.maxTurns || ''}
            onChange={e => setForm(f => ({ ...f, maxTurns: e.target.value }))} />
        </FieldGroup>
        <FieldGroup label="Stuck-loop threshold">
          <TextInput placeholder="3 (recommended)"
            value={form.stuckLoop || ''}
            onChange={e => setForm(f => ({ ...f, stuckLoop: e.target.value }))} />
        </FieldGroup>
      </div>

      <div style={{ height: '1px', background: 'var(--border)', margin: '0 0 1.25rem' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr', gap: '8px', marginBottom: '6px' }}>
        <div />
        {['Task name','Agent instruction','Success condition'].map(h => (
          <div key={h} style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500 }}>{h}</div>
        ))}
      </div>

      {tasks.map((task, i) => (
        <div key={i} style={taskGrid}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', textAlign: 'center', paddingTop: '0.625rem' }}>T{i + 1}</div>
          <TextInput placeholder={i === 0 ? 'Homepage orientation' : i === 1 ? 'Pack selection' : 'Add task…'}
            value={task.name} onChange={e => updateTask(i, 'name', e.target.value)} />
          <TextInput placeholder={i === 0 ? "Visit the site and tell me what you understand about how Astro works now." : i === 1 ? "Find a plan that suits your family." : ''}
            value={task.instruction} onChange={e => updateTask(i, 'instruction', e.target.value)} />
          <TextInput placeholder={i === 0 ? 'Correctly identifies boxless' : i === 1 ? 'Reaches checkout' : ''}
            value={task.success} onChange={e => updateTask(i, 'success', e.target.value)} />
        </div>
      ))}
    </>
  );
}

function StepHypotheses({ form, setForm }) {
  return (
    <>
      {form.product === 'ACM' && (
        <AutofillNotice>
          7 known pain points from the Astro.com.my product database have been pre-loaded into Known UX Risks below. Review and add any study-specific risks.
        </AutofillNotice>
      )}
      <FieldGroup label="Hypotheses to test">
        <TextInput rows={2}
          placeholder="H1: If the homepage leads with 'boxless streaming' messaging, then users will understand they do not need a set-top box without reading the FAQ."
          value={form.h1 || ''} onChange={e => setForm(f => ({ ...f, h1: e.target.value }))}
          style={{ marginBottom: '0.5rem' }} />
        <div style={{ marginTop: '0.5rem' }}>
          <TextInput rows={2}
            placeholder="H2: If pack names are shown with descriptions, then users will identify the right plan for their household without calling support."
            value={form.h2 || ''} onChange={e => setForm(f => ({ ...f, h2: e.target.value }))} />
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <TextInput rows={2} placeholder="H3: Add a hypothesis…"
            value={form.h3 || ''} onChange={e => setForm(f => ({ ...f, h3: e.target.value }))} />
        </div>
      </FieldGroup>
      <FieldGroup label="Known UX risks and pain points">
        <TextInput rows={5}
          placeholder={'From product database (Astro.com.my):\nPP1 [P0] Boxless messaging confusion\nPP2 [P1] Pack pricing complexity\nPP3 [P1] Subdomain fragmentation across 4 domains\nAdd study-specific risks below…'}
          value={form.knownRisks || ''} onChange={e => setForm(f => ({ ...f, knownRisks: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label="What must NOT be assumed">
        <TextInput rows={3}
          placeholder={'Do NOT assume users know Astro One does not require a set-top box.\nDo NOT assume users understand pack names indicate content type.\nDo NOT assume users will scroll to the FAQ.'}
          value={form.forbiddenAssumptions || ''} onChange={e => setForm(f => ({ ...f, forbiddenAssumptions: e.target.value }))} />
      </FieldGroup>
    </>
  );
}

function StepOutput({ form, setForm }) {
  const audiences = ['Product team','Design team','Engineering','Marketing','Leadership','Investors'];
  const formats   = ['JSON eval log','Markdown summary','HTML report card','DOCX research plan','Slide deck'];
  const turns     = ['Immediate','Within 24 hours','Within 48 hours','End of sprint'];
  const sevs      = ['P0 only','P1 and above','P2 and above','All findings'];

  const toggle = (field, val) => {
    const cur = form[field] || [];
    const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
    setForm(f => ({ ...f, [field]: next }));
  };

  const checklist = [
    'Product selected from database',
    'Lifecycle and design phase confirmed',
    'Artefact link or reference provided',
    'Core research question written in plain language',
    'At least two personas selected',
    'At least two task scenarios with success conditions',
    'Forbidden assumptions list populated',
    'Output format and turnaround confirmed',
  ];

  return (
    <>
      <FieldGroup label="Primary audience">
        <div style={pillRow}>
          {audiences.map(a => (
            <Pill key={a} label={a}
              selected={(form.audience || []).includes(a)}
              onClick={() => toggle('audience', a)} />
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="Required output formats">
        <div style={pillRow}>
          {formats.map(f => (
            <Pill key={f} label={f}
              selected={(form.outputFormats || []).includes(f)}
              onClick={() => toggle('outputFormats', f)} />
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="Turnaround needed">
        <div style={pillRow}>
          {turns.map(t => (
            <Pill key={t} label={t} selected={form.turnaround === t}
              onClick={() => setForm(f => ({ ...f, turnaround: t }))} />
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="Severity threshold for escalation">
        <div style={pillRow}>
          {sevs.map(s => (
            <Pill key={s} label={s} selected={form.escalation === s}
              onClick={() => setForm(f => ({ ...f, escalation: s }))} />
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="Anything else the agent should know">
        <TextInput rows={3}
          placeholder="e.g. Must complete before the board presentation on Friday. Flag any finding touching the onboarding flow."
          value={form.additionalNotes || ''} onChange={e => setForm(f => ({ ...f, additionalNotes: e.target.value }))} />
      </FieldGroup>

      <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-md)', padding: '1.1rem 1.25rem', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '0.875rem' }}>Submission checklist</div>
        {checklist.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', fontSize: '12px', color: '#4A5568' }}>
            <div style={{ width: '13px', height: '13px', border: '1px solid var(--border-md)', borderRadius: '3px', background: '#fff', flexShrink: 0 }} />
            {item}
          </div>
        ))}
      </div>
    </>
  );
}

const stepComponents = [StepProduct, StepContext, StepGoals, StepPersonas, StepTasks, StepHypotheses, StepOutput];

/* ══════════════════════════════════════════════════════
   Questionnaire Page
═══════════════════════════════════════════════════════ */
export default function Questionnaire({ goTo, draft }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(draft || {});
  const total = STEPS.length;
  const isLast = step === total - 1;
  const StepContent = stepComponents[step];

  const handleSave = () => alert('Draft saved. You can return to this later.');
  const handleSaveEdit = () => alert('Saved — you can come back and continue editing any time.');
  const handleSubmit = () => goTo('plan', form);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '780px', margin: '0 auto', width: '100%', padding: '0 1.5rem' }}>

      {/* Progress */}
      <div style={{ padding: '1.75rem 0 0' }}>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '1.5rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: '3px', flex: 1, borderRadius: '2px',
              background: i < step ? 'var(--blue)' : i === step ? 'rgba(27,79,216,.35)' : 'var(--cream)',
              cursor: i < step ? 'pointer' : 'default',
              transition: 'background .3s',
            }} onClick={() => i < step && setStep(i)} />
          ))}
        </div>

        {/* Step header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '0.35rem' }}>
              {STEPS[step].section}
            </div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '26px', color: 'var(--ink)', marginBottom: '0.3rem' }}>
              {STEPS[step].title}
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {STEPS[step].sub}
            </p>
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', flexShrink: 0, paddingTop: '0.25rem' }}>
            {step + 1} / {total}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem' }}>
        <StepContent form={form} setForm={setForm} />
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '1rem 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--paper)',
        position: 'sticky', bottom: 0,
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleSave} style={{
            padding: '0.45rem 0.9rem', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)',
            background: 'transparent', fontFamily: 'var(--sans)', fontSize: '12px', color: '#6B7280', cursor: 'pointer',
          }}>Save draft</button>
          <button onClick={handleSaveEdit} style={{
            padding: '0.45rem 0.9rem', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)',
            background: 'transparent', fontFamily: 'var(--sans)', fontSize: '12px', color: '#6B7280', cursor: 'pointer',
          }}>Save and edit later</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: '0.5rem 1.1rem', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)',
              background: 'transparent', fontFamily: 'var(--sans)', fontSize: '13px', color: '#4A5568', cursor: 'pointer',
            }}>← Back</button>
          )}
          {isLast ? (
            <button onClick={handleSubmit} style={{
              padding: '0.5rem 1.5rem', background: 'var(--teal)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}>Submit and generate plan →</button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} style={{
              padding: '0.5rem 1.25rem', background: 'var(--blue)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}>Continue →</button>
          )}
        </div>
      </div>
    </div>
  );
}
