import { useEffect, useState } from 'react';
import { api, imageUrl } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { money } from '../../lib/format.js';
import { offerLive } from '../../lib/pricing.js';
import { Icon, Sheet } from '../../components/ui.jsx';
import { AdminHeader } from './AdminLayout.jsx';
import { ImagesField, Toggle, fromLocalInput, toLocalInput } from './common.jsx';

const describe = (c) => {
  const what = c.type === 'percent' ? `${c.value}% off${c.max ? ` (up to ${money(c.max)})` : ''}` : c.type === 'flat' ? `${money(c.value)} off` : 'Free delivery';
  const where = [c.scope?.categories?.length ? `${c.scope.categories.length} categor${c.scope.categories.length > 1 ? 'ies' : 'y'}` : '', c.scope?.brands?.length ? c.scope.brands.join(', ') : ''].filter(Boolean).join(' · ');
  return [what, where && `on ${where}`, c.minCart ? `min ${money(c.minCart)}` : '', c.firstOrderOnly ? 'first order' : ''].filter(Boolean).join(' · ');
};

export default function AdminOffers() {
  const { notify, reloadCatalog, products } = useStore();
  const [s, setS] = useState(null);
  const [cats, setCats] = useState([]);
  const [edit, setEdit] = useState(null);
  const [banner, setBanner] = useState(null);
  useEffect(() => {
    api.admin.settings().then(setS).catch((e) => notify(e.message));
    api.admin.categories().then(setCats).catch(() => {});
  }, [notify]);
  const brands = [...new Set(products.map((p) => p.brand))].sort();

  const persist = async (patch, msg) => {
    try { const next = await api.admin.saveSettings(patch); setS(next); reloadCatalog(); notify(msg); return true; } catch (e) { notify(e.message); return false; }
  };
  const saveOffer = async () => {
    const list = edit.id ? s.coupons.map((c) => (c.id === edit.id ? edit : c)) : [...s.coupons, edit];
    if (await persist({ coupons: list }, 'Offer saved')) setEdit(null);
  };
  const saveBanner = async () => {
    const b = { ...banner, image: banner.images?.[0] || '' };
    const list = banner.id ? s.banners.map((x) => (x.id === banner.id ? b : x)) : [...s.banners, b];
    if (await persist({ banners: list }, 'Banner saved')) setBanner(null);
  };
  if (!s) return <AdminHeader title="Offers & banners" sub="Loading…" />;
  const toggleIn = (arr = [], v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <>
      <AdminHeader title="Offers & banners" sub="Coupons, automatic discounts and home-page banners" right={<>
        <button className="btn sm outline" onClick={() => setBanner({ title: '', subtitle: '', link: '/', color: '#ff4f1f', active: true, images: [] })}><Icon name="Image" size={16} />New banner</button>
        <button className="btn sm primary" onClick={() => setEdit({ code: '', title: '', type: 'percent', value: 10, max: '', minCart: 0, auto: false, firstOrderOnly: false, active: true, scope: { categories: [], brands: [] } })}><Icon name="Plus" size={16} />New offer</button>
      </>} />

      <h3 style={{ margin: '4px 0 10px' }}>Offers</h3>
      <div className="glass card list" style={{ marginBottom: 24 }}>
        {s.coupons.map((c) => (
          <div key={c.id || c.code}>
            <span className="ico"><Icon name={c.auto ? 'Sparkles' : 'TicketPercent'} size={18} /></span>
            <div className="grow">
              <div className="row" style={{ gap: 6 }}><b className="small">{c.auto ? 'Automatic' : c.code}</b><span className="small">{c.title}</span>
                <span className={`status-pill ${offerLive(c) ? 'ok' : ''}`}>{offerLive(c) ? 'Live' : c.active === false ? 'Off' : 'Scheduled / ended'}</span></div>
              <div className="xs muted">{describe(c)}{c.endsAt ? ` · ends ${new Date(c.endsAt).toLocaleDateString('en-IN')}` : ''}</div>
            </div>
            <button className="btn sm outline" onClick={() => setEdit({ ...c, scope: c.scope || { categories: [], brands: [] } })}>Edit</button>
            <button className="icon-btn" aria-label="Delete offer" onClick={() => window.confirm('Delete this offer?') && persist({ coupons: s.coupons.filter((x) => x !== c) }, 'Offer deleted')}><Icon name="Trash2" size={16} /></button>
          </div>
        ))}
        {!s.coupons.length && <div className="small muted">No offers yet.</div>}
      </div>

      <h3 style={{ margin: '4px 0 10px' }}>Home-page banners</h3>
      <div className="offers">
        {s.banners.map((b) => (
          <div key={b.id} className="offer" style={{ background: b.image ? `linear-gradient(0deg,rgba(0,0,0,.55),rgba(0,0,0,.1)), url(${imageUrl(b.image)}) center/cover` : b.color, opacity: b.active ? 1 : 0.5 }}>
            <div><h3>{b.title}</h3><div className="small" style={{ opacity: 0.85 }}>{b.subtitle}</div></div>
            <div className="row">
              <button className="btn sm" style={{ background: 'rgba(255,255,255,.25)', color: '#fff' }} onClick={() => setBanner({ ...b, images: b.image ? [b.image] : [] })}>Edit</button>
              <button className="btn sm" style={{ background: 'rgba(255,255,255,.25)', color: '#fff' }} onClick={() => window.confirm('Delete this banner?') && persist({ banners: s.banners.filter((x) => x.id !== b.id) }, 'Banner deleted')}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit offer' : 'New offer'}>
        {edit && (
          <div className="col">
            <div className="seg">
              <button type="button" className={!edit.auto ? 'on' : ''} onClick={() => setEdit({ ...edit, auto: false })}>Coupon code</button>
              <button type="button" className={edit.auto ? 'on' : ''} onClick={() => setEdit({ ...edit, auto: true })}>Automatic</button>
            </div>
            <p className="xs muted">{edit.auto ? 'Applies by itself when the cart qualifies; the best automatic offer wins. A valid code the customer enters replaces it.' : 'Customers enter the code in the cart.'}</p>
            {!edit.auto && <label className="field"><span>Code</span><input className="input" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} placeholder="MONSOON10" style={{ textTransform: 'uppercase' }} /></label>}
            <label className="field"><span>Title shown to customers</span><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="10% off waterproofing this monsoon" /></label>
            <div className="seg">
              {[['percent', '% off'], ['flat', '₹ off'], ['freeDelivery', 'Free delivery']].map(([v, l]) => <button type="button" key={v} className={edit.type === v ? 'on' : ''} onClick={() => setEdit({ ...edit, type: v })}>{l}</button>)}
            </div>
            <div className="grid2">
              {edit.type !== 'freeDelivery' && <label className="field"><span>{edit.type === 'percent' ? 'Percent' : 'Amount ₹'}</span><input className="input" type="number" min="1" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} /></label>}
              {edit.type === 'percent' && <label className="field"><span>Max discount ₹ (optional)</span><input className="input" type="number" min="0" value={edit.max || ''} onChange={(e) => setEdit({ ...edit, max: e.target.value })} /></label>}
              <label className="field"><span>Minimum spend ₹</span><input className="input" type="number" min="0" value={edit.minCart} onChange={(e) => setEdit({ ...edit, minCart: e.target.value })} /></label>
            </div>
            <div className="grid2">
              <label className="field"><span>Starts (optional)</span><input className="input" type="datetime-local" value={toLocalInput(edit.startsAt)} onChange={(e) => setEdit({ ...edit, startsAt: fromLocalInput(e.target.value) })} /></label>
              <label className="field"><span>Ends (optional)</span><input className="input" type="datetime-local" value={toLocalInput(edit.endsAt)} onChange={(e) => setEdit({ ...edit, endsAt: fromLocalInput(e.target.value) })} /></label>
            </div>
            <details>
              <summary className="small" style={{ fontWeight: 600, cursor: 'pointer' }}>Limit to categories or brands ({(edit.scope.categories.length + edit.scope.brands.length) || 'whole cart'})</summary>
              <div className="chips wrap" style={{ flexWrap: 'wrap', marginTop: 8 }}>{cats.map((c) => <button type="button" key={c.id} className={`chip ${edit.scope.categories.includes(c.id) ? 'on' : ''}`} onClick={() => setEdit({ ...edit, scope: { ...edit.scope, categories: toggleIn(edit.scope.categories, c.id) } })}>{c.name}</button>)}</div>
              <div className="chips wrap" style={{ flexWrap: 'wrap', marginTop: 8 }}>{brands.map((b) => <button type="button" key={b} className={`chip ${edit.scope.brands.includes(b) ? 'on' : ''}`} onClick={() => setEdit({ ...edit, scope: { ...edit.scope, brands: toggleIn(edit.scope.brands, b) } })}>{b}</button>)}</div>
            </details>
            <Toggle label="First order only" checked={edit.firstOrderOnly} onChange={(v) => setEdit({ ...edit, firstOrderOnly: v })} />
            <Toggle label="Active" checked={edit.active !== false} onChange={(v) => setEdit({ ...edit, active: v })} />
            <button className="btn primary block" onClick={saveOffer}>Save offer</button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!banner} onClose={() => setBanner(null)} title={banner?.id ? 'Edit banner' : 'New banner'}>
        {banner && (
          <div className="col">
            <label className="field"><span>Title</span><input className="input" value={banner.title} onChange={(e) => setBanner({ ...banner, title: e.target.value })} /></label>
            <label className="field"><span>Subtitle</span><input className="input" value={banner.subtitle} onChange={(e) => setBanner({ ...banner, subtitle: e.target.value })} /></label>
            <label className="field"><span>Opens (link)</span><input className="input" value={banner.link} onChange={(e) => setBanner({ ...banner, link: e.target.value })} placeholder="/c/cement, /p/ultratech-ppc or /calculator" /></label>
            <div className="field"><label>Background image (optional)</label><ImagesField value={banner.images} max={1} onChange={(v) => setBanner({ ...banner, images: v })} /></div>
            <label className="field"><span>Colour (used without an image)</span><input className="input" type="color" value={banner.color} onChange={(e) => setBanner({ ...banner, color: e.target.value })} style={{ padding: 4 }} /></label>
            <div className="grid2">
              <label className="field"><span>Starts</span><input className="input" type="datetime-local" value={toLocalInput(banner.startsAt)} onChange={(e) => setBanner({ ...banner, startsAt: fromLocalInput(e.target.value) })} /></label>
              <label className="field"><span>Ends</span><input className="input" type="datetime-local" value={toLocalInput(banner.endsAt)} onChange={(e) => setBanner({ ...banner, endsAt: fromLocalInput(e.target.value) })} /></label>
            </div>
            <Toggle label="Active" checked={banner.active} onChange={(v) => setBanner({ ...banner, active: v })} />
            <button className="btn primary block" onClick={saveBanner}>Save banner</button>
          </div>
        )}
      </Sheet>
    </>
  );
}
