import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ObjectId } from 'mongodb';
import { col } from './db.js';
import { env } from './env.js';
import { HttpError, publicUser, requestOtp, requireUser, verifyOtp } from './auth.js';
import { adminSetStatus, cancelOrder, placeOrder, priceCart, requestReturn, serializeOrder, walletBalance } from './orders.js';
import * as rzp from './razorpay.js';
import { isServiceable } from '../src/lib/pricing.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// tiny in-memory rate limiter (per IP + route); use a shared store if you run many instances
function limit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const k = req.ip + req.path;
    const t = Date.now();
    const arr = (hits.get(k) || []).filter((x) => t - x < windowMs);
    arr.push(t);
    hits.set(k, arr);
    if (arr.length > max) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    next();
  };
}

const clean = (o, keys) => Object.fromEntries(keys.map((k) => [k, String(o?.[k] ?? '').trim().slice(0, 200)]));
const oid = (s) => { try { return new ObjectId(String(s)); } catch { throw new HttpError(404, 'Not found.'); } };
const ADDRESS_FIELDS = ['label', 'name', 'phone', 'line1', 'line2', 'landmark', 'pincode', 'city'];
const addrOut = ({ _id, userId: _u, ...a }) => ({ ...a, id: String(_id) });

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '200kb' }));

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (env.corsOrigins.includes(origin) || !env.production)) {
      res.set({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS' });
    }
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  const api = express.Router();
  const user = requireUser();
  const admin = requireUser({ admin: true });

  api.get('/health', (_req, res) => res.json({ ok: true }));

  // ---------- catalog
  api.get('/catalog', async (_req, res) => {
    const [categories, products] = await Promise.all([
      col('categories').find().sort({ sort: 1 }).toArray(),
      col('products').find({ active: true }).toArray(),
    ]);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      categories: categories.map(({ _id, sort: _s, ...c }) => ({ ...c, id: _id })),
      products: products.map(({ _id, priceSource: _p, ...p }) => ({ ...p, id: _id })),
    });
  });
  api.get('/serviceable/:pincode', (req, res) => res.json({ serviceable: isServiceable(req.params.pincode) }));

  // ---------- auth & profile
  api.post('/auth/otp', limit(10, 60_000), async (req, res) => res.json(await requestOtp(req.body.phone)));
  api.post('/auth/verify', limit(10, 60_000), async (req, res) => res.json(await verifyOtp(req.body.phone, req.body.code)));
  api.get('/me', user, (req, res) => res.json(publicUser(req.user)));
  api.patch('/me', user, async (req, res) => {
    const p = clean(req.body, ['name', 'email', 'businessName', 'gstin']);
    p.gstin = p.gstin.toUpperCase();
    if (p.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(p.gstin)) throw new HttpError(400, 'Invalid GSTIN.');
    if (p.email && !/^\S+@\S+\.\S+$/.test(p.email)) throw new HttpError(400, 'Invalid email.');
    const u = await col('users').findOneAndUpdate({ _id: req.user._id }, { $set: p }, { returnDocument: 'after' });
    res.json(publicUser(u));
  });

  // ---------- addresses
  api.get('/addresses', user, async (req, res) => res.json((await col('addresses').find({ userId: req.user._id }).toArray()).map(addrOut)));
  api.post('/addresses', user, async (req, res) => {
    const a = clean(req.body, ADDRESS_FIELDS);
    if (!a.name || !a.line1 || !/^\d{6}$/.test(a.pincode)) throw new HttpError(400, 'Name, address and a 6-digit pincode are required.');
    if (req.body.id) {
      const r = await col('addresses').findOneAndUpdate({ _id: oid(req.body.id), userId: req.user._id }, { $set: a }, { returnDocument: 'after' });
      if (!r) throw new HttpError(404, 'Address not found.');
      return res.json(addrOut(r));
    }
    if ((await col('addresses').countDocuments({ userId: req.user._id })) >= 30) throw new HttpError(400, 'Too many saved addresses.');
    const doc = { ...a, userId: req.user._id, createdAt: new Date() };
    const { insertedId } = await col('addresses').insertOne(doc);
    res.json(addrOut({ ...doc, _id: insertedId }));
  });
  api.delete('/addresses/:id', user, async (req, res) => {
    await col('addresses').deleteOne({ _id: oid(req.params.id), userId: req.user._id });
    res.json({ ok: true });
  });

  // ---------- orders
  api.post('/orders/quote', user, async (req, res) => res.json((await priceCart(req.user, req.body)).bill));
  api.post('/orders', user, limit(10, 60_000), async (req, res) => res.status(201).json(await placeOrder(req.user, req.body)));
  api.get('/orders', user, async (req, res) => res.json((await col('orders').find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).toArray()).map(serializeOrder)));
  api.get('/orders/:id', user, async (req, res) => {
    const o = await col('orders').findOne(req.user.isAdmin ? { _id: req.params.id } : { _id: req.params.id, userId: req.user._id });
    if (!o) throw new HttpError(404, 'Order not found.');
    res.json(serializeOrder(o));
  });
  api.post('/orders/:id/cancel', user, async (req, res) => res.json(await cancelOrder(req.user, req.params.id, req.body.reason)));
  api.post('/orders/:id/return', user, async (req, res) => res.json(await requestReturn(req.user, req.params.id, req.body)));

  // ---------- wallet & quotes
  api.get('/wallet', user, async (req, res) => {
    const txns = await col('wallet_txns').find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(200).toArray();
    res.json({ balance: await walletBalance(req.user._id), txns: txns.map((t) => ({ id: String(t._id), amount: t.amount, note: t.note, at: +t.createdAt })) });
  });
  api.post('/quotes', limit(5, 60_000), async (req, res) => {
    const q = clean(req.body, ['name', 'phone', 'pincode', 'when']);
    q.items = String(req.body.items || '').slice(0, 4000);
    if (!q.name || !q.phone || !q.items) throw new HttpError(400, 'Name, phone and material list are required.');
    await col('quotes').insertOne({ ...q, status: 'new', createdAt: new Date() });
    res.status(201).json({ ok: true });
  });

  // ---------- payments
  api.post('/payments/order', user, async (req, res) => {
    const { bill } = await priceCart(req.user, req.body);
    if (!(bill.total > 0)) throw new HttpError(400, 'Nothing to pay.');
    if (rzp.razorpayEnabled()) {
      const o = await rzp.createOrder(bill.total, `u${req.user._id}`);
      return res.json({ gateway: 'razorpay', keyId: env.razorpay.keyId, orderId: o.id, amount: bill.total });
    }
    if (!env.allowMockPayments) throw new HttpError(503, 'Online payments are not configured yet. Please choose pay on delivery.');
    res.json({ gateway: 'mock', amount: bill.total });
  });
  api.post('/payments/verify', user, async (req, res) => {
    if (req.body.gateway === 'mock') {
      if (!env.allowMockPayments || rzp.razorpayEnabled()) throw new HttpError(400, 'Mock payments are disabled.');
      const id = 'mock_' + new ObjectId().toHexString();
      await col('payments').insertOne({ _id: id, gateway: 'mock', userId: req.user._id, amount: Number(req.body.amount) || 0, verified: true, usedBy: null, createdAt: new Date() });
      return res.json({ ref: id });
    }
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig } = req.body;
    if (!rzp.razorpayEnabled() || !rzp.signatureValid(orderId, paymentId, sig)) throw new HttpError(400, 'Payment could not be verified.');
    const o = await rzp.fetchOrder(orderId);
    await col('payments').updateOne(
      { _id: paymentId },
      { $setOnInsert: { gateway: 'razorpay', gatewayOrderId: orderId, userId: req.user._id, amount: o.amount_paid / 100, verified: true, usedBy: null, createdAt: new Date() } },
      { upsert: true },
    );
    res.json({ ref: paymentId });
  });

  // ---------- admin
  api.get('/admin/orders', admin, async (req, res) => {
    const q = req.query.status === 'active' ? { status: { $in: ['placed', 'confirmed', 'packed', 'out_for_delivery', 'return_requested'] } } : {};
    res.json((await col('orders').find(q).sort({ createdAt: -1 }).limit(300).toArray()).map(serializeOrder));
  });
  api.post('/admin/orders/:id/status', admin, async (req, res) => res.json(await adminSetStatus(req.user, req.params.id, req.body.status, req.body)));
  api.get('/admin/quotes', admin, async (_req, res) => res.json((await col('quotes').find().sort({ createdAt: -1 }).limit(200).toArray()).map(({ _id, createdAt, ...q }) => ({ ...q, id: String(_id), at: +createdAt }))));
  api.get('/admin/refunds', admin, async (_req, res) => res.json(await col('refunds').find().sort({ createdAt: -1 }).limit(200).toArray()));
  api.get('/admin/products', admin, async (_req, res) => res.json((await col('products').find().sort({ categoryId: 1, name: 1 }).toArray()).map(({ _id, ...p }) => ({ ...p, id: _id }))));
  api.patch('/admin/products/:id', admin, async (req, res) => {
    const p = await col('products').findOne({ _id: req.params.id });
    if (!p) throw new HttpError(404, 'Product not found.');
    const $set = {};
    if (typeof req.body.inStock === 'boolean') $set.inStock = req.body.inStock;
    if (typeof req.body.active === 'boolean') $set.active = req.body.active;
    if (Array.isArray(req.body.variants)) {
      $set.variants = p.variants.map((v) => {
        const u = req.body.variants.find((x) => x.id === v.id);
        if (!u) return v;
        const price = Number(u.price), mrp = Number(u.mrp);
        if (!(price > 0) || !(mrp >= price)) throw new HttpError(400, `Check prices for ${v.label || p.name}: price must be > 0 and MRP ≥ price.`);
        const tiers = Array.isArray(u.tiers) ? u.tiers.map((t) => ({ min: Math.floor(Number(t.min)), price: Number(t.price) })).filter((t) => t.min > 1 && t.price > 0 && t.price <= price) : v.tiers;
        return { ...v, price, mrp, tiers };
      });
      $set.priceSource = 'admin';
    }
    $set.updatedAt = new Date();
    const r = await col('products').findOneAndUpdate({ _id: p._id }, { $set }, { returnDocument: 'after' });
    const { _id, ...rest } = r;
    res.json({ ...rest, id: _id });
  });

  app.use('/api', api);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // ---------- web app (single deployable: API + site)
  const dist = path.join(root, 'dist');
  if (env.serveStatic && fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
  }

  // errors
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : err.message, ...(err.bill ? { bill: err.bill } : {}) });
  });
  return app;
}
