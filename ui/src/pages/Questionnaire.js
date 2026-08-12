import React, { useState } from 'react';
import { STEPS, PRODUCTS, PERSONAS } from '../data/questionnaire';
import { SelectCard, PersonaCard, Pill, AutofillNotice, FieldGroup, TextInput, UploadZone } from '../components/UI';
import { api, generateRunId, buildIntake } from '../api';
import StepNav from '../components/StepNav';
import ProductBackgroundPanel from '../components/ProductBackgroundPanel';
import { InfoTooltip } from '../components/Tooltip';
import AgentChat from '../components/AgentChat';
import PersonaProfilePanel from '../components/PersonaProfilePanel';

/* ── Shared style helpers ── */
const grid3     = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '1.25rem' };
const pillRow   = { display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '1.1rem' };
const chatLayout = { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' };

// Hardcoded fallback so the picker/gating still work if /api/methodologies is
// unreachable — kept in sync manually with src/lib/methodology-config.js's
// ui_description/runner_type fields, which are the source of truth when the
// fetch succeeds.
const FALLBACK_METHODOLOGIES = [
  { id: 'Usability Testing', desc: 'Task-based — where do users get stuck or abandon?', runner_type: 'task_based' },
  { id: 'A/B Testing',       desc: 'Comparative — same task on two variants, then a stated preference.', runner_type: 'comparative_task_based' },
];

// Shared by every step that needs the methodology list (picker, materials
// gating, review edit-mode) so it's fetched from one place rather than
// threaded as a prop through components that get mounted independently.
function useMethodologies() {
  const [methodologies, setMethodologies] = useState(FALLBACK_METHODOLOGIES);
  React.useEffect(() => {
    let cancelled = false;
    api.getMethodologies()
      .then(({ methodologies: list }) => {
        if (!cancelled && Array.isArray(list) && list.length > 0) setMethodologies(list);
      })
      .catch(() => {}); // keep the fallback list on failure
    return () => { cancelled = true; };
  }, []);
  return methodologies;
}

// task_based and comparative_task_based methodologies need an artefact to
// navigate; other runner_types (reaction/impression-style, if reinstated
// later) would not — see src/lib/methodology-config.js's navigationRequired().
function methodologyNeedsMaterials(methodologyId, methodologies) {
  const cfg = methodologies.find(m => m.id === methodologyId);
  if (!cfg) return true; // unknown methodology — default to showing materials rather than hiding them
  return cfg.runner_type === 'task_based' || cfg.runner_type === 'comparative_task_based';
}

/* ── Shared "Approve and Continue" CTA — used on every step with an AgentChat co-pilot ── */
function ApproveContinue({ onAdvance, label = 'Approve and Continue →' }) {
  return (
    <button
      onClick={onAdvance}
      style={{
        marginTop: '0.5rem', padding: '0.55rem 1.25rem',
        background: 'var(--teal)', color: '#fff', border: 'none',
        borderRadius: 'var(--radius-sm)', fontFamily: 'var(--sans)',
        fontSize: '13px', fontWeight: 500, cursor: 'pointer',
      }}
    >{label}</button>
  );
}

/* ══════════════════════════════════════════════════════
   Step content components
═══════════════════════════════════════════════════════ */

function StepProduct({ form, setForm }) {
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
      {form.product && <ProductBackgroundPanel productId={form.product} />}
    </>
  );
}

function StepMethodology({ form, setForm }) {
  const methodologies = useMethodologies();

  // Default to Usability Testing until the researcher picks otherwise.
  React.useEffect(() => {
    if (!form.methodology) {
      setForm(f => ({ ...f, methodology: 'Usability Testing' }));
    }
  }, [form.methodology, setForm]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      {methodologies.map(m => (
        <div
          key={m.id}
          onClick={() => setForm(f => ({ ...f, methodology: m.id }))}
          style={{
            padding: '1.1rem 1.25rem',
            border: form.methodology === m.id ? '2px solid var(--blue)' : '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: form.methodology === m.id ? 'var(--blue-lt)' : '#fff',
            cursor: 'pointer', transition: 'all .15s', userSelect: 'none',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 500, color: form.methodology === m.id ? 'var(--blue)' : 'var(--ink)', marginBottom: '0.3rem' }}>{m.id}</div>
          <div style={{ fontSize: '12px', color: 'var(--mute)', lineHeight: 1.5 }}>{m.desc}</div>
        </div>
      ))}
    </div>
  );
}

