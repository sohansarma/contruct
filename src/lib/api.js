// Data layer with two interchangeable backends:
//  • demo  — everything persisted in localStorage on the device (no setup).
//  • live  — Supabase (auth via phone OTP, Postgres tables in supabase/schema.sql).
// The UI only talks to `api`, so switching is just setting env vars.
import { createClient } from '@supabase/supabase-js';
import { products as seedProducts, categories as seedCategories } from '../data/catalog.js';
import { simulatedStatus, refundDestination } from './orderLogic.js';
import { uid } from './format.js';

const URL_ = import.meta.env?.VITE_SUPABASE_URL;
const KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;
export const mode = URL_ && KEY ? 'live' : 'demo';
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

export function returnAmount(o) {
  const ids = new Set(o.returnRequest?.itemIds || []);
  return o.items.filter((i) => ids.has(i.key)).reduce((s, i) => s + i.price * i.qty, 0);
}

/* ------------------------------ live backend ------------------------------ */
let sb = null;
const live = {
  get client() { return (sb ||= createClient(URL_, KEY)); },
  async _profile(authUser) {
    if (!authUser) return null;
    const { data } = await this.client.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    return { id: authUser.id, phone: authUser.phone, name: data?.name || '', email: data?.email || '', gstin: data?.gstin || '', businessName: data?.business_name || '', isAdmin: !!data?.is_admin };
  },
  async getSession() { const { data } = await this.client.auth.getSession(); return this._profile(data.session?.user); },
  async sendOtp(phone) { const { error } = await this.client.auth.signInWithOtp({ phone }); if (error) throw error; return { ok: true }; },
  async verifyOtp(phone, token) {
    const { data, error } = await this.client.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw new Error('Incorrect or expired code.');
    return this._profile(data.user);
  },
  async signOut() { await this.client.auth.signOut(); },
  async updateProfile(user, p) {
    const { error } = await this.client.from('profiles').upsert({ id: user.id, phone: user.phone, name: p.name ?? user.name, email: p.email ?? user.email, gstin: p.gstin ?? user.gstin, business_name: p.businessName ?? user.businessName });
    if (error) throw error;
    return { ...user, ...p };
  },
  async listProducts() {
    const { data, error } = await this.client.from('products').select('*').eq('active', true);
    if (error || !data?.length) return seedProducts;
    return data.map((r) => ({ ...r.data, id: r.id, categoryId: r.category_id, inStock: r.in_stock }));
  },
  async listCategories() {
    const { data, error } = await this.client.from('categories').select('*').order('sort');
    if (error || !data?.length) return seedCategories;
    return data.map((r) => ({ ...r.data, id: r.id }));
  },
  async listAddresses(user) {
    const { data } = await this.client.from('addresses').select('*').eq('user_id', user.id).order('created_at');
    return (data || []).map((r) => ({ ...r.data, id: r.id }));
  },
  async saveAddress(user, a) {
    const { id, ...rest } = a;
    const row = { user_id: user.id, data: rest, ...(id ? { id } : {}) };
    const { data, error } = await this.client.from('addresses').upsert(row).select().single();
    if (error) throw error;
    return { ...data.data, id: data.id };
  },
  async deleteAddress(_u, id) { await this.client.from('addresses').delete().eq('id', id); },
  _row: (r) => ({ ...r.data, id: r.id, userId: r.user_id, status: r.status, createdAt: new Date(r.created_at).getTime(), deliveredAt: r.delivered_at ? new Date(r.delivered_at).getTime() : null }),
  async listOrders(user) {
    const { data } = await this.client.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return (data || []).map(this._row);
  },
  async getOrder(_u, id) { const { data } = await this.client.from('orders').select('*').eq('id', id).maybeSingle(); return data ? this._row(data) : null; },
  async createOrder(user, order) {
    // Server-side function validates prices/serviceability and inserts atomically.
    const { data, error } = await this.client.rpc('place_order', { payload: order });
    if (error) throw error;
    return this._row(data);
  },
  async cancelOrder(_u, id, reason) { const { data, error } = await this.client.rpc('cancel_order', { order_id: id, reason }); if (error) throw error; return this._row(data); },
  async requestReturn(_u, id, req) { const { data, error } = await this.client.rpc('request_return', { order_id: id, req }); if (error) throw error; return this._row(data); },
  async wallet(user) {
    const { data } = await this.client.from('wallet_txns').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const txns = (data || []).map((t) => ({ id: t.id, amount: t.amount, note: t.note, at: new Date(t.created_at).getTime() }));
    return { balance: txns.reduce((s, t) => s + t.amount, 0), txns };
  },
  async submitQuote(user, q) { const { error } = await this.client.from('quotes').insert({ user_id: user?.id ?? null, data: q }); if (error) throw error; return q; },
  async adminOrders() { const { data } = await this.client.from('orders').select('*').order('created_at', { ascending: false }).limit(200); return (data || []).map(this._row); },
  async adminQuotes() { const { data } = await this.client.from('quotes').select('*').order('created_at', { ascending: false }); return (data || []).map((r) => ({ ...r.data, id: r.id, at: new Date(r.created_at).getTime(), status: r.status })); },
  async adminSetStatus(id, status) { const { data, error } = await this.client.rpc('admin_set_status', { order_id: id, new_status: status }); if (error) throw error; return this._row(data); },
};

export const api = mode === 'live' ? live : demo;
