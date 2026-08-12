import React, { useState, useEffect } from 'react';
import { api } from '../api';

const label = { fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.3rem' };
const body  = { fontSize: '12.5px', color: 'var(--body)', lineHeight: 1.65 };

/* ── ProductBackgroundPanel — what context the agent will actually have
   for this product, shown so the researcher knows what's already known
   vs. what's a gap. ── */
export default function ProductBackgroundPanel({ productId }) {
  const [data,     setData]     = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!productId || productId === 'OTHER') { setData(null); setNotFound(true); return; }
    let cancelled = false;
    setLoading(true); setNotFound(false); setData(null);
    api.getProduct(productId)
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  if (loading) {
    return <div style={{ ...body, fontStyle: 'italic', marginTop: '0.75rem' }}>Loading product background…</div>;
  }

  if (notFound) {
    return (
      <div style={{
        marginTop: '0.75rem', padding: '0.875rem 1rem',
        background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)',
      }}>
        <div style={{ ...body, color: 'var(--mute)' }}>
          No background data yet for this product — you can still proceed; product context will be limited when the study plan is generated.
        </div>
      </div>
    );
  }

  if (!data) return null;

  const desc  = data.section2_description || {};
  const instr = data.section6_agent_instructions || {};
  const lang  = data.section7_language || {};
  const pains = data.section5_pain_points || [];

  return (
    <div style={{
      marginTop: '0.75rem', padding: '1rem 1.1rem',
      background: '#fafcff', border: '1px solid var(--blue-lt)', borderTop: '2px solid var(--blue)',
      borderRadius: '0 0 var(--radius-md) var(--radius-md)',
    }}>
      <div style={{ ...label, color: 'var(--blue)', marginBottom: '0.75rem' }}>Background information the agent will use</div>

      {desc.full_description && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={label}>Description</div>
          <div style={body}>{desc.full_description}</div>
        </div>
      )}

      {desc.recent_changes && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={label}>Recent changes</div>
          <div style={body}>{desc.recent_changes}</div>
        </div>
      )}

      {pains.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={label}>{pains.length} known pain point{pains.length !== 1 ? 's' : ''}</div>
          <div style={body}>{pains.map(p => p.pain_point).join(' · ')}</div>
        </div>
      )}

      {instr.never_assume?.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={label}>The agent will never assume</div>
          <ul style={{ ...body, margin: 0, paddingLeft: '1.1rem' }}>
            {instr.never_assume.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {lang.tone_of_voice && (
        <div>
          <div style={label}>Tone of voice</div>
          <div style={body}>{lang.tone_of_voice}</div>
        </div>
      )}
    </div>
  );
}
