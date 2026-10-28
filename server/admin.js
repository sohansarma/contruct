// Admin API: everything the store owner manages without touching code.
import express from 'express';
import { GridFSBucket, ObjectId } from 'mongodb';
import { col, getClient } from './db.js';
import { HttpError, publicUser, requireUser } from './auth.js';
import { adminSetStatus, serializeOrder, walletBalance } from './orders.js';
import { adminSettings, saveSettings } from './settings.js';

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const slug = (s) => str(s, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const out = ({ _id, ...p }) => ({ ...p, id: _id });
const GST_RATES = [0, 0.05, 0.12, 0.18, 0.28, 0.4];

export const bucket = () => new GridFSBucket(getClient().db(), { bucketName: 'images' });

/** Validate and normalise a product from the admin editor or CSV import. */
export async function cleanProduct(body, existing = {}) {
  const name = str(body.name ?? existing.name, 120);
  if (!name) throw new HttpError(400, 'Product name is required.');
  const categoryId = str(body.categoryId ?? existing.categoryId, 40);
  const category = await col('categories').findOne({ _id: categoryId });
  if (!category) throw new HttpError(400, `Unknown category “${categoryId}”.`);
  const variantsIn = Array.isArray(body.variants) && body.variants.length ? body.variants : existing.variants;
  if (!variantsIn?.length) throw new HttpError(400, 'Add at least one size / option with a price.');
  const id = existing._id || str(body.id, 60) || slug(`${body.brand || ''} ${name}`);
  const variants = variantsIn.slice(0, 30).map((v, i) => {
    const price = num(v.price);
    const mrp = v.mrp === '' || v.mrp == null ? price : num(v.mrp);
    const label = str(v.label, 40) || str(body.unit ?? existing.unit, 40) || 'Each';
    if (!(price > 0)) throw new HttpError(400, `Enter a price for “${label}”.`);
    if (!(mrp >= price)) throw new HttpError(400, `MRP for “${label}” must be at least the price.`);
    const tiers = (v.tiers || [])
      .map((t) => ({ min: Math.floor(num(t.min)), price: num(t.price) }))
      .filter((t) => t.min > 1 && t.price > 0)
      .sort((a, b) => a.min - b.min);
    for (const t of tiers) if (!(t.price < price)) throw new HttpError(400, `Bulk price for ${t.min}+ of “${label}” must be lower than ₹${price}.`);
    return { id: str(v.id, 80) || `${id}-${i}-${Math.random().toString(36).slice(2, 6)}`, label, price, mrp, tiers };
  });
  const images = (body.images ?? existing.images ?? []).map((u) => str(u, 400)).filter((u) => u.startsWith('/api/images/') || /^https:\/\//.test(u)).slice(0, 8);
  const specs = {};
  for (const [k, v] of Object.entries(body.specs ?? existing.specs ?? {}).slice(0, 20)) if (str(k, 40) && str(v, 120)) specs[str(k, 40)] = str(v, 120);
  const bool = (k, d) => (k in body ? !!body[k] : existing[k] ?? d);
  return {
    _id: id,
    name,
    brand: str(body.brand ?? existing.brand, 60) || 'Generic',
    categoryId,
    unit: variants.length > 1 ? '' : variants[0].label,
    description: str(body.description ?? existing.description, 2000),
    variants,
    specs,
    images,
    image: images[0] || null,
    returnable: bool('returnable', true),
    heavy: bool('heavy', false),
    inStock: bool('inStock', true),
    active: bool('active', true),
    deal: bool('deal', false),
    isNew: bool('isNew', false),
    tag: str(body.tag ?? existing.tag, 24) || null,
    hsn: (str(body.hsn ?? existing.hsn, 8).replace(/\D/g, '') || category.hsn || ''),
    gstRate: GST_RATES.includes(Number(body.gstRate ?? existing.gstRate)) ? Number(body.gstRate ?? existing.gstRate) : 0.18,
    kind: str(body.kind ?? existing.kind, 20) || 'box',
    color: /^#[0-9a-f]{6}$/i.test(body.color ?? '') ? body.color : existing.color || '#c7ccd1',
    priceSource: 'admin',
  };
}

export function adminRouter() {
  const r = express.Router();
  r.use(requireUser({ admin: true }));

  // ---------- dashboard
  r.get('/stats', async (_req, res) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [today] = await col('orders').aggregate([
      { $match: { createdAt: { $gte: start }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $add: ['$bill.total', { $ifNull: ['$bill.wallet', 0] }] } } } },
    ]).toArray();
    const [active, returns, quotes, customers, lowStock, products] = await Promise.all([
      col('orders').countDocuments({ status: { $in: ['placed', 'confirmed', 'packed', 'out_for_delivery'] } }),
      col('orders').countDocuments({ status: 'return_requested' }),
      col('quotes').countDocuments({ status: 'new' }),
      col('users').countDocuments(),
      col('products').countDocuments({ active: true, inStock: false }),
      col('products').countDocuments({ active: true }),
    ]);
    const days = await col('orders').aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 14 * 864e5) }, status: { $ne: 'cancelled' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, orders: { $sum: 1 }, revenue: { $sum: { $add: ['$bill.total', { $ifNull: ['$bill.wallet', 0] }] } } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    const top = await col('orders').aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 864e5) }, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', name: { $first: '$items.name' }, qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } },
      { $sort: { revenue: -1 } }, { $limit: 8 },
    ]).toArray();
    res.json({ today: { orders: today?.orders || 0, revenue: today?.revenue || 0 }, active, returns, quotes, customers, lowStock, products, days, top });
  });

  // ---------- orders & quotes
  r.get('/orders', async (req, res) => {
    const q = {};
    if (req.query.status === 'active') q.status = { $in: ['placed', 'confirmed', 'packed', 'out_for_delivery', 'return_requested'] };
    else if (req.query.status) q.status = str(req.query.status, 30);
    if (req.query.q) {
      const s = str(req.query.q, 40);
      q.$or = [{ _id: s.toUpperCase() }, { 'address.phone': { $regex: s.replace(/\D/g, '') || '^$' } }, { 'address.name': { $regex: s.replace(/[^\w\s]/g, ''), $options: 'i' } }];
    }
    res.json((await col('orders').find(q).sort({ createdAt: -1 }).limit(300).toArray()).map(serializeOrder));
  });
  r.post('/orders/:id/status', async (req, res) => res.json(await adminSetStatus(req.user, req.params.id, req.body.status, req.body)));
  r.get('/quotes', async (_req, res) => res.json((await col('quotes').find().sort({ createdAt: -1 }).limit(300).toArray()).map(({ _id, createdAt, ...q }) => ({ ...q, id: String(_id), at: +createdAt }))));
  r.patch('/quotes/:id', async (req, res) => {
    const status = ['new', 'contacted', 'won', 'lost'].includes(req.body.status) ? req.body.status : 'new';
    await col('quotes').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status, note: str(req.body.note, 500) } });
    res.json({ ok: true });
  });
  r.get('/refunds', async (_req, res) => res.json(await col('refunds').find().sort({ createdAt: -1 }).limit(300).toArray()));

  // ---------- products
  r.get('/products', async (_req, res) => res.json((await col('products').find().sort({ categoryId: 1, name: 1 }).toArray()).map(out)));
  r.get('/products/:id', async (req, res) => {
    const p = await col('products').findOne({ _id: req.params.id });
    if (!p) throw new HttpError(404, 'Product not found.');
    res.json(out(p));
  });
  r.post('/products', async (req, res) => {
    const p = await cleanProduct(req.body);
    if (await col('products').findOne({ _id: p._id })) throw new HttpError(409, `A product with id “${p._id}” already exists.`);
    await col('products').insertOne({ ...p, createdAt: new Date(), updatedAt: new Date() });
    res.status(201).json(out(p));
  });
  r.put('/products/:id', async (req, res) => {
    const existing = await col('products').findOne({ _id: req.params.id });
    if (!existing) throw new HttpError(404, 'Product not found.');
    const p = await cleanProduct(req.body, existing);
    await col('products').replaceOne({ _id: existing._id }, { ...p, createdAt: existing.createdAt, updatedAt: new Date() });
    res.json(out(p));
  });
  // quick edits from the list: price / stock / flags
  r.patch('/products/:id', async (req, res) => {
    const existing = await col('products').findOne({ _id: req.params.id });
    if (!existing) throw new HttpError(404, 'Product not found.');
    const body = { ...req.body };
    if (Array.isArray(body.variants)) body.variants = existing.variants.map((v) => ({ ...v, ...(body.variants.find((x) => x.id === v.id) || {}) }));
    const p = await cleanProduct(body, existing);
    await col('products').replaceOne({ _id: existing._id }, { ...p, createdAt: existing.createdAt, updatedAt: new Date() });
    res.json(out(p));
  });
  r.delete('/products/:id', async (req, res) => {
    const { deletedCount } = await col('products').deleteOne({ _id: req.params.id });
    if (!deletedCount) throw new HttpError(404, 'Product not found.');
    res.json({ ok: true });
  });
  r.post('/products/bulk', async (req, res) => {
    const ids = (req.body.ids || []).map((x) => str(x, 60));
    const $set = {};
    for (const k of ['inStock', 'active', 'deal', 'isNew']) if (typeof req.body[k] === 'boolean') $set[k] = req.body[k];
    if (Number.isFinite(+req.body.adjustPercent) && +req.body.adjustPercent !== 0) {
      // change prices (and tiers) by a percentage, e.g. -5 for a 5% cut
      const f = 1 + Number(req.body.adjustPercent) / 100;
      if (!(f > 0.1 && f < 3)) throw new HttpError(400, 'Price change must be between −90% and +200%.');
      for (const p of await col('products').find({ _id: { $in: ids } }).toArray()) {
        const variants = p.variants.map((v) => {
          const price = Math.max(1, Math.round(v.price * f));
          return { ...v, price, mrp: Math.max(v.mrp, price), tiers: (v.tiers || []).map((t) => ({ ...t, price: Math.min(price - 1, Math.max(1, Math.round(t.price * f))) })) };
        });
        await col('products').updateOne({ _id: p._id }, { $set: { variants, priceSource: 'admin', updatedAt: new Date() } });
      }
    }
    if (Object.keys($set).length) await col('products').updateMany({ _id: { $in: ids } }, { $set: { ...$set, updatedAt: new Date() } });
    res.json({ ok: true, count: ids.length });
  });

  // CSV import: rows already parsed by the admin app. One row per size/option;
  // rows with the same product id (or brand + name) are grouped into one product.
  r.post('/products/import', async (req, res) => {
    const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 5000) : [];
    const cats = await col('categories').find().toArray();
    const catId = (v) => {
      const s = str(v, 60).toLowerCase();
      return cats.find((c) => c._id === s || c.name.toLowerCase() === s)?._id || s;
    };
    const groups = new Map();
    rows.forEach((row, i) => {
      const id = str(row.id, 60) || slug(`${row.brand || ''} ${row.name || ''}`);
      if (!groups.has(id)) groups.set(id, { first: i, row, variants: [] });
      groups.get(id).variants.push({ row, i });
    });
    let created = 0, updated = 0;
    const errors = [];
    for (const [id, g] of groups) {
      try {
        const existing = (await col('products').findOne({ _id: id })) || {};
        const r0 = g.row;
        const tiers = (t) => str(t, 200).split(/[,;]/).map((s) => s.trim()).filter(Boolean).map((s) => { const [min, price] = s.split(':'); return { min, price }; });
        const yes = (v, d) => (v === undefined || v === '' ? d : /^(1|y|yes|true)$/i.test(String(v).trim()));
        const body = {
          id, name: r0.name || existing.name, brand: r0.brand || existing.brand,
          categoryId: r0.category ? catId(r0.category) : existing.categoryId,
          description: r0.description ?? existing.description,
          variants: g.variants.map(({ row }) => {
            const prev = existing.variants?.find((v) => v.label === str(row.option || row.unit, 40));
            return { id: prev?.id, label: row.option || row.unit, price: row.price, mrp: row.mrp, tiers: row.tiers !== undefined ? tiers(row.tiers) : prev?.tiers || [] };
          }),
          images: r0.images ? str(r0.images, 2000).split('|').map((s) => s.trim()) : existing.images,
          inStock: yes(r0.in_stock ?? r0.stock, existing.inStock ?? true),
          returnable: yes(r0.returnable, existing.returnable ?? true),
          heavy: yes(r0.heavy, existing.heavy ?? false),
          hsn: r0.hsn ?? existing.hsn,
          gstRate: r0.gst_rate ? (Number(r0.gst_rate) > 1 ? Number(r0.gst_rate) / 100 : Number(r0.gst_rate)) : existing.gstRate,
          active: yes(r0.active, existing.active ?? true),
        };
        const p = await cleanProduct(body, existing._id ? existing : {});
        await col('products').replaceOne({ _id: p._id }, { ...p, createdAt: existing.createdAt || new Date(), updatedAt: new Date() }, { upsert: true });
        existing._id ? updated++ : created++;
      } catch (e) {
        errors.push({ row: g.first + 2, product: id, error: e.message });
      }
    }
    res.json({ created, updated, errors });
  });

  // ---------- images (stored in MongoDB GridFS; served from /api/images/:id)
  r.post('/images', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '6mb' }), async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) throw new HttpError(400, 'Upload a JPG, PNG or WebP image.');
    const type = req.headers['content-type'];
    const magic = req.body.subarray(0, 12).toString('hex');
    const ok = (type === 'image/jpeg' && magic.startsWith('ffd8ff')) || (type === 'image/png' && magic.startsWith('89504e47')) || (type === 'image/webp' && req.body.subarray(8, 12).toString() === 'WEBP');
    if (!ok) throw new HttpError(400, 'That file is not a valid image.');
    const id = await new Promise((resolve, reject) => {
      const up = bucket().openUploadStream(str(req.headers['x-filename'], 80) || 'image', { metadata: { contentType: type, by: req.user._id } });
      up.on('finish', () => resolve(up.id)).on('error', reject);
      up.end(req.body);
    });
    res.status(201).json({ url: `/api/images/${id}` });
  });

  // ---------- categories
  r.get('/categories', async (_req, res) => {
    const [cats, counts] = await Promise.all([
      col('categories').find().sort({ sort: 1 }).toArray(),
      col('products').aggregate([{ $group: { _id: '$categoryId', n: { $sum: 1 } } }]).toArray(),
    ]);
    const n = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.json(cats.map((c) => ({ ...out(c), products: n[c._id] || 0 })));
  });
  r.post('/categories', async (req, res) => {
    const name = str(req.body.name, 60);
    if (!name) throw new HttpError(400, 'Category name is required.');
    const id = slug(req.body.id || name);
    if (await col('categories').findOne({ _id: id })) throw new HttpError(409, 'A category with this name already exists.');
    const last = await col('categories').find().sort({ sort: -1 }).limit(1).next();
    const doc = { _id: id, name, blurb: str(req.body.blurb, 120), icon: 'Package', tint: '#8e8e93', art: ['box', '#c7ccd1'], image: str(req.body.image, 400) || null, hidden: false, sort: (last?.sort ?? -1) + 1 };
    await col('categories').insertOne(doc);
    res.status(201).json(out(doc));
  });
  r.patch('/categories/:id', async (req, res) => {
    const $set = {};
    if ('name' in req.body) { $set.name = str(req.body.name, 60); if (!$set.name) throw new HttpError(400, 'Category name is required.'); }
    if ('blurb' in req.body) $set.blurb = str(req.body.blurb, 120);
    if ('image' in req.body) $set.image = str(req.body.image, 400) || null;
    if ('hidden' in req.body) $set.hidden = !!req.body.hidden;
    const c = await col('categories').findOneAndUpdate({ _id: req.params.id }, { $set }, { returnDocument: 'after' });
    if (!c) throw new HttpError(404, 'Category not found.');
    res.json(out(c));
  });
  r.post('/categories/order', async (req, res) => {
    const ids = (req.body.ids || []).map((x) => str(x, 40));
    await col('categories').bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { sort: i } } } })));
    res.json({ ok: true });
  });
  r.delete('/categories/:id', async (req, res) => {
    const n = await col('products').countDocuments({ categoryId: req.params.id });
    if (n) throw new HttpError(400, `Move or delete its ${n} products first.`);
    await col('categories').deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  });

  // ---------- settings, offers, banners
  r.get('/settings', (_req, res) => res.json(adminSettings()));
  r.put('/settings', async (req, res) => res.json(await saveSettings(req.body)));

  // ---------- customers
  r.get('/customers', async (req, res) => {
    const q = req.query.q ? { $or: [{ phone: { $regex: str(req.query.q, 20).replace(/\D/g, '') || '^$' } }, { name: { $regex: str(req.query.q, 40).replace(/[^\w\s]/g, ''), $options: 'i' } }] } : {};
    const users = await col('users').find(q).sort({ createdAt: -1 }).limit(300).toArray();
    const ids = users.map((u) => u._id);
    const [orders, wallets] = await Promise.all([
      col('orders').aggregate([{ $match: { userId: { $in: ids }, status: { $ne: 'cancelled' } } }, { $group: { _id: '$userId', orders: { $sum: 1 }, spent: { $sum: '$bill.total' }, last: { $max: '$createdAt' } } }]).toArray(),
      col('wallet_txns').aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: '$userId', balance: { $sum: '$amount' } } }]).toArray(),
    ]);
    const o = Object.fromEntries(orders.map((x) => [String(x._id), x]));
    const w = Object.fromEntries(wallets.map((x) => [String(x._id), x.balance]));
    res.json(users.map((u) => ({ ...publicUser(u), joined: +u.createdAt, orders: o[u._id]?.orders || 0, spent: o[u._id]?.spent || 0, lastOrder: o[u._id]?.last ? +o[u._id].last : null, wallet: w[u._id] || 0 })));
  });
  r.post('/customers/:id/wallet', async (req, res) => {
    const userId = new ObjectId(req.params.id);
    const amount = Math.round(num(req.body.amount));
    if (!amount || Math.abs(amount) > 100000) throw new HttpError(400, 'Enter an amount up to ₹1,00,000 (negative to deduct).');
    if (!(await col('users').findOne({ _id: userId }))) throw new HttpError(404, 'Customer not found.');
    if (amount < 0 && (await walletBalance(userId)) + amount < 0) throw new HttpError(400, 'Credit can’t go below zero.');
    await col('wallet_txns').insertOne({ userId, amount, note: str(req.body.note, 80) || (amount > 0 ? 'Credit from BuildRun' : 'Adjustment'), by: req.user._id, createdAt: new Date() });
    res.json({ balance: await walletBalance(userId) });
  });
  r.patch('/customers/:id', async (req, res) => {
    const userId = new ObjectId(req.params.id);
    if (String(userId) === String(req.user._id) && req.body.isAdmin === false) throw new HttpError(400, 'You can’t remove your own admin access.');
    const u = await col('users').findOneAndUpdate({ _id: userId }, { $set: { isAdmin: !!req.body.isAdmin } }, { returnDocument: 'after' });
    if (!u) throw new HttpError(404, 'Customer not found.');
    res.json(publicUser(u));
  });

  return r;
}
