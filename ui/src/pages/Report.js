import React, { useState } from 'react';
import { Tag } from '../components/UI';

const SECTIONS = [
  { id: 'summary',         label: 'Executive summary',       dot: '#1B4FD8' },
  { id: 'background',      label: 'Background & goals',      dot: '#534AB7' },
  { id: 'methodology',     label: 'Methodology',              dot: '#6B7280' },
  { id: 'findings',        label: 'Key findings & insights',  dot: '#C97B2F' },
  { id: 'recommendations', label: 'Recommendations',          dot: '#0F8A6E' },
  { id: 'appendix',        label: 'Next steps & appendix',   dot: '#9CA3AF' },
];

/* ── Shared helpers ── */
function TBtn({ label, onClick, primary }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.45rem 1rem',
      border: primary ? 'none' : '1px solid var(--border-md)',
      borderRadius: 'var(--radius-sm)',
      background: primary ? 'var(--blue)' : '#fff',
      color: primary ? '#fff' : 'var(--ink)',
      fontFamily: 'var(--sans)', fontSize: '12px', fontWeight: primary ? 500 : 400,
      cursor: 'pointer',
    }}>{label}</button>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.4rem' }}>
      {text}
    </div>
  );
}

/* Citation tag — every finding must be traceable to a source session */
function Cite({ children }) {
  return (
    <span style={{
      fontSize: '10px', color: '#9CA3AF', fontFamily: 'monospace',
      marginLeft: '0.5rem', whiteSpace: 'nowrap',
    }}>({children})</span>
  );
}

