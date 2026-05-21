import React, { useState, useEffect } from 'react';
import { Tag } from '../components/UI';
import { api } from '../api';

const SESSIONS = [
  {
    id: 'P01', persona: 'Hakim', archetype: 'Spontaneous Traditionalist', age: 42,
    color: '#EEF3FF', textColor: '#1B4FD8',
    friction: { T1: 4, T2: 6, avg: 5.0 },
    outcomes: { T1: 'success_with_friction', T2: 'abandon' },
    signal: 'no_go', h1: 'falsified',
    summary: 'Understood the product category but could not confirm boxless setup without external help. Would escalate to WhatsApp rather than self-convert.',
    frictionDetail: 'Could not confirm "no box required" from hero section alone. FAQ scroll required. "No box" read as a feature, not the core product change.',
  },
  {
    id: 'P02', persona: 'Syafiqah', archetype: 'Progressive Influencer', age: 22,
    color: '#EAF3DE', textColor: '#27500A',
    friction: { T1: 4, T2: 6, avg: 5.0 },
    outcomes: { T1: 'success_with_friction', T2: 'abandon' },
    signal: 'no_go', h1: 'falsified',
    summary: 'No pack relevant to solo young female viewer. Would exit and seek peer validation on TikTok rather than convert.',
    frictionDetail: 'Pack number suffix (12, 24) unexplained. No content category signal for K-drama or creator-relevant content. Page tone reads as older demographic.',
  },
  {
    id: 'P03', persona: 'Marcus', archetype: 'Trendsetter Explorer', age: 27,
    color: '#FAEEDA', textColor: '#633806',
    friction: { T1: 4, T2: 7, avg: 5.5 },
    outcomes: { T1: 'success_with_friction', T2: 'abandon' },
    signal: 'no_go', h1: 'falsified',
    summary: 'Found no justification to switch from existing Netflix + Disney+ stack. 24-month contract with brand trust deficit was a clear rejection.',
    frictionDetail: 'Epic 24 at RM159.99 does not beat current stack cost (RM84.80). Astro Fibre pause eroded brand confidence before arriving on page.',
  },
  {
    id: 'P04', persona: 'Puan Rohani', archetype: 'Family-Centric Devotee', age: 47,
    color: '#EEEDFE', textColor: '#3C3489',
    friction: { T1: 6, T2: 8, avg: 7.0 },
    outcomes: { T1: 'success_with_friction', T2: 'abandon' },
    signal: 'no_go', h1: 'falsified',
    summary: 'Highest friction of all personas. Contract contradiction (homepage vs pack page) was the critical trust failure. Would not convert without spousal input.',
    frictionDetail: 'Homepage says "cancel anytime" — pack page shows 12-month contract. This contradiction was noticed immediately and caused trust collapse.',
  },
  {
    id: 'P05', persona: 'David', archetype: 'Routine Conservative', age: 38,
    color: '#F1EFE8', textColor: '#444441',
    friction: { T1: 3, T2: 4, avg: 3.5 },
    outcomes: { T1: 'success_with_friction', T2: 'shortlisted' },
    signal: 'conditional', h1: 'partially_confirmed',
    summary: 'Strongest near-conversion. Entertainment 12 at RM39.99 shortlisted as genuinely competitive vs his current RM90 Astro bill. Needs channel list to commit.',
    frictionDetail: 'Channel list gated behind View more. Netflix account portability on Epic 24 unclear. Would convert with 48h decision window and channel detail visible.',
  },
];

function outcomeTag(o) {
  if (o === 'success_with_friction') return { label: 'Completed', type: 'amber' };
  if (o === 'abandon')               return { label: 'Abandoned', type: 'red'   };
  if (o === 'shortlisted')           return { label: 'Shortlisted', type: 'teal' };
  return { label: o, type: 'gray' };
}

function gngStyle(sig) {
  if (sig === 'no_go')      return { label: 'No Go',      bg: 'var(--red-lt)',   color: 'var(--red)',   border: 'rgba(196,43,43,.2)'  };
  if (sig === 'conditional') return { label: 'Conditional', bg: 'var(--amber-lt)', color: 'var(--amber)', border: 'rgba(201,123,47,.2)' };
  return                           { label: 'Go',          bg: 'var(--teal-lt)', color: 'var(--primary)',  border: 'rgba(15,138,110,.2)' };
}

function frictionColor(n) {
  return n >= 7 ? 'var(--red)' : n >= 4 ? 'var(--amber)' : 'var(--teal)';
}

