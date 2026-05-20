import React from 'react';

const STEPS = [
  {
    num: '01',
    title: 'Fill in the research questionnaire',
    desc: 'Select your product, define goals, choose personas, and describe tasks. Takes about 10 minutes.',
    bg: '#7a3dff',
    color: '#fff',
  },
  {
    num: '02',
    title: 'Check the generated plan',
    desc: 'Review, edit, and approve the AI-generated study plan before any sessions run.',
    bg: '#3b89ff',
    color: '#fff',
  },
  {
    num: '03',
    title: 'Run research',
    desc: 'Synthetic agents simulate each persona and return scored findings within minutes.',
    bg: '#080808',
    color: '#fff',
  },
];

export default function Landing({ goTo }) {
  return (
    <main style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      flex: 1,
      minHeight: 'calc(100vh - 56px)',
    }}>

      {/* ── Left — hero ── */}
      <div style={{
        padding: '5rem 3.5rem 4rem 4rem',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        borderRight: '1px solid var(--hairline)',
      }}>

        {/* Eyebrow */}
        <div style={{
          fontSize: '12px', fontWeight: 500, letterSpacing: '1.5px',
          color: 'var(--mute)', textTransform: 'uppercase',
          marginBottom: '1.5rem',
        }}>
          Synthetic UX Research Platform
        </div>

        {/* Hero headline */}
        <h1 style={{
          fontFamily: 'var(--sans)',
          fontSize: '52px', fontWeight: 600,
          lineHeight: 1.05, letterSpacing: '-0.03em',
          color: 'var(--ink)',
          marginBottom: '1.5rem', maxWidth: '460px',
        }}>
          Ready to see what users think?
        </h1>

        <p style={{
          fontSize: '16px', lineHeight: 1.75,
          color: 'var(--body)', maxWidth: '380px',
          marginBottom: '2.5rem', fontWeight: 400,
          letterSpacing: '-0.01em',
        }}>
          Generate a complete research study plan, run synthetic persona sessions,
          and get actionable findings — without scheduling a single participant.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Primary CTA — near-black */}
          <button
            onClick={() => goTo('pin')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--primary)', color: 'var(--on-primary)',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--sans)', fontSize: '15px', fontWeight: 500,
              cursor: 'pointer', letterSpacing: '-0.01em',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            Login →
          </button>

          {/* Secondary CTA — outline */}
          <button
            onClick={() => goTo('plan')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'var(--canvas)', color: 'var(--ink)',
              border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--sans)', fontSize: '15px', fontWeight: 400,
              cursor: 'pointer', letterSpacing: '-0.01em',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--cream)'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--canvas)'}
          >
            View sample plan
          </button>
        </div>
      </div>

      {/* ── Right — how it works ── */}
      <div style={{
        background: 'var(--cream)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '3rem',
        gap: '12px',
      }}>

        {/* Section eyebrow */}
        <div style={{
          fontSize: '12px', fontWeight: 500,
          color: 'var(--mute)', textTransform: 'uppercase',
          letterSpacing: '1px', marginBottom: '4px',
        }}>
          How it works
        </div>

        {/* Category cards */}
        {STEPS.map((step, i) => (
          <div
            key={i}
            style={{
              background: step.bg,
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              position: 'relative',
              boxShadow: i === 2 ? 'var(--shadow-md)' : 'none',
            }}
          >
            <div style={{
              fontSize: '32px', fontWeight: 600,
              color: 'rgba(255,255,255,0.25)',
              lineHeight: 1, marginBottom: '0.625rem',
              letterSpacing: '-0.03em',
              fontFamily: 'var(--sans)',
            }}>
              {step.num}
            </div>
            <div style={{
              fontSize: '14px', fontWeight: 500,
              color: step.color, marginBottom: '0.3rem',
              letterSpacing: '-0.01em',
            }}>
              {step.title}
            </div>
            <div style={{
              fontSize: '13px', color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.6,
            }}>
              {step.desc}
            </div>
            <div style={{
              position: 'absolute', right: '1.25rem', top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.5)', fontSize: '18px',
            }}>
              →
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
