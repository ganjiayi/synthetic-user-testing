import React, { useState, useEffect } from 'react';
import { api, PERSONA_MAP } from '../api';

const label = { fontSize: '10px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '0.3rem' };
const body  = { fontSize: '12.5px', color: 'var(--body)', lineHeight: 1.65 };

const severityColor = { Low: 'var(--teal)', Medium: 'var(--amber)', High: 'var(--red)', Critical: 'var(--red)' };

/* ── PersonaProfilePanel — full trait-card profile for one expanded
   persona code, fetched once from personas/v4_library.json via the
   /api/personas endpoint. ── */
export default function PersonaProfilePanel({ code }) {
  const [personas, setPersonas] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getPersonas().then(d => { if (!cancelled) setPersonas(d.personas || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!code || !personas) return null;

  const slug    = PERSONA_MAP[code]?.ref;
  const persona = personas.find(p => p.slug === slug);
  if (!persona) return null;

  const tech    = persona.technology_literacy || {};
  const decide  = persona.decision_making || {};
  const issues  = persona.astro_pain_points?.applicable_issues || [];

  return (
    <div style={{
      marginTop: '0.75rem', padding: '1.1rem 1.25rem',
      background: '#fafcff', border: '1px solid var(--blue-lt)', borderTop: '2px solid var(--blue)',
      borderRadius: '0 0 var(--radius-md) var(--radius-md)',
    }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
        {persona.name}, {persona.age} — {persona.archetype}
      </div>
      {persona.tagline && (
        <div style={{ ...body, fontStyle: 'italic', color: 'var(--mute)', marginBottom: '0.75rem' }}>"{persona.tagline}"</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem', marginBottom: '0.75rem' }}>
        <div>
          <div style={label}>Identity</div>
          <div style={body}>{persona.identity?.role}, {persona.identity?.location}</div>
        </div>
        <div>
          <div style={label}>Tech literacy</div>
          <div style={body}>{tech.overall_score}/100 — {tech.learning_style}</div>
        </div>
      </div>

      {persona.motivations?.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={label}>Motivations</div>
          <div style={body}>{persona.motivations.join(' · ')}</div>
        </div>
      )}

      {persona.pain_points?.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={label}>Pain points</div>
          <ul style={{ ...body, margin: 0, paddingLeft: '1.1rem' }}>
            {persona.pain_points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {decide.dealbreakers?.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={label}>Dealbreakers</div>
          <div style={body}>{decide.dealbreakers.join(' · ')}</div>
        </div>
      )}

      {issues.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={label}>Astro-specific issues</div>
          {issues.map((issue, i) => (
            <div key={i} style={{ ...body, marginBottom: '0.3rem' }}>
              <span style={{ color: severityColor[issue.severity] || 'var(--mute)', fontWeight: 600 }}>{issue.severity}</span>
              {' — '}{issue.theme}: {issue.description}
            </div>
          ))}
        </div>
      )}

      {persona.signature_quotes?.[0] && (
        <div style={{ ...body, fontStyle: 'italic', color: 'var(--mute)', borderTop: '1px solid var(--hairline)', paddingTop: '0.6rem' }}>
          "{persona.signature_quotes[0]}"
        </div>
      )}
    </div>
  );
}
