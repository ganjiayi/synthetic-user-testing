import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';

function hasProposal(p) {
  return !!p && typeof p === 'object' && Object.keys(p).length > 0;
}

/* ── AskAiPanel — AgentChat hidden behind an "Ask AI" button. The chat only
   mounts once opened, so it doesn't fire off state/effects (or clutter the
   step) until the researcher actually wants the conversational copilot,
   as opposed to the quick single-shot "Suggested from AI" boxes elsewhere
   on the same step, which stay visible directly. ── */
export function AskAiPanel({ agentKey, context, onApply, title, intro, placeholder }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.8rem 1rem', border: '1px dashed var(--blue-md)', borderRadius: 'var(--radius-md)',
          background: 'var(--blue-lt)', color: 'var(--blue)', cursor: 'pointer',
          fontFamily: 'var(--sans)', fontSize: '12.5px', fontWeight: 500, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '14px' }}>✦</span>
        <span>Ask AI — {title}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(false)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          marginBottom: '0.5rem', fontFamily: 'var(--sans)', fontSize: '11.5px',
          color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >← Hide chat</button>
      <AgentChat agentKey={agentKey} context={context} onApply={onApply} title={title} intro={intro} placeholder={placeholder} />
    </div>
  );
}

/* ── AgentChat — reusable co-pilot chat, backed by one of the three
   conversational intake agents. Proposals are advisory: applying one
   prefills real form fields, which stay directly editable regardless. ── */
export default function AgentChat({ agentKey, context, onApply, title, intro, placeholder }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: intro, proposal: null, isSeed: true }]);
  const [draft,    setDraft]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const lastProposalIndex = [...messages].map((m, i) => ({ m, i }))
    .reverse().find(({ m }) => m.role === 'assistant' && hasProposal(m.proposal))?.i;

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    const next = [...messages, { role: 'user', text, proposal: null }];
    setMessages(next);
    setDraft('');
    setSending(true);
    setError('');

    try {
      const history = next.filter(m => !m.isSeed).map(m => ({ role: m.role, text: m.text }));
      const { reply, proposal } = await api.chatWithAgent(agentKey, { messages: history, context });
      setMessages(m => [...m, { role: 'assistant', text: reply, proposal, applied: false }]);
    } catch (err) {
      setError(err.message || 'Could not reach the agent — try again.');
    } finally {
      setSending(false);
    }
  };

  const apply = (index) => {
    onApply(messages[index].proposal);
    setMessages(m => m.map((msg, i) => i === index ? { ...msg, applied: true } : msg));
  };

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
      display: 'flex', flexDirection: 'column', height: '520px', background: '#fff',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--hairline)', background: 'var(--cream)' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink)' }}>{title}</div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '90%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)',
              fontSize: '12.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? 'var(--primary)' : 'var(--cream)',
              color: m.role === 'user' ? 'var(--on-primary)' : 'var(--body)',
            }}>
              {m.text}
            </div>
            {i === lastProposalIndex && (
              m.applied ? (
                <span style={{ marginTop: '0.35rem', fontSize: '11px', color: 'var(--teal)', fontWeight: 500 }}>Applied ✓</span>
              ) : (
                <button
                  onClick={() => apply(i)}
                  style={{
                    marginTop: '0.35rem', padding: '0.3rem 0.7rem',
                    border: '1px solid var(--blue-md)', borderRadius: 'var(--radius-sm)',
                    background: 'var(--blue-lt)', color: 'var(--blue)',
                    fontFamily: 'var(--sans)', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                  }}
                >Apply to fields →</button>
              )
            )}
          </div>
        ))}
        {sending && (
          <div style={{ fontSize: '11px', color: 'var(--mute)', fontStyle: 'italic' }}>Thinking…</div>
        )}
        {error && (
          <div style={{ fontSize: '11px', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {error}
            <button onClick={send} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}>Retry</button>
          </div>
        )}
      </div>

      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--hairline)', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={sending}
          style={{
            flex: 1, padding: '0.55rem 0.75rem',
            border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--sans)', fontSize: '12.5px', color: 'var(--ink)',
            background: 'var(--canvas)', outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          style={{
            padding: '0.55rem 1rem', border: 'none', borderRadius: 'var(--radius-sm)',
            background: sending || !draft.trim() ? 'var(--border-md)' : 'var(--primary)',
            color: 'var(--on-primary)', fontFamily: 'var(--sans)', fontSize: '12.5px',
            fontWeight: 500, cursor: sending || !draft.trim() ? 'default' : 'pointer',
          }}
        >Send</button>
      </div>
    </div>
  );
}
