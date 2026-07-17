import React, { useState } from 'react';

/* ── InfoTooltip — small "ⓘ" glyph, hover/focus reveals hint text ── */
export function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', marginLeft: '0.4rem', verticalAlign: 'middle' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          width: '15px', height: '15px', borderRadius: 'var(--radius-full)',
          border: '1px solid var(--mute-soft)', color: 'var(--mute)',
          fontSize: '10px', lineHeight: '13px', textAlign: 'center',
          cursor: 'help', userSelect: 'none', display: 'inline-block',
        }}
      >ⓘ</span>
      {open && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
          width: '280px', padding: '0.625rem 0.75rem',
          background: 'var(--ink)', color: '#fff',
          borderRadius: 'var(--radius-sm)', fontSize: '11px', lineHeight: 1.5,
          fontWeight: 400, textTransform: 'none', letterSpacing: 'normal',
          zIndex: 10, boxShadow: 'var(--shadow-md)',
        }}>
          {text}
        </span>
      )}
    </span>
  );
}
