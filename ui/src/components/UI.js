import React, { useState, useRef } from 'react';

/* ── SelectCard ── */
export function SelectCard({ icon, name, desc, badge, badgeType, selected, onClick }) {
  const badgeStyle = {
    display: 'inline-block', fontSize: '11px', fontWeight: 500,
    padding: '2px 8px', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem',
    background: badgeType === 'gap' ? 'rgba(255,174,19,0.12)' : 'var(--cream)',
    color: badgeType === 'gap' ? 'var(--amber)' : 'var(--mute)',
  };

  return (
    <div
      onClick={onClick}
      style={{
        border: selected ? `1.5px solid var(--primary)` : '1px solid var(--hairline)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.1rem',
        cursor: 'pointer',
        background: selected ? 'var(--cream)' : 'var(--canvas)',
        transition: 'all .12s',
        userSelect: 'none',
      }}
    >
      {icon && <div style={{ fontSize: '18px', marginBottom: '0.4rem' }}>{icon}</div>}
      <div style={{ fontSize: '13px', fontWeight: 500, color: selected ? 'var(--ink)' : 'var(--body)' }}>{name}</div>
      {desc && <div style={{ fontSize: '11px', color: 'var(--mute)', marginTop: '0.15rem', lineHeight: 1.4 }}>{desc}</div>}
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
        border: selected ? `1.5px solid var(--primary)` : '1px solid var(--hairline)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.1rem',
        cursor: 'pointer',
        background: selected ? 'var(--cream)' : 'var(--canvas)',
        display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
        transition: 'all .12s',
        userSelect: 'none',
      }}
    >
      <div style={{
        width: '38px', height: '38px', borderRadius: 'var(--radius-full)',
        background: bg, color, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 500, flexShrink: 0,
      }}>{code}</div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{name}</div>
        <div style={{ fontSize: '11px', color: 'var(--mute)', marginTop: '0.1rem' }}>{tag}</div>
        <div style={{ fontSize: '11px', color: 'var(--mute-soft)', marginTop: '0.1rem' }}>{loc}</div>
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
        padding: '0.35rem 0.875rem',
        borderRadius: 'var(--radius-sm)',
        border: selected ? `1.5px solid var(--primary)` : '1px solid var(--hairline)',
        fontSize: '13px', cursor: 'pointer',
        background: selected ? 'var(--primary)' : 'var(--canvas)',
        color: selected ? 'var(--on-primary)' : 'var(--body)',
        fontWeight: selected ? 500 : 400,
        transition: 'all .12s',
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
      background: 'rgba(20,110,245,0.06)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid rgba(20,110,245,0.18)',
      marginBottom: '1.25rem',
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
        <circle cx="8" cy="8" r="7" stroke="var(--blue)" strokeWidth="1"/>
        <path d="M5 8l2 2 4-4" stroke="var(--blue)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ fontSize: '12px', color: 'var(--blue)', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

/* ── FieldGroup ── */
export function FieldGroup({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      {label && <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-strong)', display: 'block', marginBottom: '0.4rem' }}>{label}</label>}
      {children}
      {hint && <div style={{ fontSize: '12px', color: 'var(--mute)', marginTop: '0.3rem' }}>{hint}</div>}
    </div>
  );
}

/* ── TextInput ── */
export function TextInput({ placeholder, value, onChange, rows }) {
  const base = {
    width: '100%', padding: '0.625rem 0.875rem',
    border: '1px solid var(--hairline)',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--sans)', fontSize: '14px',
    color: 'var(--ink)', background: 'var(--canvas)',
    lineHeight: 1.6, outline: 'none',
    transition: 'border-color .12s',
  };
  if (rows) return <textarea rows={rows} placeholder={placeholder} value={value} onChange={onChange} style={{ ...base, resize: 'vertical' }} />;
  return <input type="text" placeholder={placeholder} value={value} onChange={onChange} style={base} />;
}

/* ── Tag ── */
export function Tag({ label, type = 'blue' }) {
  const colors = {
    blue:  { bg: 'rgba(20,110,245,0.08)',  color: 'var(--blue)' },
    teal:  { bg: 'rgba(0,215,34,0.10)',    color: 'var(--teal)' },
    amber: { bg: 'rgba(255,174,19,0.12)',  color: 'var(--amber)' },
    red:   { bg: 'rgba(238,29,54,0.08)',   color: 'var(--red)'   },
    gray:  { bg: 'var(--cream)',            color: 'var(--mute)'  },
  };
  const c = colors[type] || colors.blue;
  return (
    <span style={{
      padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-sm)',
      fontSize: '11px', fontWeight: 500,
      background: c.bg, color: c.color,
      display: 'inline-block',
    }}>
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
      file:    f,   // keep raw File object for upload at submit time
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
          border: `1.5px dashed ${dragging ? 'var(--primary)' : 'var(--hairline)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '1.75rem 1.25rem',
          textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'var(--cream)' : 'var(--canvas)',
          transition: 'all .12s',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ fontSize: '22px', marginBottom: '0.4rem', opacity: .4 }}>↑</div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: dragging ? 'var(--ink)' : 'var(--body)', marginBottom: '0.2rem' }}>
          Drop files here, or click to browse
        </div>
        <div style={{ fontSize: '12px', color: 'var(--mute)' }}>
          PNG · JPG · PDF · DOCX — screenshots, Figma exports, or documents
        </div>
        <input
          ref={inputRef} type="file" multiple
          accept="image/png,image/jpeg,image/jpg,application/pdf,.docx"
          style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {/* URL input */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <input
          type="text"
          placeholder="Paste a Figma prototype link, staging URL, or live URL…"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addUrl()}
          style={{
            flex: 1, padding: '0.6rem 0.875rem',
            border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--ink)',
            background: 'var(--canvas)', outline: 'none',
          }}
        />
        <button
          onClick={addUrl}
          style={{
            padding: '0.6rem 1rem', border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-sm)', background: 'var(--canvas)',
            fontFamily: 'var(--sans)', fontSize: '12px', cursor: 'pointer',
            color: 'var(--ink)', whiteSpace: 'nowrap',
          }}
        >Add link</button>
      </div>

      {/* Preview */}
      {(files.length > 0 || urls.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {files.map((f, i) => (
            isImg(f) ? (
              <div key={i} style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
                <img src={f.preview} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', display: 'block' }} />
                <button onClick={() => removeFile(i)} style={{ position: 'absolute', top: '-5px', right: '-5px', width: '17px', height: '17px', borderRadius: 'var(--radius-full)', background: 'var(--ink)', color: '#fff', border: 'none', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', fontSize: '12px', color: 'var(--body)', maxWidth: '220px' }}>
                <span style={{ opacity: .6 }}>📄</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name}</span>
                <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', fontSize: '15px', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
              </div>
            )
          ))}

          {urls.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: isFigma(u) ? 'rgba(20,110,245,0.07)' : 'var(--cream)', borderRadius: 'var(--radius-sm)', border: `1px solid ${isFigma(u) ? 'rgba(20,110,245,0.2)' : 'var(--hairline)'}`, fontSize: '12px', color: isFigma(u) ? 'var(--blue)' : 'var(--body)', maxWidth: '280px' }}>
              <span style={{ fontSize: '11px', opacity: .7 }}>{isFigma(u) ? '◈' : '🔗'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.replace(/^https?:\/\//, '').slice(0, 36)}{u.replace(/^https?:\/\//, '').length > 36 ? '…' : ''}</span>
              <button onClick={() => removeUrl(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', fontSize: '15px', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
