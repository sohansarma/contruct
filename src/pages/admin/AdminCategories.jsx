import { useEffect, useState } from 'react';
import { api, imageUrl } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { Icon, Sheet } from '../../components/ui.jsx';
import ProductIllustration from '../../components/ProductArt.jsx';
import { AdminHeader } from './AdminLayout.jsx';
import { ImagesField, Toggle } from './common.jsx';

export default function AdminCategories() {
  const { notify, reloadCatalog } = useStore();
  const [cats, setCats] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = () => api.admin.categories().then(setCats).catch((e) => notify(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const after = async (msg) => { notify(msg); await load(); reloadCatalog(); };

  const move = async (i, d) => {
    const ids = cats.map((c) => c.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    setCats(ids.map((id) => cats.find((c) => c.id === id)));
    try { await api.admin.orderCategories(ids); reloadCatalog(); } catch (e) { notify(e.message); load(); }
  };
  const save = async () => {
    try {
      const body = { name: edit.name, blurb: edit.blurb, image: edit.images?.[0] || '', hidden: !!edit.hidden };
      if (edit.id) await api.admin.updateCategory(edit.id, body); else await api.admin.createCategory(body);
      setEdit(null); after('Category saved');
    } catch (e) { notify(e.message); }
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete “${c.name}”?`)) return;
    try { await api.admin.deleteCategory(c.id); after('Category deleted'); } catch (e) { notify(e.message); }
  };

  return (
    <>
      <AdminHeader title="Categories" sub="The order here is the order in the shop" right={<button className="btn sm primary" onClick={() => setEdit({ name: '', blurb: '', images: [] })}><Icon name="Plus" size={16} />Add category</button>} />
      <div className="glass card list">
        {(cats || []).map((c, i) => (
          <div key={c.id}>
            <div className="thumb">{c.image ? <img src={imageUrl(c.image)} alt="" /> : c.art ? <ProductIllustration kind={c.art[0]} color={c.art[1]} /> : <Icon name={c.icon} />}</div>
            <div className="grow">
              <b className="small">{c.name}</b>{c.hidden && <span className="status-pill bad" style={{ marginLeft: 6 }}>Hidden</span>}
              <div className="xs muted">{c.blurb || '—'} · {c.products} products</div>
            </div>
            <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="ChevronUp" size={16} /></button>
            <button className="icon-btn" aria-label="Move down" disabled={i === cats.length - 1} onClick={() => move(i, 1)}><Icon name="ChevronDown" size={16} /></button>
            <button className="btn sm outline" onClick={() => setEdit({ ...c, images: c.image ? [c.image] : [] })}>Edit</button>
            <button className="icon-btn" aria-label="Delete" onClick={() => remove(c)}><Icon name="Trash2" size={16} /></button>
          </div>
        ))}
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit category' : 'New category'}>
        {edit && (
          <div className="col">
            <label className="field"><span>Name</span><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <label className="field"><span>Short description</span><input className="input" value={edit.blurb || ''} onChange={(e) => setEdit({ ...edit, blurb: e.target.value })} placeholder="e.g. PPC & OPC cement, white cement" /></label>
            <div className="field"><label>Image (optional)</label><ImagesField value={edit.images} max={1} onChange={(v) => setEdit({ ...edit, images: v })} /></div>
            {edit.id && <Toggle label="Hide from shop" checked={edit.hidden} onChange={(v) => setEdit({ ...edit, hidden: v })} />}
            <button className="btn primary block" onClick={save}>Save</button>
          </div>
        )}
      </Sheet>
    </>
  );
}
