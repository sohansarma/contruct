// Data layer with two interchangeable backends:
//  • demo  — everything persisted in localStorage on the device (no setup).
//  • live  — REST API in server/ (Express + MongoDB, phone-OTP login).
// The UI only talks to `api`, so switching is just setting env vars.
import { products as seedProducts, categories as seedCategories } from '../data/catalog.js';
import { simulatedStatus, refundDestination, returnAmount } from './orderLogic.js';
import { uid } from './format.js';

// Demo mode keeps everything on the device (no server). Live mode talks to
// the MongoDB-backed API in server/. VITE_API_URL="" means same origin.
const API_URL = import.meta.env?.VITE_API_URL;
export const mode = API_URL !== undefined && import.meta.env?.VITE_DEMO !== '1' ? 'live' : 'demo';
export const DEMO_OTP = '123456';

/* ------------------------------ demo backend ------------------------------ */
const ls = {
  get(k, d) {
    try { const v = localStorage.getItem('br:' + k); return v ? JSON.parse(v) : d; } catch { return d; }
  },
  set(k, v) { try { localStorage.setItem('br:' + k, JSON.stringify(v)); } catch { /* storage full / private mode */ } },
};
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const demo = {
  async getSession() { return ls.get('session', null); },
  async sendOtp(phone) { await delay(); return { ok: true, hint: `Demo mode: use ${DEMO_OTP}`, phone }; },
  async verifyOtp(phone, code) {
    await delay();
    if (code !== DEMO_OTP) throw new Error('Incorrect code. Try again.');
    const users = ls.get('users', {});
    const user = users[phone] || { id: 'u_' + phone, phone, name: '', email: '', gstin: '', businessName: '', isAdmin: phone.endsWith('0000000000') };
    users[phone] = user; ls.set('users', users); ls.set('session', user);
    return user;
  },
  async signOut() { ls.set('session', null); },
  async updateProfile(user, patch) {
    const users = ls.get('users', {});
    const next = { ...users[user.phone], ...patch };
    users[user.phone] = next; ls.set('users', users); ls.set('session', next);
    return next;
  },

  async listProducts() { return seedProducts; },
  async listCategories() { return seedCategories; },

  async listAddresses(user) { return ls.get(`addr:${user.id}`, []); },
  async saveAddress(user, a) {
    const list = ls.get(`addr:${user.id}`, []);
    const item = { ...a, id: a.id || uid('A') };
    const next = a.id ? list.map((x) => (x.id === a.id ? item : x)) : [...list, item];
    ls.set(`addr:${user.id}`, next); return item;
  },
  async deleteAddress(user, id) { ls.set(`addr:${user.id}`, ls.get(`addr:${user.id}`, []).filter((x) => x.id !== id)); },

  _orders() { return ls.get('orders', []); },
  _saveOrders(o) { ls.set('orders', o); },
  _tick() {
    // advance simulated delivery progress
    const all = this._orders();
    let changed = false;
    const next = all.map((o) => { const s = simulatedStatus(o); if (s !== o) changed = true; return s; });
    if (changed) this._saveOrders(next);
    return next;
  },
  async listOrders(user) { return this._tick().filter((o) => o.userId === user.id).sort((a, b) => b.createdAt - a.createdAt); },
  async getOrder(user, id) { return this._tick().find((o) => o.id === id && (o.userId === user.id || user.isAdmin)) || null; },
  async createOrder(user, order) {
    await delay(400);
    const o = { ...order, id: 'BR' + uid().slice(-8), userId: user.id, createdAt: Date.now(), status: 'placed', history: [{ status: 'placed', at: Date.now() }] };
    this._saveOrders([o, ...this._orders()]);
    if (order.bill.wallet > 0) this._walletAdd(user, -order.bill.wallet, `Used on order ${o.id}`);
    return o;
  },
  _patch(id, fn) {
    const all = this._orders();
    const i = all.findIndex((o) => o.id === id);
    if (i < 0) throw new Error('Order not found');
    all[i] = fn(all[i]); this._saveOrders(all); return all[i];
  },
  async cancelOrder(user, id, reason) {
    const o = this._patch(id, (o) => ({ ...o, status: 'cancelled', cancelReason: reason, history: [...o.history, { status: 'cancelled', at: Date.now() }] }));
    return this._refund(user, o, 'cancel');
  },
  async requestReturn(user, id, { itemIds, reason, note }) {
    return this._patch(id, (o) => ({
      ...o, status: 'return_requested',
      returnRequest: { itemIds, reason, note, at: Date.now() },
      history: [...o.history, { status: 'return_requested', at: Date.now() }],
    }));
  },
  // Cancellation refunds what was actually paid; returns refund the returned items.
  // Credit used always goes back to the wallet. Cash goes back as wallet credit,
  // online payments go back to the original source (recorded on the order).
  _refund(user, o, kind) {
    const walletPart = kind === 'cancel' ? o.bill.wallet || 0 : 0;
    const cashPart = kind === 'cancel' ? (o.payment.status === 'paid' ? o.bill.total : 0) : returnAmount(o);
    if (walletPart) this._walletAdd(user, walletPart, `Credit restored · ${o.id}`);
    if (!cashPart) return o;
    const dest = refundDestination(o);
    if (dest === 'wallet') this._walletAdd(user, cashPart, `Refund · ${o.id}`);
    return this._patch(o.id, (x) => ({ ...x, refund: { amount: cashPart, to: dest, at: Date.now() } }));
  },
  _walletAdd(user, amount, note) {
    const k = `wallet:${user.id}`;
    ls.set(k, [{ id: uid('W'), amount, note, at: Date.now() }, ...ls.get(k, [])]);
  },
  async wallet(user) {
    const txns = ls.get(`wallet:${user.id}`, []);
    return { balance: txns.reduce((s, t) => s + t.amount, 0), txns };
  },

  async submitQuote(user, q) { const list = ls.get('quotes', []); const item = { ...q, id: uid('Q'), userId: user?.id, at: Date.now(), status: 'new' }; ls.set('quotes', [item, ...list]); return item; },

  // admin
  async adminOrders() { return this._tick().sort((a, b) => b.createdAt - a.createdAt); },
  async adminQuotes() { return ls.get('quotes', []); },
  async adminProducts() { return seedProducts; },
  async adminUpdateProduct() { throw new Error('Product editing needs the live server.'); },
  async adminSetStatus(id, status) {
    const o = this._patch(id, (o) => ({
      ...o, status,
      ...(status === 'delivered' ? { deliveredAt: Date.now() } : {}),
      ...(status === 'delivered' && o.payment.method === 'cod' ? { payment: { ...o.payment, status: 'paid' } } : {}),
      history: [...o.history, { status, at: Date.now() }],
    }));
    if (status === 'returned' || status === 'cancelled') return this._refund({ id: o.userId }, o, status === 'returned' ? 'return' : 'cancel');
    return o;
  },
};

