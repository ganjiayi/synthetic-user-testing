import React from 'react';

const labels = {
  landing:       'Home',
  questionnaire: 'Questionnaire',
  review:        'Review',
  plan:          'Study plan',
  running:       'Running sessions',
  results:       'Session results',
  report:        'Research report',
  history:       'Research history',
  runDetail:     'Study detail',
};

function NavLink({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--sans)', fontSize: '13px',
        color: active ? 'var(--ink)' : 'var(--mute)',
        fontWeight: active ? 500 : 400,
        padding: '0.25rem 0',
        borderBottom: active ? '1.5px solid var(--ink)' : '1.5px solid transparent',
        letterSpacing: '-0.01em',
      }}
    >
      {label}
    </button>
  );
}

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
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

        <NavLink
          label="Research history"
          active={page === 'history' || page === 'runDetail'}
          onClick={() => goTo('history')}
        />
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {page !== 'landing' && page !== 'history' && page !== 'runDetail' && (
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
            New study
          </button>
        )}
      </div>
    </nav>
  );
}
