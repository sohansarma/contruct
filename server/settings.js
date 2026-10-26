// Store settings live in MongoDB (one document) and are applied onto the shared
// config module, so pricing/serviceability code on the server uses them.
import { col } from './db.js';
import { applySettings, coupons, banners, brand, rules, currentSettings } from '../src/config.js';
import { HttpError } from './auth.js';

const DEFAULTS = currentSettings();
let loadedAt = 0;
const TTL = 15_000;

export async function ensureSettings(force = false) {
  if (!force && Date.now() - loadedAt < TTL) return;
  const doc = await col('settings').findOne({ _id: 'store' });
  // start from defaults each time so removed coupons/banners really disappear
  applySettings(DEFAULTS);
  if (doc) applySettings(doc);
  loadedAt = Date.now();
}

export const settingsMiddleware = async (_req, _res, next) => { try { await ensureSettings(); next(); } catch (e) { next(e); } };

export function publicSettings(now = Date.now()) {
  const live = (o) => o.active !== false && (!o.endsAt || +new Date(o.endsAt) > now) && (!o.startsAt || +new Date(o.startsAt) <= now);
  return {
    brand,
    rules,
    coupons: coupons.filter(live),
    banners: banners.filter(live),
  };
}

export const adminSettings = () => ({ brand, rules, coupons, banners });

const num = (v, min = 0, max = 1e7) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `Invalid number: ${v}`);
  return n;
};
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const id6 = () => Math.random().toString(36).slice(2, 8);

function cleanCoupon(c) {
  const type = ['percent', 'flat', 'freeDelivery'].includes(c.type) ? c.type : null;
  if (!type) throw new HttpError(400, 'Offer type must be percent, flat or freeDelivery.');
  const code = str(c.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!c.auto && !code) throw new HttpError(400, 'Coupons need a code (or mark the offer automatic).');
  const out = {
    id: str(c.id, 20) || id6(),
    code: c.auto ? '' : code,
    title: str(c.title, 80) || 'Offer',
    type,
    value: type === 'freeDelivery' ? 0 : num(c.value, 0.01, type === 'percent' ? 90 : 1e6),
    max: c.max ? num(c.max, 1) : null,
    minCart: num(c.minCart || 0),
    firstOrderOnly: !!c.firstOrderOnly,
    auto: !!c.auto,
    active: c.active !== false,
    startsAt: c.startsAt ? new Date(c.startsAt).toISOString() : null,
    endsAt: c.endsAt ? new Date(c.endsAt).toISOString() : null,
    scope: {
      categories: (c.scope?.categories || []).map((x) => str(x, 40)).filter(Boolean),
      brands: (c.scope?.brands || []).map((x) => str(x, 40)).filter(Boolean),
    },
  };
  if (out.startsAt && out.endsAt && out.endsAt < out.startsAt) throw new HttpError(400, `“${out.title}” ends before it starts.`);
  return out;
}

function cleanBanner(b) {
  if (!str(b.title)) throw new HttpError(400, 'Banners need a title.');
  return {
    id: str(b.id, 20) || id6(),
    title: str(b.title, 80), subtitle: str(b.subtitle, 140),
    link: str(b.link, 200).startsWith('/') || /^https:\/\//.test(str(b.link)) ? str(b.link, 200) : '',
    image: str(b.image, 300), color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#ff4f1f',
    active: b.active !== false,
    startsAt: b.startsAt ? new Date(b.startsAt).toISOString() : null,
    endsAt: b.endsAt ? new Date(b.endsAt).toISOString() : null,
  };
}

export async function saveSettings(body) {
  const next = {};
  if (body.brand) {
    next.brand = {};
    for (const k of ['name', 'tagline', 'city', 'supportPhone', 'supportEmail', 'legalName', 'gstin', 'address']) if (k in body.brand) next.brand[k] = str(body.brand[k]);
    if (next.brand.name === '') throw new HttpError(400, 'Store name is required.');
  }
  if (body.rules) {
    const r = body.rules;
    next.rules = {
      freeDeliveryAbove: num(r.freeDeliveryAbove ?? rules.freeDeliveryAbove),
      deliveryFee: num(r.deliveryFee ?? rules.deliveryFee),
      handlingFee: num(r.handlingFee ?? rules.handlingFee),
      heavyItemFee: num(r.heavyItemFee ?? rules.heavyItemFee),
      cancelWindowMin: num(r.cancelWindowMin ?? rules.cancelWindowMin, 0, 1440),
      returnWindowHours: num(r.returnWindowHours ?? rules.returnWindowHours, 0, 720),
      etaMin: num(r.etaMin ?? rules.etaMin, 5, 2880),
      etaMax: num(r.etaMax ?? rules.etaMax, 5, 2880),
      gstRate: num(r.gstRate ?? rules.gstRate, 0, 0.5),
      scheduledSlots: (Array.isArray(r.scheduledSlots) ? r.scheduledSlots : rules.scheduledSlots).map((s) => str(s, 30)).filter(Boolean).slice(0, 12),
      pincodes: str(r.pincodes ?? rules.pincodes, 20000),
      codPincodes: (Array.isArray(r.codPincodes) ? r.codPincodes : rules.codPincodes).map((p) => str(p, 6)).filter((p) => /^\d{6}$/.test(p)),
    };
    if (next.rules.etaMax < next.rules.etaMin) throw new HttpError(400, 'Maximum delivery time must be at least the minimum.');
  }
  if (Array.isArray(body.coupons)) {
    next.coupons = body.coupons.map(cleanCoupon);
    const codes = next.coupons.filter((c) => c.code).map((c) => c.code);
    if (new Set(codes).size !== codes.length) throw new HttpError(400, 'Two offers use the same code.');
  }
  if (Array.isArray(body.banners)) next.banners = body.banners.map(cleanBanner).slice(0, 10);
  await col('settings').updateOne({ _id: 'store' }, { $set: { ...next, updatedAt: new Date() } }, { upsert: true });
  await ensureSettings(true);
  return adminSettings();
}