export { returnAmount };

/* ------------------------------ live backend ------------------------------ */
// REST API in server/ (Express + MongoDB). Same-origin when the server also
// serves the site; set VITE_API_URL for the mobile apps (absolute https URL).
const BASE = (API_URL || '').replace(/\/$/, '') + '/api';
const TOKEN_KEY = 'br:token';
const token = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

async function http(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('You appear to be offline. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && t) token.set(null);
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: res.status, data });
  return data;
}

const orderPayload = (order) => ({
  items: order.items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty })),
  coupon: order.bill.coupon || order.couponCode || '',
  useWallet: order.bill.wallet > 0,
});

const live = {
  http,
  async getSession() {
    if (!token.get()) return null;
    try { return await http('GET', '/me'); } catch { return null; }
  },
  sendOtp: (phone) => http('POST', '/auth/otp', { phone }),
  async verifyOtp(phone, code) {
    const { token: t, user } = await http('POST', '/auth/verify', { phone, code });
    token.set(t);
    return user;
  },
  async signOut() { token.set(null); },
  updateProfile: (_u, patch) => http('PATCH', '/me', patch),

  async _catalog() { return (this._cat ||= http('GET', '/catalog').catch((e) => { this._cat = null; throw e; })); },
  async listProducts() { try { return (await this._catalog()).products; } catch { return seedProducts; } },
  async listCategories() { try { return (await this._catalog()).categories; } catch { return seedCategories; } },

  listAddresses: () => http('GET', '/addresses'),
  saveAddress: (_u, a) => http('POST', '/addresses', a),
  deleteAddress: (_u, id) => http('DELETE', `/addresses/${id}`),

  listOrders: () => http('GET', '/orders'),
  getOrder: (_u, id) => http('GET', `/orders/${encodeURIComponent(id)}`).catch((e) => (e.status === 404 ? null : Promise.reject(e))),
  createOrder: (_u, order) => http('POST', '/orders', {
    ...orderPayload(order),
    addressId: order.address.id,
    slot: order.slot,
    note: order.note,
    gst: !!order.gstin,
    payment: { method: order.payment.method, ref: order.payment.ref },
    expectedTotal: order.bill.total,
  }),
  cancelOrder: (_u, id, reason) => http('POST', `/orders/${id}/cancel`, { reason }),
  requestReturn: (_u, id, req) => http('POST', `/orders/${id}/return`, req),
  wallet: () => http('GET', '/wallet'),
  submitQuote: (_u, q) => http('POST', '/quotes', q),

  // payments: server prices the cart and opens a gateway order
  paymentOrder: (order) => http('POST', '/payments/order', orderPayload(order)),
  verifyPayment: (body) => http('POST', '/payments/verify', body),

  adminOrders: () => http('GET', '/admin/orders'),
  adminQuotes: () => http('GET', '/admin/quotes'),
  adminSetStatus: (id, status, extra = {}) => http('POST', `/admin/orders/${id}/status`, { status, ...extra }),
  adminProducts: () => http('GET', '/admin/products'),
  adminUpdateProduct: (id, patch) => http('PATCH', `/admin/products/${id}`, patch),
};

export const api = mode === 'live' ? live : demo;
