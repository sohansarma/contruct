// Store settings. These are the defaults; in live mode everything here is
// edited from Admin → Settings / Offers and stored in MongoDB. The app and the
// server both call applySettings() with the saved values, so every module that
// imports `brand`, `rules`, `coupons`, `banners` or uses serviceability sees the
// current values.

export const brand = {
  name: 'BuildRun',
  tagline: 'Building materials, delivered in about an hour.',
  city: 'Bengaluru',
  supportPhone: import.meta.env?.VITE_SUPPORT_PHONE || '+919000000000',
  supportEmail: import.meta.env?.VITE_SUPPORT_EMAIL || 'support@example.com',
  legalName: 'BuildRun Retail Pvt. Ltd.',
  gstin: '29XXXXXXXXXXXZX',
  address: 'Bengaluru, Karnataka, India',
};

export const rules = {
  currency: 'INR',
  minOrder: 0, // no minimum order value
  freeDeliveryAbove: 999,
  deliveryFee: 49,
  heavyItemFee: 10, // per heavy unit (bags, sheets) for loading/unloading
  handlingFee: 9,
  gstRate: 0.18, // prices are GST-inclusive; used for invoice breakup
  cancelWindowMin: 10, // customers may cancel within N minutes of placing
  returnWindowHours: 24, // after delivery
  etaMin: 60,
  etaMax: 120,
  scheduledSlots: ['8 – 10 AM', '10 AM – 12 PM', '12 – 2 PM', '2 – 4 PM', '4 – 6 PM', '6 – 8 PM'],
  // Delivery area: pincodes and ranges, e.g. "560001-560110, 562125"; prefix "-" to exclude
  pincodes: '560001-560110, -560088, -560089, -560101, -560104, -560107, -560109',
  // COD only for these pincodes (empty = everywhere we deliver)
  codPincodes: [],
};

/**
 * Offers. Coupons need a code; `auto` offers apply by themselves.
 * type: percent | flat | freeDelivery; scope limits the offer to categories/brands.
 */
export const coupons = [
  { code: 'FIRSTBUILD', title: '10% off your first order', type: 'percent', value: 10, max: 300, minCart: 499, firstOrderOnly: true, active: true },
  { code: 'SITE200', title: '₹200 off on orders above ₹4,999', type: 'flat', value: 200, minCart: 4999, active: true },
  { code: 'FREEDEL', title: 'Free delivery, no minimum', type: 'freeDelivery', minCart: 0, active: true },
];

/** Home-page banners. */
export const banners = [
  { id: 'b1', title: 'Bulk cement, lower price', subtitle: 'Buy 30+ bags and pay less per bag', link: '/c/cement', color: '#ff4f1f', active: true },
  { id: 'b2', title: 'Plan your paint job', subtitle: 'Use the calculator to get exact quantities', link: '/calculator', color: '#5e5ce6', active: true },
];

/** "560001-560005, 562125, -560003" → Set of pincodes */
export function parsePincodes(text) {
  const inc = new Set();
  const exc = new Set();
  for (const raw of String(text || '').split(/[\s,;]+/)) {
    if (!raw) continue;
    const neg = raw.startsWith('-');
    const t = neg ? raw.slice(1) : raw;
    const m = t.match(/^(\d{6})(?:-(\d{6}))?$/);
    if (!m) continue;
    const [a, b] = [+m[1], +(m[2] || m[1])];
    if (b - a > 5000) continue;
    for (let p = a; p <= b; p++) (neg ? exc : inc).add(String(p));
  }
  for (const p of exc) inc.delete(p);
  return inc;
}

export const serviceablePincodes = parsePincodes(rules.pincodes);

const replaceArray = (arr, next) => { arr.splice(0, arr.length, ...next); };

/** Apply saved settings (from the server) on top of the defaults. */
export function applySettings(s = {}) {
  if (s.brand) Object.assign(brand, s.brand);
  if (s.rules) {
    Object.assign(rules, s.rules);
    const set = parsePincodes(rules.pincodes);
    serviceablePincodes.clear();
    for (const p of set) serviceablePincodes.add(p);
  }
  if (Array.isArray(s.coupons)) replaceArray(coupons, s.coupons);
  if (Array.isArray(s.banners)) replaceArray(banners, s.banners);
}

/** Snapshot of the current settings (used to seed the database). */
export const currentSettings = () => ({
  brand: { ...brand }, rules: { ...rules }, coupons: coupons.map((c) => ({ ...c })), banners: banners.map((b) => ({ ...b })),
});
