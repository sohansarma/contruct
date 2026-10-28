import { rules, coupons, serviceablePincodes } from '../config.js';

export function isServiceable(pincode) {
  return serviceablePincodes.has(String(pincode || '').trim());
}

export function codAllowed(pincode) {
  return isServiceable(pincode) && (rules.codPincodes.length === 0 || rules.codPincodes.includes(String(pincode)));
}

/** Bulk tier pricing: the best tier whose minimum the quantity reaches. */
export function unitPrice(variant, qty = 1) {
  let price = variant.price;
  for (const t of variant.tiers || []) if (qty >= t.min && t.price < price) price = t.price;
  return price;
}

/** Next tier the customer could unlock, e.g. { min: 30, price: 405, more: 12 } */
export function nextTier(variant, qty = 0) {
  const t = (variant.tiers || []).filter((x) => x.min > qty).sort((a, b) => a.min - b.min)[0];
  return t ? { ...t, more: t.min - qty } : null;
}

/** lines: [{ price, mrp, qty, heavy }] — price is the unit price after tiers */
export function computeBill(lines, { coupon = null, isFirstOrder = false, walletBalance = 0, useWallet = false, now = Date.now() } = {}) {
  const itemTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const mrpTotal = lines.reduce((s, l) => s + (l.mrp || l.price) * l.qty, 0);
  const heavyUnits = lines.reduce((s, l) => s + (l.heavy ? l.qty : 0), 0);
  let delivery = itemTotal === 0 || itemTotal >= rules.freeDeliveryAbove ? 0 : rules.deliveryFee;
  const handling = itemTotal === 0 ? 0 : rules.handlingFee;
  const loading = heavyUnits * rules.heavyItemFee;

  // A valid code wins; otherwise the best automatic offer applies.
  const check = validateCoupon(coupon, lines, isFirstOrder, now);
  const offer = check.ok ? check.coupon : bestAutoOffer(lines, isFirstOrder, now, { delivery });
  let discount = 0;
  if (offer) {
    const eligible = eligibleTotal(offer, lines);
    if (offer.type === 'percent') discount = Math.min(Math.round((eligible * offer.value) / 100), offer.max || Infinity);
    if (offer.type === 'flat') discount = Math.min(offer.value, eligible);
    if (offer.type === 'freeDelivery') delivery = 0;
  }
  const beforeWallet = Math.max(0, itemTotal + delivery + handling + loading - discount);
  const wallet = useWallet ? Math.min(walletBalance, beforeWallet) : 0;
  const total = beforeWallet - wallet;
  return {
    itemTotal, mrpTotal, savings: mrpTotal - itemTotal + discount,
    delivery, handling, loading, discount, wallet, total,
    coupon: check.ok ? check.coupon.code : null,
    offer: offer ? { code: offer.code || null, title: offer.title, auto: !!offer.auto } : null,
    couponError: coupon && !check.ok ? check.error : null,
    freeDeliveryGap: delivery > 0 ? rules.freeDeliveryAbove - itemTotal : 0,
  };
}

const lineCat = (l) => l.categoryId ?? l.product?.categoryId;
const lineBrand = (l) => l.brand ?? l.product?.brand;

/** Cart value the offer applies to (whole cart, or only lines in its scope). */
export function eligibleTotal(offer, lines) {
  const cats = offer.scope?.categories || [];
  const brands = offer.scope?.brands || [];
  return lines
    .filter((l) => (!cats.length || cats.includes(lineCat(l))) && (!brands.length || brands.includes(lineBrand(l))))
    .reduce((s, l) => s + l.price * l.qty, 0);
}

/** Is the offer running right now? */
export function offerLive(o, now = Date.now()) {
  if (o.active === false) return false;
  if (o.startsAt && now < +new Date(o.startsAt)) return false;
  if (o.endsAt && now > +new Date(o.endsAt)) return false;
  return true;
}

