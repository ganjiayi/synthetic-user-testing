import React from 'react';

const s = {
  nav: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.875rem 2.5rem',
    borderBottom: '1px solid rgba(13,17,23,.08)',
    background: 'var(--paper)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  logo: {
    fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--ink)',
    cursor: 'pointer', userSelect: 'none',
  },
  logoSpan: { color: 'var(--blue)' },
  right: { display: 'flex', alignItems: 'center', gap: '1rem' },
  crumb: { fontSize: '12px', color: '#6B7280' },
  cta: {
    padding: '0.4rem 1.1rem',
    background: 'var(--ink)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500,
    cursor: 'pointer',
  },
};

const labels = { landing: 'Home', questionnaire: 'Questionnaire', plan: 'Study plan' };

export default function Nav({ page, goTo }) {
  return (
    <nav style={s.nav}>
      <div style={s.logo} onClick={() => goTo('landing')}>
        Synth<span style={s.logoSpan}>UX</span>
      </div>
      <div style={s.right}>
        <span style={s.crumb}>{labels[page]}</span>
        {page !== 'questionnaire' && (
          <button style={s.cta} onClick={() => goTo('questionnaire')}>
            Get started →
          </button>
        )}
      </div>
    </nav>
  );
}
