import React, { useRef, useState } from 'react';

const CORRECT_PIN = process.env.REACT_APP_DASHBOARD_PIN || '123456';

export default function PinPage({ goTo, onAuth }) {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [error,  setError]  = useState(false);
  const inputRefs = useRef([]);

  function handleChange(i, e) {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    if (!val) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError(false);
    if (i < 5) {
      inputRefs.current[i + 1]?.focus();
    } else {
      verify(next);
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace') {
      const next = [...digits];
      if (next[i]) {
        next[i] = '';
        setDigits(next);
      } else if (i > 0) {
        next[i - 1] = '';
        setDigits(next);
        inputRefs.current[i - 1]?.focus();
      }
      setError(false);
    }
  }

  function verify(d) {
    if (d.join('') === CORRECT_PIN) {
      sessionStorage.setItem('synthux_auth', '1');
      onAuth();
      goTo('dashboard');
    } else {
      setError(true);
      setDigits(Array(6).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
    }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100vh - 56px)',
    }}>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: '360px', padding: '2rem' }}>

        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="4" y="9" width="12" height="9" rx="2" fill="white" fillOpacity=".9"/>
            <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          </svg>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
          Enter your PIN
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--mute)', marginBottom: '2rem', lineHeight: 1.5 }}>
          This workspace is PIN-protected.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={e => handleChange(i, e)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: '46px', height: '54px',
                textAlign: 'center',
                fontSize: '20px', fontWeight: 600,
                fontFamily: 'var(--sans)',
                border: `2px solid ${error ? 'var(--red)' : d ? 'var(--ink)' : 'var(--border-md)'}`,
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                background: error ? 'var(--red-lt)' : '#fff',
                color: error ? 'var(--red)' : 'var(--ink)',
                transition: 'border-color .1s, background .1s',
                caretColor: 'transparent',
              }}
            />
          ))}
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: 'var(--red)', fontWeight: 500, margin: 0 }}>
            Incorrect PIN — try again.
          </p>
        )}
      </div>
    </div>
  );
}
