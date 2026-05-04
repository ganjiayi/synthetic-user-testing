import React, { useState } from 'react';
import { Tag } from '../components/UI';

const SECTIONS = [
  { id: 'summary',  label: 'Executive summary',   dot: '#1B4FD8' },
  { id: 'verdict',  label: 'H1 verdict',           dot: '#C42B2B' },
  { id: 'friction', label: 'Friction map',          dot: '#C97B2F' },
  { id: 'personas', label: 'Persona findings',      dot: '#534AB7' },
  { id: 'actions',  label: 'Recommended actions',   dot: '#0F8A6E' },
];

/* ── Toolbar button ── */
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

function frictionColor(n) {
  return n >= 7 ? 'var(--red)' : n >= 4 ? 'var(--amber)' : 'var(--teal)';
}
function frictionBg(n) {
  return n >= 7 ? 'var(--red-lt)' : n >= 4 ? 'var(--amber-lt)' : 'var(--teal-lt)';
}

/* ── Executive Summary ── */
function Summary() {
  return (
    <>
      <div style={{
        padding: '1.25rem 1.5rem', marginBottom: '1.75rem',
        background: 'var(--red-lt)', borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(196,43,43,.2)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--red)', marginBottom: '0.25rem' }}>
            No Go — return to design
          </div>
          <div style={{ fontSize: '12px', color: '#92400E' }}>
            0/5 converted · 1/5 conditional · avg friction 5.2 / 10
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '32px', color: 'var(--red)', lineHeight: 1 }}>5.2</div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>avg friction</div>
        </div>
      </div>

      {[
        { label: 'Critical',        type: 'red',   text: 'Homepage "cancel anytime" messaging directly contradicts the 12-month contract on the pack page. Puan Rohani identified this contradiction immediately, triggering trust collapse and abandonment.' },
        { label: 'High friction',   type: 'amber', text: '"Entertainment Zero" and pack name number suffixes (12, 24) are opaque to all personas. No persona predicted pack content from the name alone — all required the hidden channel list.' },
        { label: 'Near-conversion', type: 'teal',  text: 'David (Routine Conservative) shortlisted Entertainment 12 at RM39.99 — the only near-conversion. Making the channel list visible inline and offering a trial period would likely convert him.' },
        { label: 'Support cost',    type: 'blue',  text: 'Puan Rohani and Hakim both indicated they would contact WhatsApp support rather than self-serve. Current page design systematically drives support volume.' },
      ].map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
          padding: '0.875rem 1rem', marginBottom: '0.625rem',
          background: '#fff', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ paddingTop: '1px', flexShrink: 0 }}><Tag label={f.label} type={f.type} /></div>
          <p style={{ fontSize: '13px', color: '#4A5568', lineHeight: 1.65, margin: 0 }}>{f.text}</p>
        </div>
      ))}
    </>
  );
}

