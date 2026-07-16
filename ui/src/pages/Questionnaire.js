import React, { useState } from 'react';
import { STEPS, PRODUCTS, PERSONAS } from '../data/questionnaire';
import { SelectCard, PersonaCard, Pill, AutofillNotice, FieldGroup, TextInput, UploadZone } from '../components/UI';
import { api, generateRunId, buildIntake } from '../api';

/* ── Shared style helpers ── */
const grid3   = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '1.25rem' };
const grid2   = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' };
const pillRow = { display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '1.1rem' };

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
        hint="Upload Figma JPEG exports, screenshots, documents, or standalone HTML exports — or paste a Figma prototype link, staging URL, or any live URL. Add as many files and links as needed. Tip: use only letters, numbers, dots and hyphens in filenames (e.g. Homepage.jpg not Homepage test.jpg) — spaces and special characters will be stripped."
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
      <FieldGroup label="Reason for study">
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
  const [showExamples, setShowExamples] = React.useState(false);

  const methodologies = [
    { id: 'Usability Testing',    desc: 'Task-based — where do users get stuck or abandon?' },
  ];

  // Only one methodology is offered right now — select it by default so the
  // eval metrics preview shows without requiring a click.
  React.useEffect(() => {
    if (!form.methodology) {
      setForm(f => ({ ...f, methodology: 'Usability Testing' }));
    }
  }, [form.methodology, setForm]);

  const METHODOLOGY_METRICS = {
    'Usability Testing': {
      primary: 'task_completion',
      primaryNote: 'Percentage of personas completing each task without abandoning',
      keys: ['task_completion', 'friction_score', 'confusion_signal', 'trust_signal', 'abandon_trigger', 'persona_alignment_note'],
      frictionSignals: ['hesitation on CTA', 'wrong path taken', 're-reads same content', 'support-seeking behaviour'],
    },
    'UX Testing': {
      primary: 'comprehension_signal',
      primaryNote: 'User correctly understands design intent without prompting',
      keys: ['task_completion', 'friction_score', 'comprehension_signal', 'confusion_signal', 'trust_signal', 'abandon_trigger', 'persona_alignment_note'],
      frictionSignals: ['misinterpretation of labels', 'unexpected navigation path', 'information overload', 'dead ends'],
    },
    'Concept Testing': {
      primary: 'concept_clarity',
      primaryNote: 'User articulates the core value proposition unprompted',
      keys: ['concept_clarity', 'perceived_value', 'first_impression', 'confusion_signal', 'trust_signal', 'persona_alignment_note'],
      frictionSignals: ['unclear value proposition', 'category confusion', 'feature misattribution', 'scepticism signal'],
    },
    'Desirability Testing': {
      primary: 'emotional_resonance',
      primaryNote: 'Design evokes the intended feeling for this persona segment',
      keys: ['emotional_resonance', 'aesthetic_reaction', 'brand_alignment', 'trust_signal', 'confusion_signal', 'persona_alignment_note'],
      frictionSignals: ['emotional mismatch', 'brand inconsistency', 'visual noise', 'tone-of-voice misalignment'],
    },
  };

  const SAMPLE_TASKS = {
    'Usability Testing': [
      { name: 'Find pricing',          instruction: 'You want to subscribe to a streaming plan. Find out how much it costs per month.' },
      { name: 'Compare plans',         instruction: 'You are deciding between two plans. Find what is different between them.' },
      { name: 'Subscribe',             instruction: 'You have decided on a plan. Find the subscribe button and go through the first step.' },
      { name: 'Add-on discovery',      instruction: 'You want to add Netflix to your plan. Find out how and what it costs.' },
      { name: 'Find support',          instruction: 'Your device is not working. Find out how to contact customer support.' },
      { name: 'Account settings',      instruction: 'Navigate to where you would update your billing details.' },
      { name: 'Discover content',      instruction: 'Find out what sports content is available and whether a specific match is included.' },
      { name: 'Cancel or pause',       instruction: 'You want to pause your subscription temporarily. Find out if this is possible and how.' },
      { name: 'Check contract status', instruction: 'Find out when your current contract ends and what happens after.' },
      { name: 'Upgrade plan',          instruction: 'Your household has grown. Find the right plan upgrade and start the process.' },
    ],
    'UX Testing': [
      { name: 'Homepage interpretation', instruction: 'Visit the homepage and tell me in your own words what this product is and who it is for.' },
      { name: 'Value proposition',       instruction: 'What would you say this product does differently from what you currently use?' },
      { name: 'Navigation intent',       instruction: 'Where would you go first if you wanted to find entertainment for your children?' },
      { name: 'Feature recognition',     instruction: 'Look at this screen, then tell me what the main feature being promoted is.' },
      { name: 'Trust assessment',        instruction: 'After browsing the page, do you feel confident this service is reliable? Walk me through your thinking.' },
      { name: 'Onboarding flow',         instruction: 'Start the sign-up process and tell me what you understand at each step.' },
      { name: 'Label comprehension',     instruction: 'Without clicking anything, tell me what you think the product name means.' },
      { name: 'Content hierarchy',       instruction: 'What on this page is most important according to the design? Does that match what matters to you?' },
      { name: 'Error recovery',          instruction: 'You made an error on this form. Tell me what you would do next.' },
      { name: 'Call to action',          instruction: 'What is this page asking you to do? Is it clear enough that you would do it?' },
    ],
    'Concept Testing': [
      { name: 'First impression',       instruction: 'Look at this concept for 10 seconds. Without reading carefully, what is it about?' },
      { name: 'Value clarity',          instruction: 'What problem does this concept solve? Who do you think it is designed for?' },
      { name: 'Competitive framing',    instruction: 'How is this different from your current subscription? Would it replace it?' },
      { name: 'Willingness to try',     instruction: 'Based on what you see, would you try this? What would make you more likely to?' },
      { name: 'Feature appeal',         instruction: 'Which feature shown here is most relevant to your life, and why?' },
      { name: 'Concept in one line',    instruction: 'Describe this product to a friend in one sentence. What would you say?' },
      { name: 'Price expectation',      instruction: 'Before we reveal the price, what would you expect to pay for this?' },
      { name: 'Scepticism check',       instruction: 'Is there anything about this concept that makes you hesitant or sceptical?' },
      { name: 'Audience fit',           instruction: 'Who do you think this was designed for? Are you that person?' },
      { name: 'Next step intent',       instruction: 'If this were available today, what would you do next?' },
    ],
    'Desirability Testing': [
      { name: 'Initial reaction',       instruction: 'Look at this design. What is the first feeling or word that comes to mind?' },
      { name: 'Brand impression',       instruction: 'What kind of brand does this design feel like it belongs to?' },
      { name: 'Aesthetic preference',   instruction: 'Is this something you would want on your phone by choice? Why or why not?' },
      { name: 'Tone alignment',         instruction: 'Does the tone feel right for a family streaming service? Describe what feels right or wrong.' },
      { name: 'Perceived tier',         instruction: 'Does this feel premium, mid-range, or budget? What gives you that impression?' },
      { name: 'Visual language',        instruction: 'Without reading the words, what does the colour and font choice communicate to you?' },
      { name: 'Trust through design',   instruction: 'Does this design make you trust the brand more or less? Point to what influenced that.' },
      { name: 'Brand personality',      instruction: 'If this design were a person, how would you describe their personality?' },
      { name: 'Emotional resonance',    instruction: 'Does this design make you feel anything? Describe the feeling.' },
      { name: 'Recommendation intent',  instruction: 'Would you send a screenshot of this to a friend? What would you say about it?' },
    ],
  };

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

  return (
    <>
      {/* Research Methodology — single select */}
      <FieldGroup label="Research methodology" hint="Select one. This determines which eval metrics, scoring schema, and report sections are used.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: form.methodology ? '0.75rem' : '1.1rem' }}>
          {methodologies.map(m => (
            <div
              key={m.id}
              onClick={() => { setForm(f => ({ ...f, methodology: m.id })); setShowExamples(false); }}
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

        {/* Metrics preview — shown when a methodology is selected */}
        {form.methodology && METHODOLOGY_METRICS[form.methodology] && (() => {
          const m = METHODOLOGY_METRICS[form.methodology];
          return (
            <div style={{
              border: '1px solid var(--blue-lt)',
              borderTop: '2px solid var(--blue)',
              borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              padding: '0.875rem 1rem',
              background: '#fafcff',
              marginBottom: '1.1rem',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.625rem' }}>
                Eval metrics for {form.methodology}
              </div>

              {/* Primary metric */}
              <div style={{ marginBottom: '0.625rem' }}>
                <div style={{ fontSize: '10px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.3rem' }}>Primary metric</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.625rem', background: 'var(--blue)', borderRadius: '5px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{m.primary}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--mute)', marginLeft: '0.5rem' }}>{m.primaryNote}</span>
              </div>

              {/* All eval keys */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '10px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.35rem' }}>All eval keys</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {m.keys.map(key => (
                    <span key={key} style={{
                      padding: '0.2rem 0.5rem', borderRadius: '4px',
                      background: key === m.primary ? 'rgba(27,79,216,.1)' : 'var(--cream)',
                      border: `1px solid ${key === m.primary ? 'rgba(27,79,216,.25)' : 'var(--border)'}`,
                      fontSize: '11px', fontFamily: 'monospace',
                      color: key === m.primary ? 'var(--blue)' : 'var(--body)',
                      fontWeight: key === m.primary ? 500 : 400,
                    }}>
                      {key}
                    </span>
                  ))}
                </div>
              </div>

              {/* Friction signals */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '10px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.35rem' }}>Friction signals watched</div>
                <div style={{ fontSize: '11px', color: 'var(--body)', lineHeight: 1.6 }}>
                  {m.frictionSignals.join(' · ')}
                </div>
              </div>

              {/* Example tasks toggle */}
              <button
                onClick={() => setShowExamples(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: '11px', color: 'var(--blue)', fontFamily: 'var(--sans)',
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: '10px' }}>{showExamples ? '▾' : '▸'}</span>
                {showExamples ? 'Hide example tasks' : 'See 10 example tasks for this methodology'}
              </button>

              {showExamples && SAMPLE_TASKS[form.methodology] && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--hairline)', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '10px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.5rem' }}>
                    Example tasks — {form.methodology}
                  </div>
                  {SAMPLE_TASKS[form.methodology].map((t, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '28px 130px 1fr', gap: '0.5rem',
                      alignItems: 'start', paddingBottom: '0.5rem', marginBottom: '0.5rem',
                      borderBottom: i < 9 ? '1px solid var(--hairline)' : 'none',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--blue)', fontFamily: 'monospace', paddingTop: '1px' }}>T{i + 1}</span>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.5 }}>{t.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--mute)', lineHeight: 1.5 }}>{t.instruction}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </FieldGroup>

      <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0 1.25rem' }} />

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
            }}>T{i + 1}</div>
            <TextInput
              placeholder="e.g. Home/Impression"
              value={task.name}
              onChange={e => updateTask(i, 'name', e.target.value)}
            />
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
    </>
  );
}

function StepOutput() {
  return (
    <AutofillNotice>
      This workflow runs entirely on Claude — model claude-sonnet-4-6.
    </AutofillNotice>
  );
}

const stepComponents = [StepProduct, StepContext, StepGoals, StepPersonas, StepTasks, StepOutput];

/* ══════════════════════════════════════════════════════
   Questionnaire Page
═══════════════════════════════════════════════════════ */
export default function Questionnaire({ goTo, draft }) {
  const [step,       setStep]       = useState(0);
  const [form,       setForm]       = useState(draft || {});
  const total       = STEPS.length;
  const isLast      = step === total - 1;
  const StepContent = stepComponents[step];

  const handleSave     = () => alert('Draft saved. You can return to this later.');
  const handleSaveEdit = () => alert('Saved — you can come back and continue editing any time.');
  const handleSubmit   = () => goTo('review', { draft: form });

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
            <button onClick={handleSubmit} style={{
              padding: '0.5rem 1.5rem', background: 'var(--primary)', color: 'var(--on-primary)',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
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
  );
}
