import React from 'react';

const labels = {
  pin:           'Login',
  dashboard:     'Dashboard',
  questionnaire: 'Questionnaire',
  review:        'Review',
  plan:          'Study plan',
  running:       'Running sessions',
  results:       'Session results',
  report:        'Research report',
  history:       'Research history',
  runDetail:     'Study detail',
};

const AUTH_PAGES = new Set(['dashboard', 'questionnaire', 'review', 'plan', 'running', 'results', 'report', 'history', 'runDetail']);

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

export default function Nav({ page, goTo, isAuth, onLogout }) {
  const showHistoryLink = AUTH_PAGES.has(page) && page !== 'pin';

  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 2rem',
      height: '56px',
      borderBottom: '1px solid var(--hairline)',
      background: 'var(--canvas)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo + nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div
          onClick={() => goTo(isAuth ? 'dashboard' : 'landing')}
          style={{
            fontFamily: 'var(--sans)', fontSize: '16px', fontWeight: 600,
            color: 'var(--ink)', cursor: 'pointer', userSelect: 'none',
            letterSpacing: '-0.02em',
          }}
        >
          Synth<span style={{ color: 'var(--mute)' }}>UX</span>
        </div>

        {showHistoryLink && (
          <NavLink
            label="Research history"
            active={page === 'history' || page === 'runDetail'}
            onClick={() => goTo('history')}
          />
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Current page label */}
        {page !== 'landing' && page !== 'pin' && page !== 'dashboard' && page !== 'history' && page !== 'runDetail' && (
          <span style={{ fontSize: '13px', color: 'var(--mute)', fontWeight: 400 }}>
            {labels[page]}
          </span>
        )}

        {/* New study button — shown when authenticated and not already on questionnaire */}
        {isAuth && page !== 'questionnaire' && page !== 'landing' && page !== 'pin' && (
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

        {/* Lock / logout — shown when authenticated */}
        {isAuth && (
          <button
            onClick={onLogout}
            title="Lock workspace"
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              color: 'var(--mute)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2.5" y="6.5" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4.5 6.5V4.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            </svg>
          </button>
        )}
      </div>
    </nav>
  );
}