export default function Results({ goTo, runId }) {
  const [expanded, setExpanded] = useState(null);
  const [sessions,  setSessions] = useState(SESSIONS);
  const [isLive,    setIsLive]   = useState(false);

  useEffect(() => {
    if (!runId) return;
    api.isAvailable().then(async available => {
      if (!available) return;
      try {
        const data = await api.getSessions(runId);
        if (data?.sessions?.length) {
          setSessions(data.sessions);
          setIsLive(true);
        }
      } catch {}
    });
  }, [runId]);

  const avgFriction = sessions.length
    ? (sessions.reduce((s, p) => s + (p.friction?.avg ?? 0), 0) / sessions.length).toFixed(1)
    : '—';
  const noGo        = sessions.filter(s => s.signal === 'no_go' || s.go_no_go === 'no_go').length;
  const conditional = sessions.filter(s => s.signal === 'conditional' || s.go_no_go === 'conditional').length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.875rem 2rem', borderBottom: '1px solid var(--border)',
        background: 'var(--paper)', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--mute-soft)', marginBottom: '0.1rem' }}>Session results</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--ink)' }}>
            Astro.com.my — Homepage Revamp
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => {
              const rows = [
                ['persona','archetype','task','friction','outcome','signal','summary'].join(','),
                ...sessions.map(s =>
                  Object.entries(s.friction?.outcomes || s.outcomes || {}).map(([task, outcome]) =>
                    [s.persona, s.archetype, task, s.friction?.[task] ?? '', outcome, s.signal || '', `"${(s.summary||'').replace(/"/g,'""')}"`].join(',')
                  ).join('\n')
                ),
              ].join('\n');
              const blob = new Blob([rows], { type: 'text/csv' });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement('a');
              a.href = url; a.download = `${runId || 'study'}_results.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: '0.45rem 1rem', border: '1px solid var(--border-md)',
              borderRadius: 'var(--radius-sm)', background: '#fff',
              fontFamily: 'var(--sans)', fontSize: '12px', cursor: 'pointer', color: 'var(--ink)',
            }}
          >↓ Download Excel</button>
          <button
            onClick={() => goTo('report')}
            style={{
              padding: '0.45rem 1.25rem', border: 'none',
              borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--on-primary)',
              fontFamily: 'var(--sans)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            }}
          >Analyze data →</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem' }}>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Converted',   value: '0/5',    sub: 'personas',      color: 'var(--ink)' },
            { label: 'Conditional', value: `${conditional}/5`, sub: 'near conversion', color: 'var(--amber)' },
            { label: 'No Go',       value: `${noGo}/5`,  sub: 'personas',  color: 'var(--red)' },
            { label: 'Avg friction', value: avgFriction, sub: 'out of 10', color: frictionColor(parseFloat(avgFriction)) },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: '1.1rem 1.25rem', background: '#fff',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.4rem' }}>
                {stat.label}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '28px', color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--mute-soft)', marginTop: '0.25rem' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* H1 verdict banner */}
        <div style={{
          padding: '1rem 1.25rem', marginBottom: '1.75rem',
          background: 'var(--red-lt)', borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(196,43,43,.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.25rem' }}>H1 verdict</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--red)' }}>
              Falsified for 4/5 personas — homepage boxless messaging was not independently comprehensible
            </div>
          </div>
          <Tag label="No Go" type="red" />
        </div>

        {/* Session cards */}
        <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.75rem' }}>
          Persona sessions
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {SESSIONS.map(s => {
            const gng    = gngStyle(s.signal);
            const isOpen = expanded === s.id;

            return (
              <div key={s.id} style={{
                background: '#fff', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', overflow: 'hidden',
              }}>
                {/* Row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr 160px 56px 100px 18px',
                    alignItems: 'center', gap: '1rem',
                    padding: '0.875rem 1.25rem', cursor: 'pointer',
                  }}
                >
                  {/* Persona */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: s.color, color: s.textColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 600, flexShrink: 0,
                    }}>{s.id}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{s.persona}</div>
                      <div style={{ fontSize: '11px', color: 'var(--mute-soft)' }}>{s.archetype}</div>
                    </div>
                  </div>

                  {/* Summary snippet */}
                  <div style={{ fontSize: '12px', color: 'var(--body)', lineHeight: 1.5, overflow: 'hidden' }}>
                    {s.summary.slice(0, 85)}…
                  </div>

                  {/* Task outcomes */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {Object.entries(s.outcomes).map(([tid, o]) => {
                      const t = outcomeTag(o);
                      return <Tag key={tid} label={`${tid}: ${t.label}`} type={t.type} />;
                    })}
                  </div>

                  {/* Friction avg */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: frictionColor(s.friction.avg) }}>
                      {s.friction.avg}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--mute-soft)' }}>avg</div>
                  </div>

                  {/* Go/No-Go pill */}
                  <div style={{
                    padding: '0.25rem 0.7rem', borderRadius: '12px',
                    background: gng.bg, color: gng.color,
                    fontSize: '11px', fontWeight: 500,
                    border: `1px solid ${gng.border}`,
                    textAlign: 'center', whiteSpace: 'nowrap',
                  }}>{gng.label}</div>

                  {/* Chevron */}
                  <div style={{ color: 'var(--mute-soft)', fontSize: '12px', textAlign: 'right', transition: 'transform .15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    background: 'var(--cream)',
                    padding: '1.1rem 1.25rem',
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem',
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.4rem' }}>Session summary</div>
                      <p style={{ fontSize: '12px', color: 'var(--ink-strong)', lineHeight: 1.7, margin: 0 }}>{s.summary}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.4rem' }}>Primary friction signal</div>
                      <p style={{ fontSize: '12px', color: 'var(--ink-strong)', lineHeight: 1.7, margin: 0, marginBottom: '0.875rem' }}>{s.frictionDetail}</p>
                      <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.4rem' }}>Friction by task</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {Object.entries(s.friction).filter(([k]) => k !== 'avg').map(([task, score]) => (
                          <div key={task} style={{
                            padding: '0.3rem 0.75rem', background: '#fff',
                            borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px',
                          }}>
                            <span style={{ color: 'var(--mute)' }}>{task}:</span>{' '}
                            <span style={{ fontWeight: 600, color: frictionColor(score) }}>{score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{
          marginTop: '2rem', padding: '1.5rem 2rem',
          background: 'var(--primary)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: '#fff', marginBottom: '0.25rem' }}>
              Ready to generate the research report
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.75)' }}>
              5 sessions · 10 tasks · friction map · H1 verdict · recommended actions
            </div>
          </div>
          <button
            onClick={() => goTo('report')}
            style={{
              padding: '0.75rem 2rem', background: '#fff', color: 'var(--primary)',
              border: 'none', borderRadius: '8px',
              fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            }}
          >Analyze data →</button>
        </div>
      </div>
    </div>
  );
}
