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
export function computeBill(lines, { coupon = null, isFirstOrder = false, walletBalance = 0, useWallet = false } = {}) {
  const itemTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const mrpTotal = lines.reduce((s, l) => s + (l.mrp || l.price) * l.qty, 0);
  const heavyUnits = lines.reduce((s, l) => s + (l.heavy ? l.qty : 0), 0);
  let delivery = itemTotal === 0 || itemTotal >= rules.freeDeliveryAbove ? 0 : rules.deliveryFee;
  const handling = itemTotal === 0 ? 0 : rules.handlingFee;
  const loading = heavyUnits * rules.heavyItemFee;

  const check = validateCoupon(coupon, itemTotal, isFirstOrder);
  let discount = 0;
  if (check.ok) {
    const c = check.coupon;
    if (c.type === 'percent') discount = Math.min(Math.round((itemTotal * c.value) / 100), c.max ?? Infinity);
    if (c.type === 'flat') discount = Math.min(c.value, itemTotal);
    if (c.type === 'freeDelivery') delivery = 0;
  }
  const beforeWallet = Math.max(0, itemTotal + delivery + handling + loading - discount);
  const wallet = useWallet ? Math.min(walletBalance, beforeWallet) : 0;
  const total = beforeWallet - wallet;
  return {
    itemTotal, mrpTotal, savings: mrpTotal - itemTotal + discount,
    delivery, handling, loading, discount, wallet, total,
    coupon: check.ok ? check.coupon.code : null,
    couponError: coupon && !check.ok ? check.error : null,
    freeDeliveryGap: delivery > 0 ? rules.freeDeliveryAbove - itemTotal : 0,
  };
}

export function validateCoupon(code, itemTotal, isFirstOrder) {
  if (!code) return { ok: false, error: null };
  const c = coupons.find((x) => x.code === String(code).trim().toUpperCase());
  if (!c) return { ok: false, error: 'This code isn’t valid.' };
  if (c.firstOrderOnly && !isFirstOrder) return { ok: false, error: 'Valid on your first order only.' };
  if (itemTotal < (c.minCart || 0)) return { ok: false, error: `Add items worth ₹${c.minCart - itemTotal} more to use this code.` };
  return { ok: true, coupon: c };
}

/** GST-inclusive price → taxable value + tax (CGST/SGST split for intra-state). */
export function gstBreakup(amount, rate = rules.gstRate) {
  const taxable = amount / (1 + rate);
  const tax = amount - taxable;
  return { taxable: +taxable.toFixed(2), cgst: +(tax / 2).toFixed(2), sgst: +(tax / 2).toFixed(2), tax: +tax.toFixed(2) };
}
