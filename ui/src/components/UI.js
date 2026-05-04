import React, { useState, useRef } from 'react';

/* ── SelectCard ── */
export function SelectCard({ icon, name, desc, badge, badgeType, selected, onClick }) {
  const badgeStyle = {
    display: 'inline-block', fontSize: '10px', padding: '2px 8px',
    borderRadius: '12px', marginTop: '0.5rem',
    background: badgeType === 'gap' ? 'var(--amber-lt, #FDF3E7)' : '#F3F4F6',
    color: badgeType === 'gap' ? 'var(--amber, #C97B2F)' : '#6B7280',
  };

  return (
    <div
      onClick={onClick}
      style={{
        border: selected ? '2px solid var(--blue)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.1rem',
        cursor: 'pointer',
        background: selected ? 'var(--blue-lt)' : '#fff',
        transition: 'all .15s',
        userSelect: 'none',
      }}
    >
      {icon && <div style={{ fontSize: '18px', marginBottom: '0.4rem' }}>{icon}</div>}
      <div style={{ fontSize: '13px', fontWeight: 500, color: selected ? 'var(--blue)' : 'var(--ink)' }}>{name}</div>
      {desc && <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '0.15rem', lineHeight: 1.4 }}>{desc}</div>}
      {badge && <div style={badgeStyle}>{badge}</div>}
    </div>
  );
}

/* ── PersonaCard ── */
export function PersonaCard({ code, name, tag, loc, bg, color, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: selected ? '2px solid var(--blue)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.1rem',
        cursor: 'pointer',
        background: selected ? 'var(--blue-lt)' : '#fff',
        display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
        transition: 'all .15s',
        userSelect: 'none',
      }}
    >
      <div style={{
        width: '38px', height: '38px', borderRadius: '50%',
        background: bg, color, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 500, flexShrink: 0,
      }}>{code}</div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: selected ? 'var(--blue)' : 'var(--ink)' }}>{name}</div>
        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '0.1rem' }}>{tag}</div>
        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '0.1rem' }}>{loc}</div>
      </div>
    </div>
  );
}

/* ── Pill ── */
export function Pill({ label, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '0.35rem 0.9rem',
        borderRadius: '20px',
        border: selected ? '1.5px solid var(--blue)' : '1px solid var(--border-md)',
        fontSize: '12px', cursor: 'pointer',
        background: selected ? 'var(--blue)' : '#fff',
        color: selected ? '#fff' : '#4A5568',
        fontWeight: selected ? 500 : 400,
        transition: 'all .15s',
        userSelect: 'none',
      }}
    >{label}</div>
  );
}

/* ── AutofillNotice ── */
export function AutofillNotice({ children }) {
  return (
    <div style={{
      display: 'flex', gap: '0.6rem',
      padding: '0.75rem 1rem',
      background: 'var(--teal-lt)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid rgba(15,138,110,.2)',
      marginBottom: '1.25rem',
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
        <circle cx="8" cy="8" r="7" stroke="#0F8A6E" strokeWidth="1"/>
        <path d="M5 8l2 2 4-4" stroke="#0F8A6E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ fontSize: '12px', color: '#065F46', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

/* ── FieldGroup ── */
export function FieldGroup({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>{label}</label>}
      {children}
      {hint && <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '0.3rem' }}>{hint}</div>}
    </div>
  );
}

/* ── TextInput ── */
export function TextInput({ placeholder, value, onChange, rows }) {
  const base = {
    width: '100%', padding: '0.625rem 0.875rem',
    border: '1px solid var(--border-md)',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--sans)', fontSize: '13px',
    color: 'var(--ink)', background: '#fff',
    lineHeight: 1.6,
  };
  if (rows) return <textarea rows={rows} placeholder={placeholder} value={value} onChange={onChange} style={{ ...base, resize: 'vertical' }} />;
  return <input type="text" placeholder={placeholder} value={value} onChange={onChange} style={base} />;
}

/* ── Tag ── */
export function Tag({ label, type = 'blue' }) {
  const colors = {
    blue:  { bg: 'var(--blue-lt)', color: 'var(--blue)' },
    teal:  { bg: 'var(--teal-lt)', color: 'var(--teal)' },
    amber: { bg: 'var(--amber-lt)', color: 'var(--amber)' },
    red:   { bg: 'var(--red-lt)', color: 'var(--red)' },
    gray:  { bg: '#F3F4F6', color: '#6B7280' },
  };
  const c = colors[type] || colors.blue;
  return (
    <span style={{ padding: '0.2rem 0.7rem', borderRadius: '12px', fontSize: '11px', fontWeight: 500, background: c.bg, color: c.color }}>
      {label}
    </span>
  );
}

