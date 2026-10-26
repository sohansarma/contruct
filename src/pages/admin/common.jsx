// Shared bits for the admin screens.
import { useRef, useState } from 'react';
import { Icon } from '../../components/ui.jsx';
import { api, imageUrl } from '../../lib/api.js';

/** Resize in the browser before upload: max 1400 px, WebP (JPEG fallback). */
export async function resizeImage(file, max = 1400) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const toBlob = (type) => new Promise((res) => canvas.toBlob(res, type, 0.86));
  let blob = await toBlob('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg');
  return blob;
}

/** Edit a list of image URLs: upload files, paste a URL, reorder, remove. */
export function ImagesField({ value = [], onChange, max = 8 }) {
  const input = useRef();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [url, setUrl] = useState('');
  const upload = async (files) => {
    setErr(''); setBusy(true);
    try {
      const next = [...value];
      for (const f of [...files].slice(0, max - value.length)) {
        const blob = await resizeImage(f);
        next.push(await api.admin.uploadImage(blob, f.name));
      }
      onChange(next);
    } catch (e) { setErr(e.message); } finally { setBusy(false); input.current.value = ''; }
  };
  const move = (i, d) => { const n = [...value]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n); };
  return (
    <div className="col">
      <div className="img-grid">
        {value.map((u, i) => (
          <div key={u + i} className="img-tile">
            <img src={imageUrl(u)} alt="" />
            {i === 0 && <span className="tag">Main</span>}
            <div className="img-actions">
              {i > 0 && <button type="button" onClick={() => move(i, -1)} aria-label="Move left"><Icon name="ChevronLeft" size={16} /></button>}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove"><Icon name="Trash2" size={16} /></button>
              {i < value.length - 1 && <button type="button" onClick={() => move(i, 1)} aria-label="Move right"><Icon name="ChevronRight" size={16} /></button>}
            </div>
          </div>
        ))}
        {value.length < max && (
          <button type="button" className="img-tile add" onClick={() => input.current.click()} disabled={busy}>
            <Icon name={busy ? 'Loader' : 'ImagePlus'} size={26} />
            <span className="xs">{busy ? 'Uploading…' : 'Add photos'}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
      <div className="row">
        <input className="input" placeholder="…or paste an https:// image link" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" className="btn sm outline" disabled={!/^https:\/\/\S+$/.test(url)} onClick={() => { onChange([...value, url.trim()]); setUrl(''); }}>Add</button>
      </div>
      {err && <div className="small red">{err}</div>}
      <p className="xs muted">Use photos you own or that the brand gave you as a dealer. The first photo is shown on cards.</p>
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle-row">
      <span className="grow"><span className="small" style={{ fontWeight: 600 }}>{label}</span>{hint && <div className="xs muted">{hint}</div>}</span>
      <input type="checkbox" className="switch" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** Minimal CSV parser (quotes, commas, newlines in quotes). Returns array of objects keyed by header. */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

export function toCsv(rows, columns) {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n');
}

export function download(name, text, type = 'text/csv') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const toLocalInput = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