function StepContext({ form, setForm }) {
  const phases    = ['Empathise','Define','Ideate','Prototype','Test','Post-launch'];
  const fidelity  = ['Wireframe','Mid-fidelity','High-fidelity','Production'];
  const methodologies = useMethodologies();
  const isAbTesting   = form.methodology === 'A/B Testing';
  const showMaterials = methodologyNeedsMaterials(form.methodology, methodologies);

  return (
    <>
      <FieldGroup label="Design thinking phase">
        <div style={pillRow}>
          {phases.map(p => (
            <Pill key={p} label={p} selected={form.designPhase === p}
              onClick={() => setForm(f => ({ ...f, designPhase: p }))} />
          ))}
        </div>
      </FieldGroup>

      <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0 1.25rem' }} />

      {showMaterials && (
        <>
          <FieldGroup
            label={<>Test materials<InfoTooltip text="Upload Figma JPEG exports, screenshots, documents, or standalone HTML exports — or paste a Figma prototype link, staging URL, or any live URL. Add as many files and links as needed. Tip: use only letters, numbers, dots and hyphens in filenames (e.g. Homepage.jpg not Homepage test.jpg) — spaces and special characters will be stripped." /></>}
          >
            <UploadZone
              value={form.testMaterials}
              onChange={v => setForm(f => ({ ...f, testMaterials: v }))}
            />
          </FieldGroup>

          {((form.testMaterials?.urls || []).length > 0 || (form.testMaterials?.files || []).some(f => /\.html?$/i.test(f.name))) && (
            <FieldGroup label="Prototype interactivity" hint="Turn this on if the linked URL or uploaded HTML file is a real, clickable prototype (e.g. a Claude Design HTML export, a Figma prototype, or a staging build) that synthetic users should navigate turn by turn. Leave off if it's just a reference link, uploaded document, or static screenshot.">
              <Pill
                label={form.isInteractivePrototype ? 'Live, clickable prototype' : 'Static reference link'}
                selected={!!form.isInteractivePrototype}
                onClick={() => setForm(f => ({ ...f, isInteractivePrototype: !f.isInteractivePrototype }))}
              />
            </FieldGroup>
          )}

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

          {isAbTesting && (
            <>
              <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0 1.25rem' }} />

              <FieldGroup
                label={<>Variant B test materials<InfoTooltip text="Upload or link the second variant being compared against Variant A (the materials above). Each task defined later is attempted on both variants before the persona states a preference." /></>}
              >
                <UploadZone
                  value={form.variantB?.testMaterials}
                  onChange={v => setForm(f => ({ ...f, variantB: { ...f.variantB, testMaterials: v } }))}
                />
              </FieldGroup>

              {((form.variantB?.testMaterials?.urls || []).length > 0 || (form.variantB?.testMaterials?.files || []).some(f => /\.html?$/i.test(f.name))) && (
                <FieldGroup label="Variant B interactivity" hint="Comparative (A/B) sessions do not yet support live, clickable prototypes for either variant — leave this off and use a static reference link, image, or description for Variant B, same as Variant A.">
                  <Pill
                    label={form.variantB?.isInteractivePrototype ? 'Live, clickable prototype (not yet supported for A/B)' : 'Static reference link'}
                    selected={!!form.variantB?.isInteractivePrototype}
                    onClick={() => setForm(f => ({ ...f, variantB: { ...f.variantB, isInteractivePrototype: !f.variantB?.isInteractivePrototype } }))}
                  />
                </FieldGroup>
              )}

              <FieldGroup label="Additional notes about Variant B">
                <TextInput rows={2}
                  placeholder="e.g. Same page but with a shorter headline and a single CTA instead of three."
                  value={form.variantB?.notes || ''}
                  onChange={e => setForm(f => ({ ...f, variantB: { ...f.variantB, notes: e.target.value } }))} />
              </FieldGroup>
            </>
          )}
        </>
      )}
    </>
  );
}

