import React from 'react';

const labels = {
  landing:       'Home',
  questionnaire: 'Questionnaire',
  review:        'Review',
  plan:          'Study plan',
  running:       'Running sessions',
  results:       'Session results',
  report:        'Research report',
};

export default function Nav({ page, goTo }) {
  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 2rem',
      height: '56px',
      borderBottom: '1px solid var(--hairline)',
      background: 'var(--canvas)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div
        onClick={() => goTo('landing')}
        style={{
          fontFamily: 'var(--sans)', fontSize: '16px', fontWeight: 600,
          color: 'var(--ink)', cursor: 'pointer', userSelect: 'none',
          letterSpacing: '-0.02em',
        }}
      >
        Synth<span style={{ color: 'var(--mute)' }}>UX</span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {page !== 'landing' && (
          <span style={{ fontSize: '13px', color: 'var(--mute)', fontWeight: 400 }}>
            {labels[page]}
          </span>
        )}
        {page !== 'questionnaire' && (
          <button
            onClick={() => goTo('questionnaire')}
            style={{
              padding: '0.5rem 1.1rem',
              background: 'var(--primary)', color: 'var(--on-primary)',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', letterSpacing: '-0.01em',
            }}
          >
            Get started
          </button>
        )}
      </div>
    </nav>
  );
}
