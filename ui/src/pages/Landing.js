import React from 'react';

const steps = [
  { num: '01', title: 'Fill in the research questionnaire', desc: 'Select your product, define goals, choose personas, and describe tasks. Takes about 10 minutes.' },
  { num: '02', title: 'Check the generated plan', desc: 'Review, edit, and approve the AI-generated study plan before any sessions run.' },
  { num: '03', title: 'Run research', desc: 'Synthetic agents simulate each persona and return scored findings within minutes.', accent: true },
];

export default function Landing({ goTo }) {
  return (
    <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, minHeight: 'calc(100vh - 57px)' }}>

      {/* ── Left ── */}
      <div style={{
        padding: '5rem 3rem 4rem 3.5rem',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-80px', left: '-100px',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(27,79,216,.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '.12em', color: 'var(--blue)', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
          Synthetic UX Research Platform
        </div>

        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '52px', lineHeight: 1.1, color: 'var(--ink)', marginBottom: '1.25rem', maxWidth: '480px' }}>
          Ready to see what{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--blue)' }}>users think?</em>
        </h1>

        <p style={{ fontSize: '16px', lineHeight: 1.75, color: '#4A5568', maxWidth: '380px', marginBottom: '2.5rem' }}>
          Generate a complete research study plan, run synthetic persona sessions,
          and get actionable findings — without scheduling a single participant.
        </p>

        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
          <button
            onClick={() => goTo('questionnaire')}
            style={{
              padding: '0.875rem 2rem',
              background: 'var(--blue)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--sans)', fontSize: '15px', fontWeight: 500,
              cursor: 'pointer', transition: 'background .15s',
            }}
            onMouseOver={e => e.target.style.background='#1640B0'}
            onMouseOut={e => e.target.style.background='var(--blue)'}
          >
            Get started →
          </button>
          <button
            onClick={() => goTo('plan')}
            style={{
              padding: '0.875rem 1.5rem',
              background: 'transparent', color: 'var(--ink)',
              border: '1px solid var(--border-md)', borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--sans)', fontSize: '15px',
              cursor: 'pointer', transition: 'background .15s',
            }}
            onMouseOver={e => e.target.style.background='var(--cream)'}
            onMouseOut={e => e.target.style.background='transparent'}
          >
            View sample plan
          </button>
        </div>
      </div>

      {/* ── Right ── */}
      <div style={{
        background: 'var(--cream)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '3rem 3rem 3rem 2.5rem', gap: '1rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 28px, rgba(13,17,23,.022) 28px, rgba(13,17,23,.022) 29px)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, fontSize: '11px', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.25rem' }}>
          How it works
        </div>

        {steps.map((step, i) => (
          <div key={i} style={{
            background: '#fff',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            border: step.accent ? '1px solid rgba(15,138,110,.25)' : '1px solid var(--border)',
            position: 'relative', zIndex: 1,
          }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '32px', color: step.accent ? 'var(--teal-lt)' : 'var(--cream)', lineHeight: 1, marginBottom: '0.5rem' }}>
              {step.num}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>
              {step.title}
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>
              {step.desc}
            </div>
            <div style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: step.accent ? 'var(--teal)' : 'var(--blue)', fontSize: '18px' }}>
              →
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
