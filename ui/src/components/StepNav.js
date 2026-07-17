import React from 'react';

/* ── StepNav — left-side vertical stepper, replaces the horizontal progress bar ── */
export default function StepNav({ steps, current, onJump }) {
  return (
    <div style={{ width: '220px', flexShrink: 0, paddingRight: '1.5rem' }}>
      <h2 style={{
        fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--ink)',
        marginBottom: '1.5rem', lineHeight: 1.3,
      }}>
        Build your research study
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {steps.map((s, i) => {
          const done   = i < current;
          const active = i === current;
          const clickable = done;

          return (
            <div
              key={i}
              onClick={() => clickable && onJump(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.7rem',
                padding: '0.5rem 0.4rem',
                borderRadius: 'var(--radius-sm)',
                cursor: clickable ? 'pointer' : 'default',
                background: active ? 'var(--cream)' : 'transparent',
                transition: 'background .12s',
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: 'var(--radius-full)',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 600,
                background: active ? 'var(--primary)' : done ? 'var(--ink)' : 'var(--canvas)',
                color: active || done ? '#fff' : 'var(--mute-soft)',
                border: active || done ? 'none' : '1px solid var(--border-md)',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--ink)' : done ? 'var(--body)' : 'var(--mute-soft)',
              }}>
                {s.section}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