function offerError(o, lines, isFirstOrder, now) {
  if (!offerLive(o, now)) return 'This offer has ended.';
  if (o.firstOrderOnly && !isFirstOrder) return 'Valid on your first order only.';
  const eligible = eligibleTotal(o, lines);
  if (!eligible) return 'None of your items are part of this offer.';
  if (eligible < (o.minCart || 0)) return `Add items worth ₹${Math.ceil(o.minCart - eligible)} more to use this code.`;
  return null;
}

/** lines may also be a number (cart value) for a quick check. */
export function validateCoupon(code, lines, isFirstOrder, now = Date.now()) {
  if (!code) return { ok: false, error: null };
  const list = typeof lines === 'number' ? [{ price: lines, qty: 1 }] : lines;
  const c = coupons.find((x) => x.code && x.code === String(code).trim().toUpperCase());
  if (!c) return { ok: false, error: 'This code isn’t valid.' };
  const error = offerError(c, list, isFirstOrder, now);
  return error ? { ok: false, error } : { ok: true, coupon: c };
}

/** The automatic offer worth the most to this cart, if any. */
export function bestAutoOffer(lines, isFirstOrder, now = Date.now(), { delivery = 0 } = {}) {
  let best = null;
  let bestValue = 0;
  for (const o of coupons) {
    if (!o.auto || offerError(o, lines, isFirstOrder, now)) continue;
    const eligible = eligibleTotal(o, lines);
    const value = o.type === 'percent' ? Math.min((eligible * o.value) / 100, o.max || Infinity) : o.type === 'flat' ? Math.min(o.value, eligible) : delivery;
    if (value > bestValue) { best = o; bestValue = value; }
  }
  return best;
}

/** GST-inclusive price → taxable value + tax (CGST/SGST split for intra-state). */
export function gstBreakup(amount, rate = rules.gstRate) {
  const taxable = amount / (1 + rate);
  const tax = amount - taxable;
  return { taxable: +taxable.toFixed(2), cgst: +(tax / 2).toFixed(2), sgst: +(tax / 2).toFixed(2), tax: +tax.toFixed(2) };
}

/**
 * Tax invoice lines from an order. Prices are GST-inclusive; a coupon discount
 * is spread over the goods in proportion to their value; delivery/handling/
 * loading charges are a service line at the store rate.
 */
export function invoiceLines(order, storeRate = rules.gstRate) {
  const goods = order.items.map((i) => ({ desc: `${i.name} (${i.brand}, ${i.variant})`, hsn: i.hsn || '', rate: i.gstRate ?? storeRate, qty: i.qty, unit: i.price, value: i.price * i.qty }));
  const goodsTotal = goods.reduce((s, g) => s + g.value, 0) || 1;
  const discount = order.bill.discount || 0;
  const fees = (order.bill.delivery || 0) + (order.bill.handling || 0) + (order.bill.loading || 0);
  const rows = goods.map((g) => ({ ...g, value: +(g.value - (discount * g.value) / goodsTotal).toFixed(2) }));
  // put any rounding paisa on the last item so lines add up to the bill exactly
  if (rows.length) {
    const diff = +(goodsTotal - discount - rows.reduce((s, r) => s + r.value, 0)).toFixed(2);
    rows[rows.length - 1].value = +(rows[rows.length - 1].value + diff).toFixed(2);
  }
  if (fees) rows.push({ desc: 'Delivery, handling & loading', hsn: 'SAC 9965', rate: storeRate, qty: 1, unit: fees, value: fees });
  for (const r of rows) {
    r.taxable = +(r.value / (1 + r.rate)).toFixed(2);
    r.tax = +(r.value - r.taxable).toFixed(2);
  }
  const byRate = {};
  for (const r of rows) {
    const k = r.rate;
    byRate[k] ||= { rate: k, taxable: 0, cgst: 0, sgst: 0 };
    byRate[k].taxable += r.taxable;
    byRate[k].cgst += r.tax / 2;
    byRate[k].sgst += r.tax / 2;
  }
  const summary = Object.values(byRate).map((s) => ({ rate: s.rate, taxable: +s.taxable.toFixed(2), cgst: +s.cgst.toFixed(2), sgst: +s.sgst.toFixed(2) }));
  const total = +rows.reduce((s, r) => s + r.value, 0).toFixed(2);
  return { rows, summary, total, discount };
}