function StepGoals({ form, setForm, onAdvance }) {
  const context = {
    product:       form.product,
    designPhase:   form.designPhase,
    fidelity:      form.fidelity,
    artefactNotes: form.artefactNotes,
    primaryRQ:     form.primaryRQ,
    secondaryRQs:  form.secondaryRQs,
  };

  const applyProposal = (proposal) => {
    setForm(f => ({
      ...f,
      primaryRQ:    proposal.primary_rq ?? f.primaryRQ,
      secondaryRQs: Array.isArray(proposal.secondary_rqs) ? proposal.secondary_rqs.join('\n') : f.secondaryRQs,
    }));
  };

  return (
    <div style={chatLayout}>
      <div>
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
        <ApproveContinue onAdvance={onAdvance} />
      </div>
      <AgentChat
        agentKey="research-question"
        context={context}
        onApply={applyProposal}
        title="Research Question Crafter"
        intro="Tell me what you want to learn and I'll help turn it into a specific, testable research question — a filled draft, a partial one, or just a one-line request all work."
        placeholder="e.g. We're testing whether users understand the boxless offer…"
      />
    </div>
  );
}

function StepPersonas({ form, setForm, onAdvance }) {
  const [expanded, setExpanded] = React.useState(null);

  const toggle = (code) => {
    const current = form.personas || [];
    const next = current.includes(code) ? current.filter(c => c !== code) : [...current, code];
    setForm(f => ({ ...f, personas: next }));
    setExpanded(code);
  };

  const context = {
    product:              form.product,
    primaryRQ:            form.primaryRQ,
    secondaryRQs:         form.secondaryRQs,
    selectedPersonaCodes: form.personas || [],
    methodology:          form.methodology,
  };

  const applyProposal = (proposal) => {
    if (!Array.isArray(proposal.segments)) return;
    setForm(f => ({
      ...f,
      personas: proposal.segments.map(s => s.code),
      prioritySegment: PERSONAS.find(p => p.code === proposal.priority_segment)?.name || f.prioritySegment,
    }));
  };

  return (
    <div style={chatLayout}>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
          {PERSONAS.map(p => (
            <PersonaCard key={p.code} {...p}
              selected={(form.personas || []).includes(p.code)}
              onClick={() => toggle(p.code)} />
          ))}
        </div>
        <PersonaProfilePanel code={expanded} />
        <FieldGroup label="Priority segment">
          <TextInput placeholder="e.g. Family-Centric Devotee — primary upgrade target for the boxless transition campaign"
            value={form.prioritySegment || ''}
            onChange={e => setForm(f => ({ ...f, prioritySegment: e.target.value }))} />
        </FieldGroup>
        <ApproveContinue onAdvance={onAdvance} />
      </div>
      <AgentChat
        agentKey="persona-fit"
        context={context}
        onApply={applyProposal}
        title="Persona Fit Suggester"
        intro="I can propose which of the five personas are relevant to your research question, with a trait-based reason for each. Ready when you are."
        placeholder="e.g. Which personas fit this study best?"
      />
    </div>
  );
}

const TOP_TASK_CATEGORIES = ['Navigation', 'Discovery', 'Account', 'Payment', 'Support'];
const TASK_PRIORITIES     = ['P0', 'P1', 'P2'];