/* ── UploadZone ── */
export function UploadZone({ value, onChange }) {
  const { files = [], urls = [] } = value || {};
  const [dragging, setDragging]   = useState(false);
  const [urlInput, setUrlInput]   = useState('');
  const inputRef                  = useRef(null);

  const addFiles = (incoming) => {
    const next = Array.from(incoming).map(f => ({
      name:    f.name,
      type:    f.type,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    onChange({ files: [...files, ...next], urls });
  };

  const removeFile = (i) => onChange({ files: files.filter((_, j) => j !== i), urls });
  const removeUrl  = (i) => onChange({ files, urls: urls.filter((_, j) => j !== i) });

  const addUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    onChange({ files, urls: [...urls, u] });
    setUrlInput('');
  };

  const isFigma = (u) => u.includes('figma.com');
  const isImg   = (f) => f.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(f.name);

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border-md)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '1.75rem 1.25rem',
          textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'var(--blue-lt)' : '#FAFAF9',
          transition: 'all .15s',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ fontSize: '22px', marginBottom: '0.4rem', opacity: .5 }}>↑</div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: dragging ? 'var(--blue)' : 'var(--ink)', marginBottom: '0.2rem' }}>
          Drop files here, or click to browse
        </div>
        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
          PNG · JPG · PDF · DOCX — upload screenshots, Figma exports, or documents
        </div>
        <input
          ref={inputRef} type="file" multiple
          accept="image/png,image/jpeg,image/jpg,application/pdf,.docx"
          style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {/* URL input row */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <input
          type="text"
          placeholder="Paste a Figma prototype link, staging URL, or live URL…"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addUrl()}
          style={{
            flex: 1, padding: '0.6rem 0.875rem',
            border: '1px solid var(--border-md)', borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--ink)', background: '#fff',
            outline: 'none',
          }}
        />
        <button
          onClick={addUrl}
          style={{
            padding: '0.6rem 1rem', border: '1px solid var(--border-md)',
            borderRadius: 'var(--radius-sm)', background: '#fff',
            fontFamily: 'var(--sans)', fontSize: '12px', cursor: 'pointer', color: 'var(--ink)',
            whiteSpace: 'nowrap',
          }}
        >Add link</button>
      </div>

      {/* Preview area */}
      {(files.length > 0 || urls.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {files.map((f, i) => (
            isImg(f) ? (
              <div key={i} style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
                <img
                  src={f.preview} alt={f.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '7px', border: '1px solid var(--border)', display: 'block' }}
                />
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    position: 'absolute', top: '-5px', right: '-5px',
                    width: '17px', height: '17px', borderRadius: '50%',
                    background: 'var(--ink)', color: '#fff', border: 'none',
                    fontSize: '10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            ) : (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                background: 'var(--cream)', borderRadius: '20px',
                border: '1px solid var(--border)', fontSize: '12px', color: 'var(--ink)',
                maxWidth: '220px',
              }}>
                <span style={{ opacity: .6 }}>📄</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name}
                </span>
                <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '15px', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
              </div>
            )
          ))}

          {urls.map((u, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              background: isFigma(u) ? 'var(--blue-lt)' : 'var(--cream)',
              borderRadius: '20px',
              border: `1px solid ${isFigma(u) ? 'var(--blue-md)' : 'var(--border)'}`,
              fontSize: '12px',
              color: isFigma(u) ? 'var(--blue)' : 'var(--ink)',
              maxWidth: '280px',
            }}>
              <span style={{ fontSize: '11px', opacity: .7 }}>{isFigma(u) ? '◈' : '🔗'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.replace(/^https?:\/\//, '').slice(0, 36)}{u.replace(/^https?:\/\//, '').length > 36 ? '…' : ''}
              </span>
              <button onClick={() => removeUrl(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '15px', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── PlanField ── */
export function PlanField({ label, value, editable, onInput }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ fontSize: '10px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>{label}</div>
      <div
        contentEditable={editable}
        suppressContentEditableWarning
        onInput={e => onInput && onInput(e.currentTarget.textContent)}
        style={{
          fontSize: '13px', color: 'var(--ink)', lineHeight: 1.65,
          padding: '0.625rem 0.875rem',
          background: editable ? '#fff' : 'var(--cream)',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${editable ? 'var(--blue)' : 'rgba(13,17,23,.06)'}`,
          outline: 'none',
          cursor: editable ? 'text' : 'default',
        }}
      >{value}</div>
    </div>
  );
}
