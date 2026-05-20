import React, { useEffect, useState } from 'react';
import { api, PERSONA_MAP } from '../api';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function topByCount(arr) {
  if (!arr.length) return null;
  const counts = {};
  for (const x of arr) counts[x] = (counts[x] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      background: '#fff',
    }}>
      <div style={{
        fontSize: '10px', fontWeight: 500, color: 'var(--mute)',
        textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.625rem',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: 'var(--mute-soft)', marginTop: '0.3rem' }}>{sub}</div>
      )}
    </div>
  );
}

export default function Dashboard({ goTo }) {
  const [runs,  setRuns]  = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listRuns()
      .then(data => setRuns(data.runs || []))
      .catch(err  => setError(err.message));
  }, []);

  const completed    = (runs || []).filter(r => r.status === 'evaluation_complete' || r.status === 'complete');
  const products     = (runs || []).map(r => r.product).filter(p => p && p !== '—');
  const personaCodes = (runs || []).flatMap(r => r.personas || []);

  const topProductEntry  = topByCount(products);
  const topPersonaEntry  = topByCount(personaCodes);
  const topPersonaName   = topPersonaEntry ? (PERSONA_MAP[topPersonaEntry[0]]?.name || topPersonaEntry[0]) : null;

  return (
    <div style={{ flex: 1, padding: '4rem 3.5rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>

      {/* Greeting + CTA */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{
          fontSize: '12px', fontWeight: 500, color: 'var(--mute)',
          textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.5rem',
        }}>
          {greeting()}
        </div>
        <h1 style={{
          fontSize: '36px', fontWeight: 600, color: 'var(--ink)',
          letterSpacing: '-0.025em', marginBottom: '1.75rem', lineHeight: 1.1,
        }}>
          Welcome back to SynthUX
        </h1>
        <button
          onClick={() => goTo('questionnaire')}
          style={{
            padding: '0.875rem 2rem',
            background: 'var(--primary)', color: 'var(--on-primary)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--sans)', fontSize: '15px', fontWeight: 500,
            cursor: 'pointer', letterSpacing: '-0.01em',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          Run new research →
        </button>
      </div>

      {/* Stats section */}
      <div style={{
        fontSize: '11px', fontWeight: 500, color: 'var(--mute)',
        textTransform: 'uppercase', letterSpacing: '.08em',
        paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)',
        marginBottom: '1rem',
      }}>
        Research at a glance
      </div>

      {error && (
        <div style={{
          padding: '0.875rem 1rem', background: 'var(--red-lt)',
          border: '1px solid rgba(238,29,54,.2)', borderRadius: 'var(--radius-md)',
          fontSize: '13px', color: 'var(--red)', marginBottom: '1rem',
        }}>
          Could not load stats: {error}
        </div>
      )}

      {runs === null && !error && (
        <div style={{ color: 'var(--mute)', fontSize: '13px', padding: '1rem 0' }}>Loading…</div>
      )}

      {runs !== null && runs.length === 0 && (
        <div style={{
          padding: '3rem 2rem', textAlign: 'center',
          border: '1.5px dashed var(--hairline)', borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.35rem' }}>
            No studies yet
          </div>
          <div style={{ fontSize: '13px', color: 'var(--mute)' }}>
            Run your first study and stats will appear here.
          </div>
        </div>
      )}

      {runs !== null && runs.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard
              label="Total studies"
              value={runs.length}
            />
            <StatCard
              label="Completed"
              value={completed.length}
              sub={runs.length > 0 ? `${Math.round(completed.length / runs.length * 100)}% completion rate` : null}
            />
            <StatCard
              label="Most tested product"
              value={topProductEntry ? topProductEntry[0] : '—'}
              sub={topProductEntry ? `${topProductEntry[1]} run${topProductEntry[1] > 1 ? 's' : ''}` : null}
            />
            <StatCard
              label="Most used persona"
              value={topPersonaName || '—'}
              sub={topPersonaEntry ? `${topPersonaEntry[1]} session${topPersonaEntry[1] > 1 ? 's' : ''}` : null}
            />
          </div>

          <button
            onClick={() => goTo('history')}
            style={{
              padding: 0, background: 'none', border: 'none',
              fontFamily: 'var(--sans)', fontSize: '13px',
              color: 'var(--blue)', cursor: 'pointer',
            }}
          >
            View all studies →
          </button>
        </>
      )}
    </div>
  );
}