function StepTasks({ form, setForm, onAdvance }) {
  // Methodology is fixed on the earlier StepMethodology step by this point —
  // this step only reads form.methodology, never sets it.
  const isAbTesting = form.methodology === 'A/B Testing';

  const EXAMPLE_TASK = {
    name:        'Home/Impression',
    instruction: `Without clicking on anything, explore the information here and tell me:
a) What do you expect you can do with this website?
b) How would you make your decision on choosing between the TV packages and broadband speeds?
c) Which other internet service provider would you compare with?
d) What do you understand about the descriptions given?
e) Is there anything you find confusing within this page?
f) Is there any missing information you'd like to see but is not available here?
g) Are you aware of the available promotions when you subscribe to a broadband plan?`,
    whatToTest:  `1. Users' impression of what they can do with the website
2. Are users confused about the information presented?
3. What information would users like to know before purchasing?`,
  };

  const tasks = form.tasks || [
    EXAMPLE_TASK,
    { name: '', instruction: '', whatToTest: '' },
    { name: '', instruction: '', whatToTest: '' },
  ];

  const updateTask = (i, field, val) => {
    const next = tasks.map((t, idx) => idx === i ? { ...t, [field]: val } : t);
    setForm(f => ({ ...f, tasks: next }));
  };

  const addTask = () => setForm(f => ({ ...f, tasks: [...tasks, { name: '', instruction: '', whatToTest: '' }] }));

  const context = {
    product:              form.product,
    primaryRQ:            form.primaryRQ,
    secondaryRQs:         form.secondaryRQs,
    selectedPersonaCodes: form.personas || [],
    fidelity:             form.fidelity,
    methodology:          form.methodology,
    scenario:             form.scenario,
    tasks:                form.tasks || [],
    variantBProvided:     isAbTesting && (
      (form.variantB?.testMaterials?.urls || []).length > 0 ||
      (form.variantB?.testMaterials?.files || []).length > 0
    ),
  };

  const applyProposal = (proposal) => {
    setForm(f => ({
      ...f,
      scenario: proposal.scenario !== undefined ? proposal.scenario : f.scenario,
      tasks:    Array.isArray(proposal.tasks) ? proposal.tasks : f.tasks,
    }));
  };

  return (
    <div style={chatLayout}>
      <div>
        {/* Scenario */}
        <FieldGroup label="Scenario" hint="Set the situation the persona is in before they attempt the tasks below — what brought them here, what they already know, what they're trying to decide.">
          <TextInput rows={3}
            placeholder="e.g. You are a homeowner whose current broadband contract is ending soon. You've landed on this provider's website for the first time to see what they offer."
            value={form.scenario || ''}
            onChange={e => setForm(f => ({ ...f, scenario: e.target.value }))} />
        </FieldGroup>

        {/* Tasks table */}
        <FieldGroup label="Tasks">
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1.6fr 1.2fr', gap: '8px', marginBottom: '6px' }}>
            {['Task', 'Screen/Task', 'Task for User', 'What do we want to test?'].map(h => (
              <div key={h} style={{ fontSize: '10px', color: 'var(--mute-soft)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</div>
            ))}
          </div>

          {tasks.map((task, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1.6fr 1.2fr', gap: '8px', marginBottom: '8px', alignItems: 'start' }}>
              <div style={{
                fontSize: '12px', fontWeight: 600, color: 'var(--blue)',
                fontFamily: 'monospace', paddingTop: '0.65rem', textAlign: 'center',
              }}>
                T{i + 1}
                <select
                  value={task.priority || 'P1'}
                  onChange={e => updateTask(i, 'priority', e.target.value)}
                  title="Priority"
                  style={{ display: 'block', width: '100%', marginTop: '6px', fontSize: '9px', fontFamily: 'var(--sans)', fontWeight: 500, color: 'var(--mute)', border: '1px solid var(--border)', borderRadius: '3px', padding: '2px 0' }}
                >
                  {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <TextInput
                  placeholder="e.g. Home/Impression"
                  value={task.name}
                  onChange={e => updateTask(i, 'name', e.target.value)}
                />
                <select
                  value={task.topTaskCategory || ''}
                  onChange={e => updateTask(i, 'topTaskCategory', e.target.value)}
                  style={{ width: '100%', marginTop: '4px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'var(--mute)', border: '1px solid var(--border)', borderRadius: '3px', padding: '3px' }}
                >
                  <option value="">Category…</option>
                  {TOP_TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <TextInput rows={6}
                  placeholder="What should the synthetic user be asked to do on this screen?"
                  value={task.instruction}
                  onChange={e => updateTask(i, 'instruction', e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', fontSize: '11px', color: 'var(--mute)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!task.noClickConstraint}
                    onChange={e => updateTask(i, 'noClickConstraint', e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  Restrict to observation only — no clicking (scrolling still allowed)
                </label>
              </div>
              <TextInput rows={6}
                placeholder="What insight is this task meant to surface?"
                value={task.whatToTest || ''}
                onChange={e => updateTask(i, 'whatToTest', e.target.value)}
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

        <FieldGroup label="What must NOT be assumed" hint="A standalone guardrail for the agent — kept independent of any hypothesis. Agents will actively avoid making these assumptions during sessions.">
          <TextInput rows={3}
            placeholder={'Do NOT assume users know Astro One does not require a set-top box.\nDo NOT assume users understand pack names indicate content type.\nDo NOT assume users will scroll to the FAQ.'}
            value={form.forbiddenAssumptions || ''} onChange={e => setForm(f => ({ ...f, forbiddenAssumptions: e.target.value }))} />
        </FieldGroup>

        <ApproveContinue onAdvance={onAdvance} />
      </div>
      <AgentChat
        agentKey="methodology-task"
        context={context}
        onApply={applyProposal}
        title="Methodology and Task Crafter"
        intro={isAbTesting
          ? "You've selected A/B Testing — I can help craft the scenario, a hypothesis, and the task list for comparing your two variants."
          : "I can help craft the scenario and task list, and task instructions, for your selected methodology."}
        placeholder={isAbTesting ? "e.g. We're comparing the old and new pricing page headline…" : "e.g. We want two tasks: homepage, then TV pack page…"}
      />
    </div>
  );
}

/* ── Review summary helpers (moved in from the retired IntakeReview.js) ── */
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

      <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {steps.map((s, i) => {
          const isActive  = i === active;
          const isDone    = s.done;
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

/* ── Step 6 — editable summary + submit. Replaces the old StepOutput and
   absorbs what the retired IntakeReview.js page used to do. ── */
function StepReview({ form, setForm }) {
  const [editMode, setEditMode] = React.useState(false);

  const tasks     = (form.tasks || []).filter(t => t.name || t.instruction);
  const personas  = (form.personas || []).map(code => PERSONAS.find(p => p.code === code)?.name || code);
  const materials = form.testMaterials || { files: [], urls: [] };
  const isAbTesting     = form.methodology === 'A/B Testing';
  const variantBMaterials = form.variantB?.testMaterials || { files: [], urls: [] };

  if (editMode) {
    return (
      <>
        <button
          onClick={() => setEditMode(false)}
          style={{
            marginBottom: '1.25rem', padding: '0.5rem 1.1rem',
            border: 'none', borderRadius: 'var(--radius-sm)',
            background: 'var(--primary)', color: 'var(--on-primary)',
            fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}
        >Save</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <StepProduct form={form} setForm={setForm} />
          <StepMethodology form={form} setForm={setForm} />
          <StepContext form={form} setForm={setForm} />
          <StepGoals form={form} setForm={setForm} onAdvance={() => {}} />
          <StepPersonas form={form} setForm={setForm} onAdvance={() => {}} />
          <StepTasks form={form} setForm={setForm} onAdvance={() => {}} />
        </div>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setEditMode(true)}
        style={{
          marginBottom: '1.25rem', padding: '0.5rem 1.1rem',
          border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)',
          background: 'transparent', color: 'var(--body)',
          fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
        }}
      >Edit</button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <Section title="Product & context">
            <Field label="Product" value={form.product} />
            <Field label="Design phase" value={form.designPhase} />
            <Field label="Fidelity" value={form.fidelity} />
          </Section>

          <Section title="Research goals">
            <Field label="Primary research question" value={form.primaryRQ} />
            <Field label="Secondary research questions" value={form.secondaryRQs} />
          </Section>

          <Section title="Test materials">
            {materials.files.length === 0 && materials.urls.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--mute)', fontStyle: 'italic' }}>No files or links added.</div>
            ) : (
              <>
                {materials.files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', color: 'var(--body)', marginBottom: '0.4rem' }}>
                    <span style={{ opacity: .5 }}>📄</span> {f.name}
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

          {isAbTesting && (
            <Section title="Variant B test materials">
              {variantBMaterials.files.length === 0 && variantBMaterials.urls.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--mute)', fontStyle: 'italic' }}>No files or links added.</div>
              ) : (
                <>
                  {variantBMaterials.files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', color: 'var(--body)', marginBottom: '0.4rem' }}>
                      <span style={{ opacity: .5 }}>📄</span> {f.name}
                    </div>
                  ))}
                  {variantBMaterials.urls.map((u, i) => (
                    <div key={i} style={{ fontSize: '13px', color: 'var(--blue)', marginBottom: '0.3rem' }}>
                      🔗 {u.length > 60 ? u.slice(0, 58) + '…' : u}
                    </div>
                  ))}
                </>
              )}
              <Field label="Notes" value={form.variantB?.notes} />
            </Section>
          )}

          <Section title="Guardrails">
            <Field label="What must not be assumed" value={form.forbiddenAssumptions} />
          </Section>
        </div>

        <div>
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
            <Field label="Priority segment" value={form.prioritySegment} />
          </Section>

          {form.scenario && (
            <Section title="Scenario">
              <div style={{ fontSize: '13px', color: 'var(--body)', lineHeight: 1.6 }}>{form.scenario}</div>
            </Section>
          )}

          <Section title="Tasks">
            {tasks.length === 0
              ? <div style={{ fontSize: '13px', color: 'var(--mute)', fontStyle: 'italic' }}>No tasks defined.</div>
              : tasks.map((t, i) => (
                <div key={i} style={{ marginBottom: '0.875rem', padding: '0.75rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--blue)', fontFamily: 'monospace' }}>T{i + 1}</span>
                    {t.priority && <span style={{ fontSize: '10px', color: 'var(--mute)' }}>{t.priority}</span>}
                    {t.topTaskCategory && <span style={{ fontSize: '10px', color: 'var(--mute-soft)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.topTaskCategory}</span>}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.15rem' }}>{t.name || '—'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--body)', whiteSpace: 'pre-line', marginBottom: t.whatToTest ? '0.4rem' : 0 }}>{t.instruction || '—'}</div>
                  {t.whatToTest && (
                    <div style={{ fontSize: '11px', color: 'var(--mute)', whiteSpace: 'pre-line' }}>
                      <span style={{ fontWeight: 500 }}>Testing: </span>{t.whatToTest}
                    </div>
                  )}
                </div>
              ))
            }
          </Section>

          <Section title="Output">
            <Field label="AI model" value="Claude — claude-sonnet-4-6" />
          </Section>
        </div>
      </div>
    </>
  );
}

const stepComponents = [StepProduct, StepMethodology, StepContext, StepGoals, StepPersonas, StepTasks, StepReview];

/* ══════════════════════════════════════════════════════
   Questionnaire Page
═══════════════════════════════════════════════════════ */
export default function Questionnaire({ goTo, draft }) {
  const [step,        setStep]        = useState(0);
  const [form,        setForm]        = useState(draft || {});
  const [loadingStep, setLoadingStep] = useState(-1); // -1 = not loading
  const total       = STEPS.length;
  const isLast      = step === total - 1;
  const isLoading   = loadingStep >= 0;
  const StepContent = stepComponents[step];

  const handleSave     = () => alert('Draft saved. You can return to this later.');
  const handleSaveEdit = () => alert('Saved — you can come back and continue editing any time.');
  const advanceStep    = () => setStep(s => Math.min(s + 1, total - 1));

  // Moved in from the retired IntakeReview.js's handleConfirm — Step 6's
  // "Review and confirm" now submits directly instead of navigating to a
  // separate review page.
  const handleSubmit = async () => {
    setLoadingStep(0);
    try {
      const runId  = generateRunId(form.feature || form.product || 'study');
      const intake = buildIntake(form, runId);

      await api.createRun(runId, intake);
      setLoadingStep(1);

      const filesToUpload = [
        ...(form.testMaterials?.files || []),
        ...(form.variantB?.testMaterials?.files || []),
      ].filter(f => f.file instanceof File);
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
    <div style={{ flex: 1, display: 'flex', maxWidth: '1120px', margin: '0 auto', width: '100%', padding: '1.75rem 1.5rem 0' }}>

      {isLoading && <PlanLoadingScreen step={loadingStep} />}

      <StepNav steps={STEPS} current={step} onJump={setStep} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

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

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem' }}>
          <StepContent form={form} setForm={setForm} onAdvance={advanceStep} />
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
              <button onClick={() => setStep(s => s - 1)} disabled={isLoading} style={{
                padding: '0.5rem 1.1rem', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)',
                background: 'transparent', fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--body)',
                cursor: isLoading ? 'default' : 'pointer',
              }}>← Back</button>
            )}
            {isLast ? (
              <button onClick={handleSubmit} disabled={isLoading} style={{
                padding: '0.5rem 1.5rem', background: isLoading ? 'var(--mute-soft)' : 'var(--primary)', color: 'var(--on-primary)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: isLoading ? 'default' : 'pointer',
              }}>
                Review and confirm →
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
    </div>
  );
}
