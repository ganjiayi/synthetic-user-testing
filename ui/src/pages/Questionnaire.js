import React, { useState } from 'react';
import { STEPS, PRODUCTS, PERSONAS } from '../data/questionnaire';
import { SelectCard, PersonaCard, Pill, AutofillNotice, FieldGroup, TextInput, UploadZone } from '../components/UI';
import { api, generateRunId, buildIntake } from '../api';

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
      <FieldGroup label="Insight type">
        <div style={pillRow}>
          {insightOpts.map(o => (
            <Pill key={o} label={o} selected={form.insightType === o}
              onClick={() => setForm(f => ({ ...f, insightType: o }))} />
          ))}
        </div>
      </FieldGroup>
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
          placeholder={"RQ2: How do different persona segments respond to the messaging?\nRQ3: What is the primary drop-off point in the flow?"}
          value={form.secondaryRQs || ''}
          onChange={e => setForm(f => ({ ...f, secondaryRQs: e.target.value }))} />
      </FieldGroup>
      <FieldGroup label="Decision this research must support" hint="Optional">
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
  const methodologies = [
    { id: 'Usability Testing',  desc: 'Task-based — where do users get stuck or abandon?' },
    { id: 'UX Testing',         desc: 'Holistic — does the design communicate its intent?' },
    { id: 'Concept Testing',    desc: 'Reaction-based — is the concept clear and appealing?' },
    { id: 'Desirability Testing', desc: 'Impression-based — does the design resonate emotionally?' },
  ];

  const tasks = form.tasks || [
    { name: '', instruction: '' },
    { name: '', instruction: '' },
    { name: '', instruction: '' },
  ];

  const updateTask = (i, field, val) => {
    const next = tasks.map((t, idx) => idx === i ? { ...t, [field]: val } : t);
    setForm(f => ({ ...f, tasks: next }));
  };

  const addTask = () => setForm(f => ({ ...f, tasks: [...tasks, { name: '', instruction: '' }] }));

  return (
    <>
      {/* Research Methodology — single select */}
      <FieldGroup label="Research methodology" hint="Select one. This determines which eval metrics, scoring schema, and report sections are used.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.1rem' }}>
          {methodologies.map(m => (
            <div
              key={m.id}
              onClick={() => setForm(f => ({ ...f, methodology: m.id }))}
              style={{
                padding: '0.875rem 1rem',
                border: form.methodology === m.id ? '2px solid var(--blue)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: form.methodology === m.id ? 'var(--blue-lt)' : '#fff',
                cursor: 'pointer', transition: 'all .15s', userSelect: 'none',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 500, color: form.methodology === m.id ? 'var(--blue)' : 'var(--ink)', marginBottom: '0.2rem' }}>{m.id}</div>
              <div style={{ fontSize: '11px', color: 'var(--mute)', lineHeight: 1.4 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </FieldGroup>

      <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0 1.25rem' }} />

      {/* Tasks table */}
      <FieldGroup label="Tasks">
        <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr', gap: '8px', marginBottom: '6px' }}>
          {['Task', 'Top task', 'Task instruction for synthetic users'].map(h => (
            <div key={h} style={{ fontSize: '10px', color: 'var(--mute-soft)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</div>
          ))}
        </div>

        {tasks.map((task, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr', gap: '8px', marginBottom: '8px', alignItems: 'start' }}>
            <div style={{
              fontSize: '12px', fontWeight: 600, color: 'var(--blue)',
              fontFamily: 'monospace', paddingTop: '0.65rem', textAlign: 'center',
            }}>T{i + 1}</div>
            <TextInput
              placeholder={i === 0 ? 'e.g. Find warranty information' : i === 1 ? 'e.g. Compare subscription plans' : 'Type of task…'}
              value={task.name}
              onChange={e => updateTask(i, 'name', e.target.value)}
            />
            <TextInput
              placeholder={i === 0 ? 'Type task instruction here' : i === 1 ? 'Type task instruction here' : ''}
              value={task.instruction}
              onChange={e => updateTask(i, 'instruction', e.target.value)}
            />
          </div>
        ))}

        <button
          onClick={addTask}
          style={{
            marginTop: '4px', padding: '0.45rem 1rem',
            border: '1px dashed var(--border-md)', borderRadius: 'var(--radius-sm)',
            background: 'transparent', fontFamily: 'var(--sans)',
            fontSize: '12px', color: 'var(--mute)', cursor: 'pointer', width: '100%',
          }}
        >+ Add task</button>
      </FieldGroup>
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

  const models = [
    {
      id:    'claude',
      name:  'Claude (Anthropic)',
      model: 'claude-sonnet-4-6',
      note:  'Uses your Claude Code subscription — no API key needed.',
      color: '#D97706',
      bg:    '#FDF3E7',
      border:'rgba(217,119,6,.25)',
    },
    {
      id:    'openai',
      name:  'OpenAI',
      model: 'gpt-4o',
      note:  'Requires an OpenAI API key configured in the pipeline .env file.',
      color: '#10A37F',
      bg:    '#E6F5F1',
      border:'rgba(16,163,127,.25)',
    },
  ];

  const toggle = (field, val) => {
    const cur = form[field] || [];
    const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
    setForm(f => ({ ...f, [field]: next }));
  };

  return (
    <>
      {/* Model selector */}
      <FieldGroup
        label="AI model"
        hint="Select which model runs the synthetic user sessions. Both produce the same output format."
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '0.5rem' }}>
          {models.map(m => (
            <div
              key={m.id}
              onClick={() => setForm(f => ({ ...f, modelProvider: m.id }))}
              style={{
                padding: '1rem 1.1rem', cursor: 'pointer', userSelect: 'none',
                borderRadius: 'var(--radius-md)', transition: 'all .15s',
                background: form.modelProvider === m.id ? m.bg : '#fff',
                border: form.modelProvider === m.id ? `2px solid ${m.color}` : '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 500, color: form.modelProvider === m.id ? m.color : 'var(--ink)', marginBottom: '0.2rem' }}>
                {m.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--mute)', fontFamily: 'monospace', marginBottom: '0.35rem' }}>{m.model}</div>
              <div style={{ fontSize: '11px', color: 'var(--mute-soft)', lineHeight: 1.4 }}>{m.note}</div>
            </div>
          ))}
        </div>
        {!form.modelProvider && (
          <div style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '0.25rem' }}>
            ⚠ No model selected — you will be prompted when the study runs.
          </div>
        )}
      </FieldGroup>

      <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0 1.25rem' }} />

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
      <FieldGroup label="Anything else the agent should know">
        <TextInput rows={3}
          placeholder="e.g. Must complete before the board presentation on Friday. Flag any finding touching the onboarding flow."
          value={form.additionalNotes || ''} onChange={e => setForm(f => ({ ...f, additionalNotes: e.target.value }))} />
      </FieldGroup>
    </>
  );
}

const stepComponents = [StepProduct, StepContext, StepGoals, StepPersonas, StepTasks, StepHypotheses, StepOutput];

/* ══════════════════════════════════════════════════════
   Questionnaire Page
═══════════════════════════════════════════════════════ */
export default function Questionnaire({ goTo, draft }) {
  const [step,       setStep]       = useState(0);
  const [form,       setForm]       = useState(draft || {});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState('');
  const total    = STEPS.length;
  const isLast   = step === total - 1;
  const StepContent = stepComponents[step];

  const handleSave     = () => alert('Draft saved. You can return to this later.');
  const handleSaveEdit = () => alert('Saved — you can come back and continue editing any time.');

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitMsg('Checking connection…');

    const live = await api.isAvailable();

    if (!live) {
      // No backend — go straight to demo plan viewer
      setSubmitting(false);
      goTo('plan', { draft: form });
      return;
    }

    try {
      const runId  = generateRunId(form.feature || form.product || 'study');
      const intake = buildIntake(form, runId);

      setSubmitMsg('Creating study run…');
      await api.createRun(runId, intake);

      // Upload any test material files
      const filesToUpload = (form.testMaterials?.files || [])
        .filter(f => f.file instanceof File);
      if (filesToUpload.length > 0) {
        setSubmitMsg(`Uploading ${filesToUpload.length} test material${filesToUpload.length > 1 ? 's' : ''}…`);
        await api.uploadFiles(runId, filesToUpload.map(f => f.file));
      }

      setSubmitMsg('Generating research plan…');
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
      alert(`Could not generate plan: ${err.message}`);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '780px', margin: '0 auto', width: '100%', padding: '0 1.5rem' }}>

      {/* Progress */}
      <div style={{ padding: '1.75rem 0 0' }}>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '1.5rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: '3px', flex: 1, borderRadius: '2px',
              background: i < step ? 'var(--primary)' : i === step ? 'var(--hairline)' : 'var(--cream)',
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
            <p style={{ fontSize: '13px', color: 'var(--mute)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {STEPS[step].sub}
            </p>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--mute-soft)', flexShrink: 0, paddingTop: '0.25rem' }}>
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
            background: 'transparent', fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--mute)', cursor: 'pointer',
          }}>Save draft</button>
          <button onClick={handleSaveEdit} style={{
            padding: '0.45rem 0.9rem', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)',
            background: 'transparent', fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--mute)', cursor: 'pointer',
          }}>Save and edit later</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: '0.5rem 1.1rem', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)',
              background: 'transparent', fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--body)', cursor: 'pointer',
            }}>← Back</button>
          )}
          {isLast ? (
            <button onClick={handleSubmit} disabled={submitting} style={{
              padding: '0.5rem 1.5rem', background: submitting ? 'var(--mute-soft)' : 'var(--teal)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500,
              cursor: submitting ? 'default' : 'pointer',
            }}>
              {submitting ? submitMsg || 'Generating…' : 'Submit and generate plan →'}
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} style={{
              padding: '0.5rem 1.25rem', background: 'var(--primary)', color: 'var(--on-primary)',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}>Continue →</button>
          )}
        </div>
      </div>
    </div>
  );
}
