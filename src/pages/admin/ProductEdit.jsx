import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { Icon } from '../../components/ui.jsx';
import ProductIllustration, { KINDS } from '../../components/ProductArt.jsx';
import { AdminHeader } from './AdminLayout.jsx';
import { ImagesField, Toggle } from './common.jsx';

const blank = {
  name: '', brand: '', categoryId: '', description: '', images: [], specs: {},
  variants: [{ label: '', price: '', mrp: '', tiers: [] }],
  inStock: true, active: true, returnable: true, heavy: false, deal: false, isNew: true, tag: '', kind: 'box', color: '#c7ccd1', hsn: '', gstRate: 0.18,
};

export default function ProductEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { notify, reloadCatalog } = useStore();
  const [p, setP] = useState(isNew ? blank : null);
  const [cats, setCats] = useState([]);
  const [specRows, setSpecRows] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.admin.categories().then((c) => { setCats(c); if (isNew) setP((x) => ({ ...x, categoryId: x.categoryId || c[0]?.id || '' })); });
    if (!isNew) api.admin.product(id).then((x) => { setP(x); setSpecRows(Object.entries(x.specs || {})); }).catch((e) => setErr(e.message));
  }, [id, isNew]);

  if (!p) return <AdminHeader title="Product" sub={err || 'Loading…'} />;
  const set = (k, v) => setP({ ...p, [k]: v });
  const setVar = (i, k, v) => set('variants', p.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const tiersText = (v) => v._tiers ?? (v.tiers || []).map((t) => `${t.min}:${t.price}`).join(', ');

  const save = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const body = {
        ...p,
        specs: Object.fromEntries(specRows.filter(([k, v]) => k.trim() && String(v).trim())),
        variants: p.variants.map((v) => ({
          id: v.id, label: v.label, price: +v.price, mrp: v.mrp === '' ? +v.price : +v.mrp,
          tiers: tiersText(v).split(/[,;]/).map((s) => s.trim()).filter(Boolean).map((s) => { const [min, price] = s.split(':'); return { min: +min, price: +price }; }),
        })),
      };
      const saved = isNew ? await api.admin.createProduct(body) : await api.admin.saveProduct(id, body);
      notify(isNew ? 'Product added' : 'Saved');
      reloadCatalog();
      if (isNew) navigate(`/admin/products/${encodeURIComponent(saved.id)}`, { replace: true });
      else setP(saved);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete “${p.name}” permanently? Past orders keep their copy. To just remove it from the shop, switch off “Show in shop”.`)) return;
    try { await api.admin.deleteProduct(id); notify('Deleted'); reloadCatalog(); navigate('/admin/products'); } catch (x) { setErr(x.message); }
  };

  return (
    <form onSubmit={save}>
      <AdminHeader title={isNew ? 'Add product' : p.name} sub={isNew ? 'Fill in the details and save.' : `ID: ${p.id}`} right={<>
        {!isNew && <Link className="btn sm outline" to={`/p/${encodeURIComponent(p.id)}`} target="_blank"><Icon name="ExternalLink" size={16} />View in shop</Link>}
        <Link className="btn sm ghost" to="/admin/products">Back</Link>
        <button className="btn sm primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </>} />
      {err && <div className="banner warn small" style={{ marginBottom: 14 }}><Icon name="CircleAlert" size={16} />{err}</div>}
      <div className="two-col">
        <div className="col" style={{ gap: 16 }}>
          <section className="glass card col" style={{ padding: 18, gap: 12 }}>
            <h3>Details</h3>
            <label className="field"><span>Product name</span><input className="input" value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. UltraTech PPC Cement" required /></label>
            <div className="grid2">
              <label className="field"><span>Brand</span><input className="input" value={p.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. UltraTech" /></label>
              <div className="field"><label>Category</label>
                <select className="input" value={p.categoryId} onChange={(e) => set('categoryId', e.target.value)}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>
            </div>
            <div className="grid2">
              <label className="field"><span>HSN code</span><input className="input" inputMode="numeric" maxLength={8} value={p.hsn || ''} onChange={(e) => set('hsn', e.target.value.replace(/\D/g, ''))} placeholder="e.g. 2523" /></label>
              <label className="field"><span>GST rate</span>
                <select className="input" value={p.gstRate ?? 0.18} onChange={(e) => set('gstRate', +e.target.value)}>{[0, 0.05, 0.12, 0.18, 0.28, 0.4].map((r) => <option key={r} value={r}>{Math.round(r * 100)}%</option>)}</select>
              </label>
            </div>
            <label className="field"><span>Description (optional)</span><textarea className="input" rows={3} value={p.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="What it's for, coverage, key features" /></label>
          </section>

          <section className="glass card col" style={{ padding: 18, gap: 12 }}>
            <h3>Photos</h3>
            <ImagesField value={p.images || []} onChange={(v) => set('images', v)} />
          </section>

          <section className="glass card col" style={{ padding: 18, gap: 12 }}>
            <div className="row between"><h3>Sizes, prices & bulk tiers</h3>
              <button type="button" className="btn sm outline" onClick={() => set('variants', [...p.variants, { label: '', price: '', mrp: '', tiers: [] }])}><Icon name="Plus" size={14} />Add size</button>
            </div>
            <p className="xs muted">One row per pack size or colour. Bulk tiers like <code>10:415, 30:405</code> mean ₹415 each from 10 units and ₹405 from 30.</p>
            {p.variants.map((v, i) => (
              <div key={v.id || i} className="variant-edit">
                <label className="field"><span>Size / option</span><input className="input" value={v.label} onChange={(e) => setVar(i, 'label', e.target.value)} placeholder="50 kg bag" /></label>
                <label className="field"><span>Price ₹</span><input className="input" type="number" min="1" step="any" value={v.price} onChange={(e) => setVar(i, 'price', e.target.value)} required /></label>
                <label className="field"><span>MRP ₹</span><input className="input" type="number" min="1" step="any" value={v.mrp} onChange={(e) => setVar(i, 'mrp', e.target.value)} /></label>
                <label className="field"><span>Bulk tiers</span><input className="input" value={tiersText(v)} onChange={(e) => setVar(i, '_tiers', e.target.value)} placeholder="10:415, 30:405" /></label>
                {p.variants.length > 1 && <button type="button" className="icon-btn" aria-label="Remove size" onClick={() => set('variants', p.variants.filter((_, j) => j !== i))}><Icon name="Trash2" size={16} /></button>}
              </div>
            ))}
          </section>

          <section className="glass card col" style={{ padding: 18, gap: 10 }}>
            <div className="row between"><h3>Specifications</h3><button type="button" className="btn sm outline" onClick={() => setSpecRows([...specRows, ['', '']])}><Icon name="Plus" size={14} />Add</button></div>
            {specRows.map(([k, v], i) => (
              <div key={i} className="row">
                <input className="input" placeholder="e.g. Grade" value={k} onChange={(e) => setSpecRows(specRows.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} />
                <input className="input" placeholder="e.g. OPC 53" value={v} onChange={(e) => setSpecRows(specRows.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} />
                <button type="button" className="icon-btn" aria-label="Remove" onClick={() => setSpecRows(specRows.filter((_, j) => j !== i))}><Icon name="X" size={16} /></button>
              </div>
            ))}
            {!specRows.length && <p className="xs muted">Grade, weight, coverage, warranty…</p>}
          </section>
        </div>

        <div className="col sticky" style={{ gap: 16 }}>
          <section className="glass card col" style={{ padding: 18, gap: 4 }}>
            <h3 style={{ marginBottom: 6 }}>Visibility & labels</h3>
            <Toggle label="Show in shop" checked={p.active} onChange={(v) => set('active', v)} />
            <Toggle label="In stock" checked={p.inStock} onChange={(v) => set('inStock', v)} />
            <Toggle label="Deal of the week" hint="Shown in the home-page deals row" checked={p.deal} onChange={(v) => set('deal', v)} />
            <Toggle label="New arrival" checked={p.isNew} onChange={(v) => set('isNew', v)} />
            <Toggle label="Returnable" hint="Off for cut-to-size, tinted paints etc." checked={p.returnable} onChange={(v) => set('returnable', v)} />
            <Toggle label="Heavy item" hint="Adds the per-unit loading charge" checked={p.heavy} onChange={(v) => set('heavy', v)} />
            <div className="field" style={{ marginTop: 8 }}><label>Badge (optional)</label><input className="input" value={p.tag || ''} onChange={(e) => set('tag', e.target.value)} placeholder="Bestseller, Value pick…" maxLength={24} /></div>
          </section>
          <section className="glass card col" style={{ padding: 18, gap: 10 }}>
            <h3>Illustration (when there’s no photo)</h3>
            <div className="row">
              <div className="thumb lg"><ProductIllustration kind={p.kind} color={p.color} /></div>
              <div className="col grow">
                <select className="input" value={p.kind} onChange={(e) => set('kind', e.target.value)}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
                <input className="input" type="color" value={p.color} onChange={(e) => set('color', e.target.value)} aria-label="Colour" style={{ padding: 4 }} />
              </div>
            </div>
          </section>
          {!isNew && <button type="button" className="btn danger block" onClick={remove}><Icon name="Trash2" size={16} />Delete product</button>}
        </div>
      </div>
    </form>
  );
}
