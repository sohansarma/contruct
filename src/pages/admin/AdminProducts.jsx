import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { money } from '../../lib/format.js';
import { Icon, Sheet } from '../../components/ui.jsx';
import ProductIllustration from '../../components/ProductArt.jsx';
import { AdminHeader } from './AdminLayout.jsx';
import { download, parseCsv, toCsv } from './common.jsx';

const CSV_COLUMNS = ['id', 'name', 'brand', 'category', 'option', 'price', 'mrp', 'tiers', 'hsn', 'gst_rate', 'in_stock', 'returnable', 'heavy', 'active', 'images', 'description'];

export default function AdminProducts() {
  const { notify, reloadCatalog } = useStore();
  const [list, setList] = useState(null);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [view, setView] = useState('all');
  const [sel, setSel] = useState([]);
  const [importing, setImporting] = useState(null);
  const file = useRef();
  const load = () => Promise.all([api.admin.products(), api.admin.categories()]).then(([p, c]) => { setList(p); setCats(c); }).catch((e) => notify(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => (list || []).filter((p) =>
    (!cat || p.categoryId === cat) &&
    (view === 'all' || (view === 'out' && !p.inStock) || (view === 'hidden' && !p.active) || (view === 'nophoto' && !p.images?.length) || (view === 'estimate' && p.priceSource === 'estimate') || (view === 'deal' && p.deal)) &&
    `${p.name} ${p.brand} ${p.id}`.toLowerCase().includes(q.toLowerCase())), [list, cat, view, q]);
  const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));

  const done = async (msg) => { notify(msg); setSel([]); await load(); reloadCatalog(); };
  const bulk = async (body, msg) => { try { await api.admin.bulkProducts({ ids: sel, ...body }); done(msg); } catch (e) { notify(e.message); } };
  const quick = async (p, patch, msg) => { try { await api.admin.patchProduct(p.id, patch); done(msg); } catch (e) { notify(e.message); } };

  const exportCsv = () => {
    const rows = (list || []).flatMap((p) => p.variants.map((v) => ({
      id: p.id, name: p.name, brand: p.brand, category: p.categoryId, option: v.label, price: v.price, mrp: v.mrp,
      tiers: (v.tiers || []).map((t) => `${t.min}:${t.price}`).join(';'), in_stock: p.inStock ? 'yes' : 'no', returnable: p.returnable ? 'yes' : 'no',
      hsn: p.hsn || '', gst_rate: Math.round((p.gstRate ?? 0.18) * 100), heavy: p.heavy ? 'yes' : 'no', active: p.active ? 'yes' : 'no', images: (p.images || []).join('|'), description: p.description || '',
    })));
    download(`products-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows, CSV_COLUMNS));
  };
  const pickCsv = async (f) => {
    if (!f) return;
    const rows = parseCsv(await f.text());
    file.current.value = '';
    if (!rows.length || !('name' in rows[0] || 'id' in rows[0])) return notify('That file has no name/id column. Export a CSV first to see the format.');
    setImporting({ rows, result: null });
  };
  const runImport = async () => {
    try { const result = await api.admin.importProducts(importing.rows); setImporting({ ...importing, result }); await load(); reloadCatalog(); } catch (e) { notify(e.message); }
  };

  const counts = { out: (list || []).filter((p) => !p.inStock).length, nophoto: (list || []).filter((p) => !p.images?.length).length, estimate: (list || []).filter((p) => p.priceSource === 'estimate').length };

  return (
    <>
      <AdminHeader title="Products" sub={list ? `${list.length} products` : 'Loading…'} right={<>
        <button className="btn sm outline" onClick={exportCsv}><Icon name="Download" size={16} />Export CSV</button>
        <button className="btn sm outline" onClick={() => file.current.click()}><Icon name="Upload" size={16} />Import CSV</button>
        <Link className="btn sm primary" to="/admin/products/new"><Icon name="Plus" size={16} />Add product</Link>
      </>} />
      <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => pickCsv(e.target.files[0])} />
      <div className="row wrap" style={{ marginBottom: 10 }}>
        <input className="input grow" style={{ maxWidth: 300 }} placeholder="Search name, brand or id" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 240 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {[['all', 'All'], ['out', `Out of stock (${counts.out})`], ['nophoto', `No photo (${counts.nophoto})`], ['estimate', `Price not set (${counts.estimate})`], ['deal', 'Deals'], ['hidden', 'Hidden']].map(([v, l]) => (
          <button key={v} className={`chip ${view === v ? 'on' : ''}`} onClick={() => setView(v)}>{l}</button>
        ))}
      </div>
      {sel.length > 0 && (
        <div className="glass card row wrap" style={{ padding: 10, marginBottom: 12, position: 'sticky', top: 80, zIndex: 5 }}>
          <b className="small">{sel.length} selected</b>
          <button className="btn sm outline" onClick={() => bulk({ inStock: true }, 'Marked in stock')}>In stock</button>
          <button className="btn sm outline" onClick={() => bulk({ inStock: false }, 'Marked out of stock')}>Out of stock</button>
          <button className="btn sm outline" onClick={() => bulk({ deal: true }, 'Added to deals')}>Add to deals</button>
          <button className="btn sm outline" onClick={() => bulk({ deal: false }, 'Removed from deals')}>Remove deal</button>
          <button className="btn sm outline" onClick={() => bulk({ active: false }, 'Hidden from shop')}>Hide</button>
          <button className="btn sm outline" onClick={() => bulk({ active: true }, 'Shown in shop')}>Show</button>
          <button className="btn sm outline" onClick={() => { const v = window.prompt('Change prices by what %? e.g. -5 for 5% off, 3 for a 3% increase'); if (v && +v) bulk({ adjustPercent: +v }, `Prices changed by ${v}%`); }}>Change price %</button>
          <button className="btn sm ghost" onClick={() => setSel([])}>Clear</button>
        </div>
      )}
      <div className="glass card" style={{ overflowX: 'auto', padding: 6 }}>
        <table className="t">
          <thead><tr>
            <th><input type="checkbox" className="check" aria-label="Select all" checked={shown.length > 0 && sel.length === shown.length} onChange={(e) => setSel(e.target.checked ? shown.map((p) => p.id) : [])} /></th>
            <th>Product</th><th>Category</th><th className="num">Price</th><th>Stock</th><th>Shop</th>
          </tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td><input type="checkbox" className="check" aria-label={`Select ${p.name}`} checked={sel.includes(p.id)} onChange={(e) => setSel(e.target.checked ? [...sel, p.id] : sel.filter((x) => x !== p.id))} /></td>
                <td>
                  <Link to={`/admin/products/${encodeURIComponent(p.id)}`} className="row" style={{ gap: 10 }}>
                    <div className="thumb">{p.images?.[0] ? <img src={imageUrl(p.images[0])} alt="" /> : <ProductIllustration kind={p.kind} color={p.color} />}</div>
                    <span><b className="small">{p.name}</b><div className="xs faint">{p.brand} · {p.variants.length} option{p.variants.length > 1 ? 's' : ''}{p.deal ? ' · Deal' : ''}{p.priceSource === 'estimate' ? ' · price not set' : ''}</div></span>
                  </Link>
                </td>
                <td className="small">{catName[p.categoryId] || p.categoryId}</td>
                <td className="num small">{money(Math.min(...p.variants.map((v) => v.price)))}{p.variants.length > 1 && '+'}</td>
                <td><button className={`btn sm ${p.inStock ? 'outline' : 'danger'}`} onClick={() => quick(p, { inStock: !p.inStock }, p.inStock ? 'Marked out of stock' : 'Back in stock')}>{p.inStock ? 'In stock' : 'Out of stock'}</button></td>
                <td><button className={`btn sm ${p.active ? 'ghost' : 'danger'}`} onClick={() => quick(p, { active: !p.active }, p.active ? 'Hidden' : 'Visible')}>{p.active ? 'Visible' : 'Hidden'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {list && !shown.length && <p className="small muted" style={{ padding: 16 }}>No products match.</p>}
      </div>

      <Sheet open={!!importing} onClose={() => setImporting(null)} title="Import products">
        {importing && !importing.result && (
          <div className="col">
            <p className="small">{importing.rows.length} rows found. Each row is one size/option; rows with the same <code>id</code> (or brand + name) become one product. Existing products are updated, new ones are added.</p>
            <p className="xs muted">Columns: {CSV_COLUMNS.join(', ')}. Tiers like <code>10:415;30:405</code>. Images separated by <code>|</code>. Category can be the name or id.</p>
            <button className="btn primary block" onClick={runImport}>Import {importing.rows.length} rows</button>
          </div>
        )}
        {importing?.result && (
          <div className="col">
            <div className="banner ok small">{importing.result.created} added · {importing.result.updated} updated</div>
            {importing.result.errors.map((e) => <div key={e.row} className="small red">Row {e.row} ({e.product}): {e.error}</div>)}
            <button className="btn dark block" onClick={() => setImporting(null)}>Done</button>
          </div>
        )}
      </Sheet>
    </>
  );
}
