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