/* Shown when data is absent or insufficient to conclude */
function InsufficientData({ message }) {
  return (
    <div style={{
      padding: '0.75rem 1rem', marginBottom: '0.5rem',
      background: 'var(--cream)', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      fontSize: '12px', color: '#6B7280', fontStyle: 'italic',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      <span style={{ opacity: .5 }}>⚠</span>
      {message}
    </div>
  );
}

function frictionColor(n) { return n >= 7 ? 'var(--red)' : n >= 4 ? 'var(--amber)' : 'var(--teal)'; }
function frictionBg(n)    { return n >= 7 ? 'var(--red-lt)' : n >= 4 ? 'var(--amber-lt)' : 'var(--teal-lt)'; }

/* ══════════════════════════════════════════════════════
   Section 01 — Executive Summary
═══════════════════════════════════════════════════════ */
function Summary() {
  const Subsection = ({ title, children }) => (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: '16px', color: 'var(--ink)', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <>
      {/* Overall signal bar */}
      <div style={{
        padding: '1rem 1.5rem', marginBottom: '2rem',
        background: 'var(--red-lt)', borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(196,43,43,.2)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--red)', marginBottom: '0.2rem' }}>No Go — return to design</div>
          <div style={{ fontSize: '12px', color: '#92400E' }}>0 of 5 personas converted · 1 of 5 conditional · average friction 5.2 / 10</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '28px', color: 'var(--red)', lineHeight: 1 }}>5.2</div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>avg friction</div>
        </div>
      </div>

      {/* 1. Study Aims & Objectives */}
      <Subsection title="Study Aims & Objectives">
        <p style={{ fontSize: '13px', color: '#4A5568', lineHeight: 1.75, margin: 0 }}>
          This study was conducted to evaluate whether the revamped <strong>Astro.com.my</strong> homepage clearly communicates the Astro One boxless product proposition to prospective subscribers, and whether the pack selection page enables users to self-serve without contacting support. The study supports a go / no-go decision on the scheduled homepage launch date.
        </p>
      </Subsection>

      {/* 2. Methodology */}
      <Subsection title="Methodology">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '0.875rem' }}>
          {[
            { label: 'Method', value: 'Usability Testing' },
            { label: 'Synthetic users', value: '5 personas' },
            { label: 'Tasks', value: '2 tasks · 10 sessions' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '0.875rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.15rem' }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.65, margin: 0 }}>
          Five synthetic Malaysian consumer personas — Spontaneous Traditionalist, Progressive Influencer, Trendsetter Explorer, Family-Centric Devotee, and Routine Conservative — were run in parallel sessions. Each persona completed T1 (Homepage orientation) and T2 (Pack selection) and was scored on friction, confusion signals, trust signals, and task completion.
        </p>
      </Subsection>

      {/* 3. Key Findings */}
      <Subsection title="Key Findings">
        <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '0.875rem' }}>
          Issues are ranked by impact. Successes are marked separately. All findings are cited to the session(s) that produced them.
        </div>

        {/* Issues */}
        {[
          {
            type: 'red', label: 'Critical issue',
            text: 'The homepage "cancel anytime" claim directly contradicts the 12-month contract shown on the pack page — identified as a trust-breaking contradiction that caused immediate abandonment.',
            cite: 'Puan Rohani · T2',
          },
          {
            type: 'red', label: 'Critical issue',
            text: '"Entertainment Zero" communicates no content value. Pack name number suffixes (12, 24) were not understood as contract lengths by any persona.',
            cite: 'Hakim · T1, Syafiqah · T1, Marcus · T2, Puan Rohani · T1',
          },
          {
            type: 'amber', label: 'Significant issue',
            text: 'The channel list is gated behind a "View more" interaction. All personas who shortlisted a pack required this information before committing — none were willing to proceed without it.',
            cite: 'Hakim · T2, David · T2',
          },
          {
            type: 'amber', label: 'Significant issue',
            text: 'Two personas stated they would contact WhatsApp support rather than continue self-serving. The current design systematically routes users toward support before conversion.',
            cite: 'Hakim · T1, Puan Rohani · T2',
          },
        ].map((f, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
            padding: '0.75rem 1rem', marginBottom: '0.5rem',
            background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          }}>
            <div style={{ paddingTop: '1px', flexShrink: 0 }}><Tag label={f.label} type={f.type} /></div>
            <p style={{ fontSize: '13px', color: '#4A5568', lineHeight: 1.65, margin: 0 }}>
              {f.text}<Cite>{f.cite}</Cite>
            </p>
          </div>
        ))}

        {/* Successes */}
        <div style={{ marginTop: '0.875rem' }}>
          {[
            {
              type: 'teal', label: 'Success',
              text: 'All 5 personas correctly identified Astro.com.my as a streaming subscription service — brand category comprehension was achieved without confusion.',
              cite: 'All personas · T1',
            },
            {
              type: 'teal', label: 'Success',
              text: 'Entertainment 12 at RM39.99 was shortlisted unprompted as genuinely competitive against a current legacy bill of ~RM90/month. Price-sensitive personas can self-shortlist when pricing is transparent.',
              cite: 'David · T2',
            },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
              padding: '0.75rem 1rem', marginBottom: '0.5rem',
              background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            }}>
              <div style={{ paddingTop: '1px', flexShrink: 0 }}><Tag label={f.label} type={f.type} /></div>
              <p style={{ fontSize: '13px', color: '#4A5568', lineHeight: 1.65, margin: 0 }}>
                {f.text}<Cite>{f.cite}</Cite>
              </p>
            </div>
          ))}
        </div>
      </Subsection>

      {/* 4. Recommendations */}
      <Subsection title="Recommendations">
        {/* Severity legend */}
        <div style={{ padding: '0.875rem 1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1rem' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Severity rubric</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {[
              { tag: 'P0', type: 'red',   desc: 'Critical — blocks launch. Must be resolved before go-live.' },
              { tag: 'P1', type: 'amber', desc: 'Significant — high user impact. Resolve in the same sprint.' },
              { tag: 'P2', type: 'gray',  desc: 'Improvement — address in the next sprint or backlog.' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '12px', color: '#4A5568' }}>
                <Tag label={r.tag} type={r.type} />
                {r.desc}
              </div>
            ))}
          </div>
        </div>

        {[
          { p: 'P0', type: 'red',   text: 'Resolve the contract contradiction — align "cancel anytime" with pack page terms before launch.', cite: 'Puan Rohani · T2' },
          { p: 'P0', type: 'red',   text: 'Surface the channel list inline — remove the View more gate on all pack cards.', cite: 'Hakim · T2, David · T2' },
          { p: 'P1', type: 'amber', text: 'Rename "Entertainment Zero" to communicate content value, not absence of it.', cite: 'Hakim · T1, Syafiqah · T1, Puan Rohani · T1' },
          { p: 'P1', type: 'amber', text: 'Separate the contract duration from the pack name — surface it as a secondary label.', cite: 'Syafiqah · T2, Marcus · T2' },
          { p: 'P2', type: 'gray',  text: 'Add visible Bahasa Malaysia and local drama content signals on the pack page.', cite: 'Puan Rohani · T1, T2' },
        ].map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
            padding: '0.625rem 1rem', marginBottom: '0.4rem',
            background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          }}>
            <div style={{ paddingTop: '1px', flexShrink: 0 }}><Tag label={r.p} type={r.type} /></div>
            <div style={{ fontSize: '12px', color: '#4A5568', lineHeight: 1.6, flex: 1 }}>
              {r.text}<Cite>{r.cite}</Cite>
            </div>
          </div>
        ))}
      </Subsection>

      {/* 5. Overall Satisfaction */}
      <Subsection title="Overall Satisfaction">
        <div style={{ padding: '1rem 1.25rem', background: 'var(--cream)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '13px', color: '#4A5568', lineHeight: 1.75, margin: 0 }}>
            Overall sentiment across the five synthetic user sessions was <strong>neutral to negative</strong>. No persona expressed strong positive sentiment toward the product or the page experience. The most positive signal came from David, who found the pricing competitive and described the experience as manageable — but still would not convert without additional information. <Cite>David · T2</Cite>
          </p>
        </div>
        <p style={{ fontSize: '13px', color: '#4A5568', lineHeight: 1.75, margin: 0 }}>
          The primary driver of dissatisfaction was not the product itself but the information architecture — personas who were open to subscribing could not get the information they needed to commit. Two personas exited to seek help elsewhere rather than abandon outright, indicating residual intent that the page failed to convert. <Cite>Hakim · T1, Puan Rohani · T2</Cite>
        </p>
      </Subsection>

      <div style={{ padding: '0.75rem 1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '11px', color: '#6B7280' }}>
        All findings are drawn directly from synthetic user session data. Citations reference the persona and task that produced each signal. See Section 04 for full data and Section 06 for session log references.
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   Section 02 — Background & Goals
═══════════════════════════════════════════════════════ */
function Background() {
  const F = ({ label, value }) => (
    <div style={{ marginBottom: '1rem' }}>
      <SectionLabel text={label} />
      <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, padding: '0.625rem 0.875rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(13,17,23,.06)' }}>
        {value}
      </div>
    </div>
  );

  return (
    <>
      <F label="Product" value="Astro.com.my — Marketing and acquisition website. Primary consumer digital storefront for Astro Malaysia Holdings." />
      <F label="Feature under test" value="Homepage revamp — Astro One boxless product positioning and pack selection flow" />
      <F label="Why this, why now" value="Major brand transition from set-top box TV to streaming-first platform. The homepage is the primary conversion surface for new subscribers. Go/no-go decision on launch date required." />
      <F label="Primary research question" value="What elements of the revamped homepage do target users fail to correctly interpret as describing a boxless product experience?" />
      <F label="Secondary research questions" value={"RQ2: How do different persona segments respond to the 'Easy streaming, endless entertainment' messaging?\nRQ3: What is the primary drop-off point in the homepage-to-pack-selection flow?"} />
      <F label="Decision this study must support" value="Go / no-go on proceeding with the homepage launch on the scheduled date vs. returning to design for one more sprint." />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   Section 03 — Methodology
═══════════════════════════════════════════════════════ */
function Methodology() {
  return (
    <>
      {/* Method */}
      <div style={{ padding: '1rem 1.25rem', background: 'var(--cream)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '0.25rem' }}>Usability Testing — Synthetic Persona Sessions</div>
        <div style={{ fontSize: '12px', color: '#4A5568', lineHeight: 1.7 }}>
          Five synthetic personas from the v4 Malaysian consumer library were run in parallel sessions against two tasks on the Astro.com.my homepage and TV pack page. Sessions were scored turn by turn using the usability testing eval schema. All sessions were completed in a single pass.
        </div>
      </div>

      {/* Session config */}
      <SectionLabel text="Session configuration" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Personas', value: '5' },
          { label: 'Tasks', value: '2' },
          { label: 'Total sessions', value: '10' },
          { label: 'Mode', value: 'Single-pass' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '0.875rem', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '22px', color: 'var(--ink)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tasks */}
      <SectionLabel text="Tasks run" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '1.5rem' }}>
        <thead>
          <tr>{['ID','Task','Success condition','Abandon condition'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {[
            ['T1', 'Homepage orientation', 'Correctly identifies boxless product without reading FAQ', '3 turns without comprehension signal'],
            ['T2', 'Pack selection', 'Reaches pack page and shortlists a plan', 'Exits to WhatsApp support or abandons without shortlisting'],
          ].map(([id, name, succ, aban], i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--blue)', fontFamily: 'monospace' }}>{id}</td>
              <td style={{ padding: '0.75rem', fontWeight: 500 }}>{name}</td>
              <td style={{ padding: '0.75rem', color: 'var(--teal)', fontSize: '11px' }}>{succ}</td>
              <td style={{ padding: '0.75rem', color: 'var(--red)', fontSize: '11px' }}>{aban}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Hypotheses */}
      <SectionLabel text="Hypotheses tested" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>{['ID','Hypothesis statement'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {[
            ['H1', 'If the homepage leads with boxless streaming messaging, users will understand they do not need a set-top box without reading the FAQ.'],
            ['H2', 'If pack names are shown with descriptions, users will identify the right plan for their household without calling support.'],
          ].map(([id, stmt], i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--red)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{id}</td>
              <td style={{ padding: '0.75rem', color: '#4A5568', lineHeight: 1.6 }}>{stmt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   Section 04 — Key Findings & Insights
═══════════════════════════════════════════════════════ */
function Findings() {
  return (
    <>
      {/* H1/H2 verdict */}
      <SectionLabel text="Hypothesis verdicts" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '1.5rem' }}>
        <thead>
          <tr>{['Hypothesis','Verdict','Evidence'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {[
            {
              id: 'H1', verdict: 'Falsified', type: 'red',
              evidence: '4 of 5 personas could not identify the boxless proposition without reading the FAQ. Only David partially confirmed.',
              cite: 'Hakim · T1, Syafiqah · T1, Marcus · T1, Puan Rohani · T1',
            },
            {
              id: 'H2', verdict: 'Falsified', type: 'red',
              evidence: '5 of 5 personas could not match themselves to a pack from the name and price alone. All required the channel list, which is gated behind View more.',
              cite: 'All personas · T2',
            },
          ].map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--red)' }}>{row.id}</td>
              <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}><Tag label={row.verdict} type={row.type} /></td>
              <td style={{ padding: '0.75rem', color: '#4A5568', lineHeight: 1.6, fontSize: '12px' }}>
                {row.evidence}<Cite>{row.cite}</Cite>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Friction map */}
      <SectionLabel text="Friction map — per persona per task" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '0.5rem' }}>
        <thead>
          <tr>{['Persona', 'T1: Homepage', 'T2: TV Pack Page', 'Avg', 'Outcome'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {[
            { name: 'Hakim',       T1: 4, T2: 6, avg: 5.0, outcome: 'Abandoned', type: 'red' },
            { name: 'Syafiqah',    T1: 4, T2: 6, avg: 5.0, outcome: 'Abandoned', type: 'red' },
            { name: 'Marcus',      T1: 4, T2: 7, avg: 5.5, outcome: 'Abandoned', type: 'red' },
            { name: 'Puan Rohani', T1: 6, T2: 8, avg: 7.0, outcome: 'Abandoned', type: 'red' },
            { name: 'David',       T1: 3, T2: 4, avg: 3.5, outcome: 'Shortlisted', type: 'teal' },
          ].map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
              <td style={{ padding: '0.75rem', fontWeight: 500 }}>{row.name}</td>
              {[row.T1, row.T2, row.avg].map((n, j) => (
                <td key={j} style={{ padding: '0.75rem' }}>
                  <span style={{ display: 'inline-block', padding: '0.2rem 0.65rem', background: frictionBg(n), color: frictionColor(n), borderRadius: '5px', fontWeight: 600 }}>{n}</span>
                </td>
              ))}
              <td style={{ padding: '0.75rem' }}><Tag label={row.outcome} type={row.type} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '1.5rem' }}>
        Friction scored 0–10 per session. Average calculated across T1 and T2 for each persona. Source: 10 sessions across 5 personas.
      </div>

      {/* Task completion */}
      <SectionLabel text="Task completion rates" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { task: 'T1 — Homepage', rate: '5/5', note: 'All personas completed T1 with friction. None abandoned.', type: 'amber' },
          { task: 'T2 — TV Pack Page', rate: '0/5', note: '4 of 5 abandoned. 1 of 5 shortlisted (David). 0 converted.', type: 'red' },
        ].map((t, i) => (
          <div key={i} style={{ padding: '1rem', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '0.25rem' }}>{t.task}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '28px', color: frictionColor(i === 0 ? 4 : 7), lineHeight: 1, marginBottom: '0.25rem' }}>{t.rate}</div>
            <div style={{ fontSize: '11px', color: '#4A5568' }}>{t.note}</div>
          </div>
        ))}
      </div>

      {/* Confusion signals */}
      <SectionLabel text="Confusion signals — cited to source" />
      {[
        { signal: 'Contract contradiction: homepage says "cancel anytime" but pack page shows 12-month contract. Identified as a trust failure.', cite: 'Puan Rohani · T2', severity: 'P0', type: 'red' },
        { signal: '"Entertainment Zero" communicates nothing about content. Interpreted as a free or reduced tier by multiple personas.', cite: 'Hakim · T1, Syafiqah · T1, Puan Rohani · T1', severity: 'P0', type: 'red' },
        { signal: 'Pack number suffixes (12, 24) not explained. Personas read these as product variants, not contract length indicators.', cite: 'Syafiqah · T2, Marcus · T2', severity: 'P1', type: 'amber' },
        { signal: 'Channel list gated behind "View more". All personas who shortlisted required this information before committing.', cite: 'Hakim · T2, David · T2', severity: 'P1', type: 'amber' },
        { signal: 'No visible Bahasa Malaysia or local drama content. Family-oriented persona could not identify relevant content.', cite: 'Puan Rohani · T1, T2', severity: 'P2', type: 'gray' },
      ].map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
          padding: '0.75rem 1rem', marginBottom: '0.5rem',
          background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
        }}>
          <div style={{ paddingTop: '1px', flexShrink: 0 }}><Tag label={s.severity} type={s.type} /></div>
          <div style={{ fontSize: '12px', color: '#4A5568', lineHeight: 1.6 }}>
            {s.signal}<Cite>{s.cite}</Cite>
          </div>
        </div>
      ))}

      {/* Abandon triggers */}
      <div style={{ marginTop: '1.25rem' }}>
        <SectionLabel text="Abandon triggers — T2 only" />
        {[
          { trigger: '24-month contract on Epic 24 combined with existing brand trust deficit from Astro Fibre pause.', cite: 'Marcus · T2' },
          { trigger: 'Contract contradiction (homepage vs pack page terms) eroded trust before any pack could be evaluated.', cite: 'Puan Rohani · T2' },
          { trigger: 'No pack relevant to solo young viewer. No lite or social-first tier available.', cite: 'Syafiqah · T2' },
          { trigger: 'No local drama or BM content visible on pack page. Could not match any pack to household needs.', cite: 'Hakim · T2' },
        ].map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(13,17,23,.05)', fontSize: '12px', color: '#4A5568' }}>
            <span style={{ color: 'var(--red)', fontWeight: 600, flexShrink: 0 }}>✗</span>
            <span>{t.trigger}<Cite>{t.cite}</Cite></span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   Section 05 — Recommendations
═══════════════════════════════════════════════════════ */
function Recommendations() {
  const [generating, setGenerating] = useState(false);
  const [generated,  setGenerated]  = useState(false);

  const handlePPT = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2800);
  };

  return (
    <>
      <div style={{ fontSize: '13px', color: '#4A5568', lineHeight: 1.75, marginBottom: '1.5rem' }}>
        All recommendations below are derived directly from signals recorded in synthetic user sessions. Each item is cited to the session(s) that produced the finding. Severity is rated P0 (critical, blocks launch) to P2 (improvement, address in next sprint).
      </div>

      {[
        {
          p: 'P0', type: 'red',
          title: 'Resolve the contract contradiction across all pages',
          desc: 'The homepage states "cancel anytime." The pack page shows a 12-month contract. These messages appeared in the same session and caused immediate trust collapse. Align the terms or clearly separate the two plan types with distinct labels before launch.',
          cite: 'Puan Rohani · T2',
        },
        {
          p: 'P0', type: 'red',
          title: 'Surface the channel list inline — remove the View more gate',
          desc: 'Every persona who shortlisted a pack required the channel list before committing. Gating this behind a click creates an evaluation dead end. The channel list must be visible without interaction.',
          cite: 'Hakim · T2, David · T2',
        },
        {
          p: 'P1', type: 'amber',
          title: 'Rename "Entertainment Zero" to communicate content value',
          desc: '"Zero" was interpreted as free, reduced, or empty by multiple personas across both tasks. Rename to reflect what is included — e.g. Entertainment Flex or Astro Essentials.',
          cite: 'Hakim · T1, Syafiqah · T1, Puan Rohani · T1',
        },
        {
          p: 'P1', type: 'amber',
          title: 'Separate contract term from the pack name',
          desc: '"Entertainment 12" embeds the contract length in the product name, which was read as a product variant identifier rather than a duration. Surface the term as a secondary label.',
          cite: 'Syafiqah · T2, Marcus · T2',
        },
        {
          p: 'P2', type: 'gray',
          title: 'Surface Bahasa Malaysia and local drama content on the pack page',
          desc: 'The family-oriented persona could not identify any local content relevant to her household on either page. BM content must be visible on the pack page — not only in the content guide.',
          cite: 'Puan Rohani · T1, T2',
        },
      ].map((a, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '1rem',
          padding: '1rem 1.1rem', marginBottom: '0.625rem',
          background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
        }}>
          <div style={{ paddingTop: '1px', flexShrink: 0 }}><Tag label={a.p} type={a.type} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '0.3rem' }}>{a.title}</div>
            <div style={{ fontSize: '12px', color: '#4A5568', lineHeight: 1.6 }}>
              {a.desc}
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace', marginTop: '0.4rem' }}>Source: {a.cite}</div>
          </div>
        </div>
      ))}

      {/* Generate PPT */}
      <div style={{
        marginTop: '1.75rem', padding: '1.5rem 1.75rem',
        background: 'linear-gradient(135deg, #1B4FD8 0%, #0A2E8A 100%)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '22px', color: '#fff', marginBottom: '0.5rem' }}>
          Generate a stakeholder presentation
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.75)', marginBottom: '1.25rem', lineHeight: 1.65 }}>
          Convert this report into a PowerPoint deck — executive summary, friction map, hypothesis verdicts, cited recommendations, and next steps.
        </div>
        {!generated ? (
          <button onClick={handlePPT} disabled={generating} style={{
            padding: '0.75rem 1.75rem', background: generating ? 'rgba(255,255,255,.6)' : '#fff',
            color: 'var(--blue)', border: 'none', borderRadius: '8px',
            fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: generating ? 'default' : 'pointer',
          }}>
            {generating ? '⟳ Generating…' : 'Generate PowerPoint →'}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,.15)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}>
              ✓ Deck ready — <span style={{ fontWeight: 500 }}>Astro_Homepage_Research.pptx</span>
            </div>
            <button onClick={() => alert('Downloading…')} style={{
              padding: '0.75rem 1.25rem', background: '#fff', color: 'var(--blue)',
              border: 'none', borderRadius: '8px', fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}>↓ Download</button>
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   Section 06 — Next Steps & Appendix
═══════════════════════════════════════════════════════ */
function Appendix() {
  return (
    <>
      {/* Unanswered questions */}
      <SectionLabel text="Questions this study did not answer" />
      <div style={{ marginBottom: '1.5rem' }}>
        {[
          'Would David convert if the channel list for Entertainment 12 were visible inline and a trial period were offered?',
          'Would boxless comprehension improve if a dedicated "No box required" callout appeared above the fold rather than in the feature list?',
          'How do Malay-language-first users navigate if the Bahasa Malaysia toggle were more prominent in the hero section?',
          'Would Epic 24 convert more users if Netflix account and profile portability were explicitly confirmed on the pack page?',
          'What is the actual channel list for Entertainment 12? This was not available in the test materials and was the primary blocker for evaluation.',
        ].map((q, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(13,17,23,.05)', fontSize: '12px', color: '#4A5568', lineHeight: 1.6 }}>
            <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{i + 1}.</span>
            {q}
          </div>
        ))}
      </div>

      {/* Insufficient data flags */}
      <SectionLabel text="Metrics with insufficient data to conclude" />
      <div style={{ marginBottom: '1.5rem' }}>
        <InsufficientData message="No conversion (task_completion: completed) recorded in T2 — insufficient data to measure what a successful pack selection flow looks like for this product." />
        <InsufficientData message="Trust signal in T1 was neutral for all 5 personas — no strong positive trust signals recorded. Cannot conclude what would generate trust on the homepage from this study alone." />
      </div>

      {/* Session log references */}
      <SectionLabel text="Session log references" />
      <div style={{ padding: '1rem 1.1rem', background: 'var(--cream)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '12px', color: '#4A5568', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          All session data is stored in the run folder. Each file below corresponds to one synthetic user session. Friction scores, inner monologues, confusion signals, and turn-by-turn logs are available in full.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            ['P01_hakim.json',   'Hakim · Spontaneous Traditionalist · age 42'],
            ['P02_syafiqah.json','Syafiqah · Progressive Influencer · age 22'],
            ['P03_marcus.json',  'Marcus · Trendsetter Explorer · age 27'],
            ['P04_rohani.json',  'Puan Rohani · Family-Centric Devotee · age 47'],
            ['P05_david.json',   'David · Routine Conservative · age 38'],
          ].map(([file, desc], i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', fontSize: '12px', padding: '0.4rem 0', borderBottom: i < 4 ? '1px solid rgba(13,17,23,.05)' : 'none' }}>
              <span style={{ fontFamily: 'monospace', color: 'var(--blue)', flexShrink: 0 }}>{file}</span>
              <span style={{ color: '#6B7280' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '11px', color: '#6B7280' }}>
        Run ID: 22042026_synthetic-user-test-1 · Model: claude-sonnet-4-6 · Methodology: Usability Testing · 5 personas · 2 tasks · 10 sessions
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   Report Page
═══════════════════════════════════════════════════════ */
export default function Report({ goTo }) {
  const [active, setActive] = useState('summary');

  const current = SECTIONS.find(s => s.id === active);
  const idx     = SECTIONS.findIndex(s => s.id === active);

  const renderSection = () => {
    if (active === 'summary')         return <Summary />;
    if (active === 'background')      return <Background />;
    if (active === 'methodology')     return <Methodology />;
    if (active === 'findings')        return <Findings />;
    if (active === 'recommendations') return <Recommendations />;
    if (active === 'appendix')        return <Appendix />;
    return null;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.875rem 2rem', borderBottom: '1px solid var(--border)',
        background: 'var(--paper)', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '0.1rem' }}>Research report · Usability Testing</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--ink)' }}>
            Astro.com.my — Homepage Revamp
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <TBtn label="↓ DOCX"  onClick={() => alert('Downloading as DOCX…')} />
          <TBtn label="↓ Excel" onClick={() => alert('Downloading as Excel…')} />
          <TBtn label="↓ PDF"   onClick={() => alert('Downloading as PDF…')} />
          <TBtn label="⊞ Generate PowerPoint" onClick={() => setActive('recommendations')} primary />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '210px 1fr', overflow: 'hidden' }}>

        {/* Side nav */}
        <div style={{ padding: '1.25rem 1rem', borderRight: '1px solid var(--border)', background: 'var(--cream)', overflowY: 'auto' }}>
          {SECTIONS.map(s => (
            <div key={s.id} onClick={() => setActive(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.5rem 0.75rem', borderRadius: '7px',
              marginBottom: '2px', cursor: 'pointer',
              background: s.id === active ? '#fff' : 'transparent',
              border: s.id === active ? '1px solid var(--border)' : '1px solid transparent',
              fontSize: '13px',
              fontWeight: s.id === active ? 500 : 400,
              color: s.id === active ? 'var(--ink)' : '#6B7280',
              transition: 'all .12s',
            }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              {s.label}
            </div>
          ))}

          {/* Overall signal */}
          <div style={{ margin: '1.5rem 0 0', padding: '0.875rem', background: 'var(--red-lt)', borderRadius: '7px', border: '1px solid rgba(196,43,43,.2)' }}>
            <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--red)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '.07em' }}>Overall signal</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '16px', color: 'var(--red)' }}>No Go</div>
            <div style={{ fontSize: '11px', color: '#92400E', marginTop: '0.2rem' }}>Return to design</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem 2.25rem', overflowY: 'auto', background: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '0.4rem' }}>
            {String(idx + 1).padStart(2, '0')}
          </div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '26px', color: 'var(--ink)', marginBottom: '1.75rem' }}>
            {current?.label}
          </h2>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
