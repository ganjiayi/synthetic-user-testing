import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Tag } from '../components/UI';

function statusTag(status) {
  if (!status) return <Tag label="Unknown" type="gray" />;
  if (status === 'evaluation_complete' || status === 'complete')
    return <Tag label="Completed" type="teal" />;
  if (status === 'error')
    return <Tag label="Error" type="red" />;
  return <Tag label="In progress" type="blue" />;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
}

function truncate(text, n = 80) {
  if (!text || text === '—') return '—';
  return text.length > n ? text.slice(0, n) + '…' : text;
}

const COL = {
  id:     { label: 'Study ID',                   w: '18%' },
  date:   { label: 'Date and time created',       w: '16%' },
  prod:   { label: 'Product',                     w: '12%' },
  rq:     { label: 'Main research question',      w: '34%' },
  status: { label: 'Research status',             w: '10%' },
  action: { label: 'Action',                      w: '10%' },
};

export default function History({ goTo }) {
  const [runs,    setRuns]    = useState(null);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.listRuns()
      .then(data => setRuns(data.runs || []))
      .catch(err  => setError(err.message));
  }, []);

  return (
    <div style={{ flex: 1, padding: '2.5rem 2.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.4rem' }}>
          Research history
        </div>
        <h1 style={{ fontSize: '28px', color: 'var(--ink)', marginBottom: '0.4rem' }}>
          All studies
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--mute)', lineHeight: 1.6 }}>
          Every research run your team has created. Click a study to view its report, questionnaire, and test materials.
        </p>
      </div>

      {/* Loading */}
      {runs === null && !error && (
        <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--mute)', fontSize: '13px' }}>
          Loading studies…
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '1rem 1.25rem', background: 'var(--red-lt)', border: '1px solid rgba(238,29,54,.2)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--red)' }}>
          Could not load studies: {error}
        </div>
      )}

      {/* Empty */}
      {runs !== null && runs.length === 0 && (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '1.5px dashed var(--hairline)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.4rem' }}>No studies yet</div>
          <div style={{ fontSize: '13px', color: 'var(--mute)', marginBottom: '1.5rem' }}>Start a new study to see it appear here.</div>
          <button
            onClick={() => goTo('questionnaire')}
            style={{ padding: '0.6rem 1.4rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            New study
          </button>
        </div>
      )}

      {/* Table */}
      {runs !== null && runs.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {/* Table head */}
          <div style={{ display: 'flex', background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
            {Object.values(COL).map(c => (
              <div key={c.label} style={{ width: c.w, padding: '0.625rem 1rem', fontSize: '11px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', flexShrink: 0 }}>
                {c.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {runs.map((run, i) => (
            <div
              key={run.id}
              style={{
                display: 'flex', alignItems: 'center',
                borderBottom: i < runs.length - 1 ? '1px solid var(--border)' : 'none',
                background: '#fff',
                transition: 'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              {/* Study ID */}
              <div style={{ width: COL.id.w, padding: '1rem', flexShrink: 0 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--blue)', fontWeight: 500 }}>
                  {run.id}
                </span>
              </div>

              {/* Date */}
              <div style={{ width: COL.date.w, padding: '1rem', fontSize: '12px', color: 'var(--body)', flexShrink: 0 }}>
                {formatDate(run.created_at)}
              </div>

              {/* Product */}
              <div style={{ width: COL.prod.w, padding: '1rem', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', flexShrink: 0 }}>
                {run.product || '—'}
              </div>

              {/* Main RQ */}
              <div style={{ width: COL.rq.w, padding: '1rem', fontSize: '12px', color: 'var(--body)', lineHeight: 1.5, flexShrink: 0 }}>
                {truncate(run.primary_rq)}
              </div>

              {/* Status */}
              <div style={{ width: COL.status.w, padding: '1rem', flexShrink: 0 }}>
                {statusTag(run.status)}
              </div>

              {/* Actions */}
              <div style={{ width: COL.action.w, padding: '1rem', display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button
                  onClick={() => goTo('runDetail', { runId: run.id })}
                  style={{ padding: '0.35rem 0.875rem', fontSize: '12px', fontFamily: 'var(--sans)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)', background: '#fff', color: 'var(--ink)', cursor: 'pointer', fontWeight: 500 }}
                >
                  View
                </button>
                <button
                  disabled={run.status !== 'evaluation_complete' && run.status !== 'complete'}
                  onClick={() => alert('Download coming soon')}
                  style={{ padding: '0.35rem 0.875rem', fontSize: '12px', fontFamily: 'var(--sans)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)', color: run.status === 'evaluation_complete' || run.status === 'complete' ? 'var(--ink)' : 'var(--mute-soft)', cursor: run.status === 'evaluation_complete' || run.status === 'complete' ? 'pointer' : 'default' }}
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