/* ── H1 Verdict ── */
function Verdict() {
  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '1.5rem' }}>
        <thead>
          <tr>{['Hypothesis', 'Verdict', 'Evidence'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {[
            {
              hyp: 'H1: Homepage boxless messaging enables comprehension without reading FAQ',
              verdict: 'Falsified (4/5)', type: 'red',
              evidence: 'Only David partially confirmed. Hakim, Syafiqah, Marcus, and Puan Rohani all required FAQ or external confirmation to understand the boxless proposition.',
            },
            {
              hyp: 'H2: Pack names enable self-service selection without support',
              verdict: 'Falsified (5/5)', type: 'red',
              evidence: 'No persona matched themselves to a pack from name and price alone. All required the channel list, which is gated behind "View more".',
            },
          ].map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
              <td style={{ padding: '0.875rem 0.75rem', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.5 }}>{row.hyp}</td>
              <td style={{ padding: '0.875rem 0.75rem', whiteSpace: 'nowrap' }}>
                <Tag label={row.verdict} type={row.type} />
              </td>
              <td style={{ padding: '0.875rem 0.75rem', color: '#4A5568', lineHeight: 1.6 }}>{row.evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ── Friction Map ── */
function FrictionMap() {
  const rows = [
    { persona: 'Hakim',       T1: 4, T2: 6, avg: 5.0, signal: 'no_go' },
    { persona: 'Syafiqah',    T1: 4, T2: 6, avg: 5.0, signal: 'no_go' },
    { persona: 'Marcus',      T1: 4, T2: 7, avg: 5.5, signal: 'no_go' },
    { persona: 'Puan Rohani', T1: 6, T2: 8, avg: 7.0, signal: 'no_go' },
    { persona: 'David',       T1: 3, T2: 4, avg: 3.5, signal: 'conditional' },
  ];

  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '1.5rem' }}>
        <thead>
          <tr>{['Persona', 'T1: Homepage', 'T2: TV Pack Page', 'Avg', 'Signal'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '10px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(13,17,23,.04)' }}>
              <td style={{ padding: '0.75rem', fontWeight: 500 }}>{row.persona}</td>
              {[row.T1, row.T2, row.avg].map((score, j) => (
                <td key={j} style={{ padding: '0.75rem' }}>
                  <span style={{
                    display: 'inline-block', padding: '0.2rem 0.65rem',
                    background: frictionBg(score), color: frictionColor(score),
                    borderRadius: '5px', fontWeight: 600, fontSize: '12px',
                  }}>{score}</span>
                </td>
              ))}
              <td style={{ padding: '0.75rem' }}>
                <Tag label={row.signal === 'no_go' ? 'No Go' : 'Conditional'} type={row.signal === 'no_go' ? 'red' : 'amber'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ padding: '1rem 1.1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '10px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.6rem' }}>Top friction themes across all sessions</div>
        {[
          ['P0', 'Contract contradiction: homepage vs pack page terms',         'red'],
          ['P0', 'Boxless messaging not comprehensible without FAQ',             'red'],
          ['P1', '"Entertainment Zero" and pack number suffix naming opaque',   'amber'],
          ['P1', 'Channel list hidden behind View more on all packs',           'amber'],
          ['P2', 'No Bahasa Malaysia or local drama content visible',           'gray'],
        ].map(([sev, text, type], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: i < 4 ? '0.5rem' : 0 }}>
            <Tag label={sev} type={type} />
            <span style={{ fontSize: '12px', color: '#4A5568' }}>{text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Persona Findings ── */
function PersonaFindings() {
  const [active, setActive] = useState('P01');

  const findings = {
    P01: {
      name: 'Hakim', arch: 'Spontaneous Traditionalist', signal: 'no_go',
      text: 'Hakim understood the product category but was blocked by his inability to confirm the boxless setup from the homepage alone. He navigated methodically and read all visible text, but the "No box required" claim in the feature bullets did not register as a definitive answer to his central question. He would have called the WhatsApp line before converting. The "Entertainment Zero" name caused confusion — he interpreted "Zero" as a reduced or free tier. Trust was neutral throughout; no red flags, but no strong reasons to commit.',
    },
    P02: {
      name: 'Syafiqah', arch: 'Progressive Influencer', signal: 'no_go',
      text: 'Syafiqah disengaged early because no pack matched her profile. She is a solo young viewer who wants K-drama and creator-relevant content — none of which was surfaced on either page. The pack naming (Entertainment 12, Sports 12) was opaque to her. She identified Epic 24 as the only potentially interesting option but rejected it on contract length. She described the page as "designed for parents, not for me." She would crowdsource opinions via TikTok before returning.',
    },
    P03: {
      name: 'Marcus', arch: 'Trendsetter Explorer', signal: 'no_go',
      text: 'Marcus is the most analytically rigorous evaluator. He immediately benchmarked Astro pricing against his current Netflix (RM54.90) + Disney+ (RM29.90) spend. Epic 24 at RM159.99 failed the cost test — it costs more than his current stack and adds a 24-month lock-in. His pre-existing brand distrust (Astro Fibre rollout pause) amplified his resistance to any long-term commitment. He noted that "Still unsure?" appearing twice on the homepage read as low product confidence from the team itself.',
    },
    P04: {
      name: 'Puan Rohani', arch: 'Family-Centric Devotee', signal: 'no_go',
      text: 'Highest friction of all personas (avg 7.0). The contract contradiction between the homepage ("cancel anytime") and the pack page (12-month contract) was a critical trust failure. She also found no visible Bahasa Malaysia or local drama content. The 2-device limit on the homepage was noticed early and already felt inadequate for a family household. She would not decide without her husband and would escalate to WhatsApp customer service — representing a high support cost risk for this segment.',
    },
    P05: {
      name: 'David', arch: 'Routine Conservative', signal: 'conditional',
      text: 'David is the strongest near-conversion signal. Entertainment 12 at RM39.99 was genuinely competitive against his current Astro legacy bill (~RM90/month), and the monthly billing structure matched his preference for predictable costs. He shortlisted the pack but required the channel list to be visible before committing, and explicitly said he needed 48 hours to consider. The Netflix bundling question on Epic 24 — specifically whether his existing profile and watchlist would carry over — is a real and specific blocker for that tier.',
    },
  };

  const personaList = [
    { id: 'P01', name: 'Hakim' },
    { id: 'P02', name: 'Syafiqah' },
    { id: 'P03', name: 'Marcus' },
    { id: 'P04', name: 'Puan Rohani' },
    { id: 'P05', name: 'David' },
  ];

  const f = findings[active];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1.25rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {personaList.map(p => (
          <div
            key={p.id}
            onClick={() => setActive(p.id)}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '7px', cursor: 'pointer',
              fontSize: '13px',
              background: active === p.id ? '#fff' : 'transparent',
              border: active === p.id ? '1px solid var(--border)' : '1px solid transparent',
              fontWeight: active === p.id ? 500 : 400,
              color: active === p.id ? 'var(--ink)' : '#6B7280',
              transition: 'all .12s',
            }}
          >{p.name}</div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--ink)' }}>{f.name}</span>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>{f.arch}</span>
          <Tag label={f.signal === 'no_go' ? 'No Go' : 'Conditional'} type={f.signal === 'no_go' ? 'red' : 'amber'} />
        </div>
        <p style={{ fontSize: '13px', color: '#4A5568', lineHeight: 1.8, margin: 0 }}>{f.text}</p>
      </div>
    </div>
  );
}

/* ── Recommended Actions ── */
function Actions() {
  const [generating, setGenerating] = useState(false);
  const [generated,  setGenerated]  = useState(false);

  const handlePPT = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2800);
  };

  return (
    <>
      <p style={{ fontSize: '13px', color: '#4A5568', lineHeight: 1.75, marginBottom: '1.5rem' }}>
        Based on research findings, the following changes are recommended before the homepage launch proceeds. All P0 items must be resolved; P1 items should be addressed in the same sprint.
      </p>

      {[
        { p: 'P0',  type: 'red',   title: 'Resolve contract contradiction',         desc: 'Align messaging across all pages. If "cancel anytime" is the positioning, remove the 12-month contract from the pack page — or clearly separate the two plan types with distinct labels.' },
        { p: 'P0',  type: 'red',   title: 'Surface channel list without clicks',     desc: 'The channel list must be visible inline, not behind "View more". This is the single biggest conversion blocker identified across all five personas.' },
        { p: 'P1',  type: 'amber', title: 'Rename "Entertainment Zero"',             desc: 'The name communicates nothing about content value. Rename to reflect what is included — e.g. "Entertainment Flex" or "Astro Essentials".' },
        { p: 'P1',  type: 'amber', title: 'Separate pack contract term from name',   desc: '"Entertainment 12" embeds the contract length in the product name. Surface the term as a secondary label (e.g. "12-month plan"), not as part of the product name.' },
        { p: 'P2',  type: 'gray',  title: 'Add Bahasa Malaysia content signals',     desc: 'Puan Rohani could not identify any local drama content. BM and local content must be surfaced on the pack page, not buried in the content guide.' },
      ].map((a, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '1rem',
          padding: '1rem 1.1rem', marginBottom: '0.625rem',
          background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
        }}>
          <div style={{ paddingTop: '1px', flexShrink: 0 }}><Tag label={a.p} type={a.type} /></div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '0.25rem' }}>{a.title}</div>
            <div style={{ fontSize: '12px', color: '#4A5568', lineHeight: 1.6 }}>{a.desc}</div>
          </div>
        </div>
      ))}

      {/* PowerPoint CTA */}
      <div style={{
        marginTop: '1.75rem', padding: '1.5rem 1.75rem',
        background: 'linear-gradient(135deg, #1B4FD8 0%, #0A2E8A 100%)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '22px', color: '#fff', marginBottom: '0.5rem' }}>
          Generate a stakeholder presentation
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.75)', marginBottom: '1.25rem', lineHeight: 1.65 }}>
          Convert this report into a PowerPoint deck — executive summary, friction map, H1 verdict, persona cards, and recommended actions. Ready to present.
        </div>

        {!generated ? (
          <button
            onClick={handlePPT}
            disabled={generating}
            style={{
              padding: '0.75rem 1.75rem',
              background: generating ? 'rgba(255,255,255,.6)' : '#fff',
              color: 'var(--blue)', border: 'none', borderRadius: '8px',
              fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500,
              cursor: generating ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            {generating
              ? <><span style={{ animation: 'synthux-pulse 1.4s infinite', display: 'inline-block' }}>⟳</span> Generating…</>
              : 'Generate PowerPoint →'}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,.15)',
              borderRadius: '8px', color: '#fff', fontSize: '13px',
            }}>
              ✓ Deck ready — <span style={{ fontWeight: 500 }}>Astro_Homepage_Research.pptx</span>
            </div>
            <button
              onClick={() => alert('Downloading PowerPoint…')}
              style={{
                padding: '0.75rem 1.25rem', background: '#fff', color: 'var(--blue)',
                border: 'none', borderRadius: '8px',
                fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}
            >↓ Download</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes synthux-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
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
    if (active === 'summary')  return <Summary />;
    if (active === 'verdict')  return <Verdict />;
    if (active === 'friction') return <FrictionMap />;
    if (active === 'personas') return <PersonaFindings />;
    if (active === 'actions')  return <Actions />;
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
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '0.1rem' }}>Research report</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--ink)' }}>
            Astro.com.my — Homepage Revamp
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <TBtn label="↓ DOCX"  onClick={() => alert('Downloading as DOCX…')} />
          <TBtn label="↓ Excel" onClick={() => alert('Downloading as Excel…')} />
          <TBtn label="↓ PDF"   onClick={() => alert('Downloading as PDF…')} />
          <TBtn label="⊞ Generate PowerPoint" onClick={() => setActive('actions')} primary />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '210px 1fr', overflow: 'hidden' }}>

        {/* Side nav */}
        <div style={{ padding: '1.25rem 1rem', borderRight: '1px solid var(--border)', background: 'var(--cream)', overflowY: 'auto' }}>
          {SECTIONS.map(s => (
            <div
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.75rem', borderRadius: '7px',
                marginBottom: '2px', cursor: 'pointer',
                background: s.id === active ? '#fff' : 'transparent',
                border: s.id === active ? '1px solid var(--border)' : '1px solid transparent',
                fontSize: '13px',
                fontWeight: s.id === active ? 500 : 400,
                color: s.id === active ? 'var(--ink)' : '#6B7280',
                transition: 'all .12s',
              }}
            >
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

        {/* Content area */}
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
