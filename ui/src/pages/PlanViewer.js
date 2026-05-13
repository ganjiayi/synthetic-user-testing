import React, { useState } from 'react';
import { PLAN_SECTIONS } from '../data/questionnaire';
import { PlanField, Tag } from '../components/UI';

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

/* ── Section content ── */
function SectionContent({ id, editable, goTo }) {
  const F = (props) => <PlanField {...props} editable={editable} />;

  if (id === 'ctx') return (
    <>
      <div style={{ background: 'linear-gradient(135deg, var(--teal) 0%, #0A5C48 100%)', borderRadius: 'var(--radius-md)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: '#fff', marginBottom: '0.25rem' }}>Plan approved — ready to run</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.75)' }}>5 personas · 3 tasks · High-fidelity artefact · Astro.com.my</div>
        </div>
        <button style={{ padding: '0.6rem 1.5rem', background: '#fff', color: 'var(--primary)', border: 'none', borderRadius: '7px', fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          onClick={() => goTo('running')}>▶  Run research</button>
      </div>
      <F label="Product lifecycle phase" value="Live — mature / optimising" />
      <F label="Design thinking phase" value="Test — validating with real designs" />
      <F label="Agent expectation signal" value="Minimal tolerance — agent treats friction as production-grade issues. All P0 and P1 signals escalated immediately." />
      <F label="Input format → API mode" value="Figma URL → url_fetch" />
      <F label="Fidelity → friction sensitivity" value="High-fidelity → high — agent flags issues with high confidence at this fidelity level" />
    </>
  );

  if (id === 'goals') return (
    <>
      <F label="Core question" value="Does the new Astro.com.my homepage clearly communicate that Astro One no longer requires a set-top box?" />
      <F label="What a good answer looks like" value="If 4 out of 5 personas correctly identify the boxless product without reading the FAQ, and friction scores stay below 4 at each step, we have sufficient signal to proceed to launch." />
      <F label="Insight type" value="Mixed — qualitative comprehension + quantitative friction scores" />
      <F label="Primary research question" value="What elements of the revamped homepage do target users fail to correctly interpret as describing a boxless product experience?" />
      <F label="Secondary research questions" value={"RQ2: How do different persona segments respond to the 'Easy streaming, endless entertainment' messaging?\nRQ3: What is the primary drop-off point in the homepage-to-pack-selection flow?"} />
      <F label="Decision to support" value="Go / no-go on proceeding with the homepage launch on the scheduled date vs. returning to design for one more sprint." />
    </>
  );

  if (id === 'personas') return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
      <thead>
        <tr>{['Persona','Context for this study','Priority','Library ref'].map(h => (
          <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {[
          ['Spontaneous Traditionalist','Likely current subscriber — key persona for boxless transition comprehension','Primary','v4_ST'],
          ['Family-Centric Devotee','Primary upgrade target — family plan decision maker for boxless transition','Primary','v4_FC'],
          ['Progressive Influencer','Already has Netflix — will compare Astro value proposition critically','Secondary','v4_PI'],
          ['Routine Conservative','High churn risk — most resistant to change in platform or pricing','Secondary','v4_RC'],
          ['Trendsetter Explorer','Digital-first — most likely to abandon to a competitor mid-flow','Optional','v4_TE'],
        ].map(([name, ctx, pri, ref], i) => (
          <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
            <td style={{ padding: '0.75rem', fontWeight: 500, color: 'var(--ink)' }}>{name}</td>
            <td style={{ padding: '0.75rem', color: 'var(--body)', lineHeight: 1.5 }}>{ctx}</td>
            <td style={{ padding: '0.75rem' }}><Tag label={pri} type={pri === 'Primary' ? 'blue' : pri === 'Secondary' ? 'gray' : 'amber'} /></td>
            <td style={{ padding: '0.75rem', color: 'var(--mute-soft)', fontFamily: 'monospace', fontSize: '11px' }}>{ref}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (id === 'tasks') return (
    <>
      <F label="Entry point" value="astro.com.my homepage" />
      <F label="Session configuration" value="Max turns: 20  ·  Stuck-loop threshold: 3  ·  Mode: single-pass" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '1rem' }}>
        <thead>
          <tr>{['#','Task','Agent instruction','Success','Abandon'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {[
            ['T1','Homepage orientation',"You've heard Astro has changed. Visit the website and tell me what you understand about how it works now.",'Correctly identifies boxless product','3 turns without comprehension signal'],
            ['T2','Pack selection','Find a plan that suits your family and tell me what you would choose.','Reaches pack page and selects a plan','Exits to WhatsApp support line'],
            ['T3','Add-on discovery','You want to add Netflix to your plan. Can you find out how much that would cost?','Identifies correct add-on price','Cannot find add-on after 5 turns'],
          ].map(([id, name, inst, succ, aban], i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--blue)', fontFamily: 'monospace' }}>{id}</td>
              <td style={{ padding: '0.75rem', fontWeight: 500 }}>{name}</td>
              <td style={{ padding: '0.75rem', color: 'var(--body)', lineHeight: 1.5 }}>{inst}</td>
              <td style={{ padding: '0.75rem', color: 'var(--primary)', fontSize: '11px' }}>{succ}</td>
              <td style={{ padding: '0.75rem', color: 'var(--red)', fontSize: '11px' }}>{aban}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  if (id === 'eval') return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '1.25rem' }}>
        <thead>
          <tr>{['Eval key','What it measures','Signal type'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {[
            ['task_completion','Did the agent reach the defined success condition?','binary'],
            ['friction_score','Aggregate friction signals per turn (0–10)','numeric'],
            ['confusion_signal','Moments of stated uncertainty or misdirected action','qualitative'],
            ['trust_signal','Expressions of distrust, hesitation, or reassurance-seeking','qualitative'],
            ['abandon_trigger','What caused the agent to exit the task early','categorical'],
            ['persona_alignment','Does agent behaviour match persona layer expectations?','scored'],
          ].map(([key, desc, type], i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
              <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '11px', fontWeight: 500 }}>{key}</td>
              <td style={{ padding: '0.75rem', color: 'var(--body)' }}>{desc}</td>
              <td style={{ padding: '0.75rem' }}><Tag label={type} type={type === 'binary' ? 'blue' : type === 'numeric' ? 'amber' : type === 'qualitative' ? 'teal' : 'gray'} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <F label="Primary metric to move" value="Task completion rate on T1 (homepage orientation) — direct proxy for boxless messaging comprehension" />
    </>
  );

  if (id === 'hypo') return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '1.5rem' }}>
        <thead>
          <tr>{['#','Hypothesis'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {[
            ['H1','If the homepage leads with boxless streaming messaging, users will understand they do not need a set-top box without reading the FAQ.'],
            ['H2','If pack names are shown with descriptions, users will identify the right plan for their household without calling support.'],
          ].map(([id, stmt], i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--red)', fontFamily: 'monospace' }}>{id}</td>
              <td style={{ padding: '0.75rem', color: 'var(--body)', lineHeight: 1.6 }}>{stmt}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.5rem' }}>Known UX risks (from product database)</div>
        <div style={{ padding: '0.875rem 1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          {[['P0','Boxless messaging confusion','red'],['P1','Pack pricing complexity','amber'],['P1','Subdomain fragmentation across 4 domains','amber'],['P2','Content carousel absorbs attention','gray']].map(([sev, desc, type], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: i < 3 ? '0.5rem' : 0 }}>
              <Tag label={sev} type={type} />
              <span style={{ fontSize: '12px', color: 'var(--body)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <F label="Forbidden assumptions" value={"Do NOT assume users know Astro One does not require a set-top box.\nDo NOT assume users understand pack names indicate content type.\nDo NOT assume users will scroll to the FAQ section."} />
    </>
  );

  if (id === 'method') return (
    <>
      <F label="Method" value="Synthetic usability testing — agentic, moderated by orchestrator, parallel persona sessions" />
      <F label="API mode" value="url_fetch — derived from Figma URL input format" />
      <F label="Session flow" value="Test config → Persona generator → Parallel agent sessions → Interaction loop → Eval aggregator → Report writer" />
      <F label="Eval approach" value="Two-layer: (1) turn-level interaction log scored per eval key; (2) second Claude call as UX analyst synthesising session across all personas" />
      <F label="Tools" value="Anthropic SDK · Node.js · runner.js · Claude Sonnet · Persona v4 library" />
      <F label="Limitations" value="Synthetic testing cannot validate real payment behaviour, emotional responses to visual design, or device-specific rendering. The Figma URL artefact does not include the checkout subdomain (shop.astro.com.my) — T2 and T3 simulate as far as pack selection only." />
    </>
  );

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.4rem' }}>Primary audience</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Tag label="Marketing" type="blue" /><Tag label="Leadership" type="blue" />
        </div>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.4rem' }}>Output formats</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Tag label="JSON eval log" type="teal" /><Tag label="Markdown summary" type="teal" /><Tag label="DOCX research plan" type="teal" />
        </div>
      </div>
      <F label="Turnaround needed" value="Within 48 hours" />
      <F label="Escalation threshold" value="P1 and above — all P0 and P1 findings must be flagged for immediate review" />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   PlanViewer Page
═══════════════════════════════════════════════════════ */
export default function PlanViewer({ goTo }) {
  const [activeSection, setActiveSection] = useState('ctx');
  const [editMode, setEditMode] = useState(false);

  const current = PLAN_SECTIONS.find(s => s.id === activeSection);

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
          <div style={{ fontSize: '11px', color: 'var(--mute-soft)', marginBottom: '0.1rem' }}>Study plan</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--ink)' }}>
            Astro.com.my — Homepage Revamp
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <TBtn label={editMode ? '✎ Editing…' : '✎ Edit'} onClick={() => setEditMode(e => !e)} />
          <TBtn label="↓ Download DOCX" onClick={() => alert('Downloading research plan as DOCX…')} />
          <TBtn label="✓ Save" onClick={() => alert('Plan saved')} />
          <TBtn label="▶  Run research" onClick={() => goTo('running')} primary />
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

          {/* Edit mode notice */}
          {editMode && (
            <div style={{ margin: '1.5rem 0 0', padding: '0.75rem', background: 'var(--blue-lt)', borderRadius: '7px', border: '1px solid rgba(27,79,216,.2)' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--blue)', marginBottom: '0.25rem' }}>Edit mode on</div>
              <div style={{ fontSize: '11px', color: 'var(--body)', lineHeight: 1.5 }}>Click any field to edit. Changes are saved locally.</div>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem 2.25rem', overflowY: 'auto', background: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '0.4rem' }}>
            Section {PLAN_SECTIONS.findIndex(s => s.id === activeSection) + 1 < 10 ? '0' : ''}{PLAN_SECTIONS.findIndex(s => s.id === activeSection) + 1}
          </div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '26px', color: 'var(--ink)', marginBottom: '1.75rem' }}>
            {current?.label}
          </h2>
          <SectionContent id={activeSection} editable={editMode} goTo={goTo} />
        </div>
      </div>
    </div>
  );
}
