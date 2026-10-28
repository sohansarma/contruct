import { rules } from '../config.js';

export const STATUS = {
  placed: { label: 'Order placed', step: 0 },
  confirmed: { label: 'Confirmed', step: 1 },
  packed: { label: 'Packed at store', step: 2 },
  out_for_delivery: { label: 'Out for delivery', step: 3 },
  delivered: { label: 'Delivered', step: 4 },
  cancelled: { label: 'Cancelled', step: -1 },
  return_requested: { label: 'Return requested', step: 5 },
  returned: { label: 'Returned · refund issued', step: 6 },
};
export const TRACK_STEPS = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered'];
const ACTIVE = new Set(['placed', 'confirmed', 'packed', 'out_for_delivery']);

export const isActive = (o) => ACTIVE.has(o.status);

export function canCancel(order, now = Date.now()) {
  return ['placed', 'confirmed'].includes(order.status) && now - order.createdAt <= rules.cancelWindowMin * 60_000;
}
export function cancelSecondsLeft(order, now = Date.now()) {
  return Math.max(0, Math.round((order.createdAt + rules.cancelWindowMin * 60_000 - now) / 1000));
}

export function canReturn(order, now = Date.now()) {
  return (
    order.status === 'delivered' &&
    order.deliveredAt &&
    now - order.deliveredAt <= rules.returnWindowHours * 3_600_000 &&
    order.items.some((i) => i.returnable)
  );
}

/** Refunds go to the original method; cash refunds become wallet credit. */
export function refundDestination(order) {
  return ['cod', 'wallet_credit'].includes(order.payment.method) ? 'wallet' : 'source';
}

/**
 * Demo-mode simulator: derives where an order "should" be from elapsed time,
 * so tracking moves without a backend. Live mode gets status from the server.
 */
export function simulatedStatus(order, now = Date.now()) {
  if (!ACTIVE.has(order.status)) return order;
  if (order.slot && order.slot !== 'asap') return order; // scheduled: hold at placed/confirmed
  const m = (now - order.createdAt) / 60_000;
  const eta = order.etaMinutes || rules.etaMin;
  let status = 'placed';
  if (m > 0.5) status = 'confirmed';
  if (m > eta * 0.25) status = 'packed';
  if (m > eta * 0.45) status = 'out_for_delivery';
  if (m > eta) status = 'delivered';
  if (STATUS[status].step <= STATUS[order.status].step) return order;
  const patch = { ...order, status };
  if (status === 'delivered') patch.deliveredAt = order.createdAt + eta * 60_000;
  return patch;
}

/** Value of the items selected in a return request. */
export function returnAmount(o) {
  const ids = new Set(o.returnRequest?.itemIds || []);
  return o.items.filter((i) => ids.has(i.key)).reduce((s, i) => s + i.price * i.qty, 0);
}

// ---------- scheduled delivery slots (store time is IST)
const IST = 5.5 * 3_600_000;
export const istDate = (now = Date.now()) => new Date(now + IST).toISOString().slice(0, 10);

/** End of a slot label like "10 AM – 12 PM" or "6 – 8 PM", as hours (0–24). */
export function slotEndHour(label) {
  const m = String(label).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*$/i);
  if (!m) return null;
  let h = +m[1] % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h + (+m[2] || 0) / 60;
}

/** A slot can still be booked if it ends at least an hour from now (IST). */
export function slotOpen(dateStr, label, now = Date.now()) {
  const end = slotEndHour(label);
  if (end == null) return false;
  const endMs = Date.parse(`${dateStr}T00:00:00Z`) - IST + end * 3_600_000;
  return endMs - now >= 3_600_000;
}

/** The next `days` dates (IST) that still have at least one open slot. */
export function bookableDays(slots, days = 7, now = Date.now()) {
  const out = [];
  for (let i = 0; i <= days && out.length < days; i++) {
    const date = istDate(now + i * 86_400_000);
    const open = slots.filter((s) => slotOpen(date, s, now));
    if (open.length) out.push({ date, open, offset: i });
  }
  return out;
}
