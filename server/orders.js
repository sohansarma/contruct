// Order placement and lifecycle. Every amount is recomputed here from the
// catalogue in MongoDB using the same pricing code as the app, so a client
// can never change a price, skip payment or overspend credit.
import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import { col, withTxn } from './db.js';
import { HttpError } from './auth.js';
import { codAllowed, computeBill, isServiceable, unitPrice } from '../src/lib/pricing.js';
import { STATUS, canCancel, canReturn, refundDestination, returnAmount } from '../src/lib/orderLogic.js';
import { rules } from '../src/config.js';
import * as rzp from './razorpay.js';

const now = () => Date.now();

export function serializeOrder(o) {
  if (!o) return null;
  const { _id, userId, createdAt, deliveredAt, ...rest } = o;
  return { ...rest, id: _id, userId: String(userId), createdAt: +createdAt, deliveredAt: deliveredAt ? +deliveredAt : null };
}

export async function walletBalance(userId, session) {
  const [r] = await col('wallet_txns').aggregate([{ $match: { userId } }, { $group: { _id: null, s: { $sum: '$amount' } } }], { session }).toArray();
  return r?.s || 0;
}

/** Server-side bill for a cart; also used by POST /orders/quote. */
export async function priceCart(user, { items, coupon, useWallet }, session) {
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Your cart is empty.');
  if (items.length > 100) throw new HttpError(400, 'Too many items.');
  const ids = [...new Set(items.map((i) => String(i.productId)))];
  const products = await col('products').find({ _id: { $in: ids }, active: true }, { session }).toArray();
  const byId = Object.fromEntries(products.map((p) => [p._id, p]));
  const lines = items.map((i) => {
    const p = byId[i.productId];
    const v = p?.variants.find((x) => x.id === i.variantId);
    const qty = Math.floor(Number(i.qty));
    if (!p || !v || !p.inStock) throw new HttpError(409, `${p?.name || 'An item'} is no longer available. Please update your cart.`);
    if (!(qty >= 1 && qty <= 999)) throw new HttpError(400, 'Invalid quantity.');
    return {
      key: `${p._id}|${v.id}`, productId: p._id, variantId: v.id, name: p.name, brand: p.brand, variant: v.label,
      price: unitPrice(v, qty), mrp: v.mrp, qty, heavy: !!p.heavy, returnable: !!p.returnable, categoryId: p.categoryId,
    };
  });
  const prior = await col('orders').countDocuments({ userId: user._id, status: { $ne: 'cancelled' } }, { session });
  const balance = await walletBalance(user._id, session);
  const bill = computeBill(lines, { coupon, isFirstOrder: prior === 0, walletBalance: balance, useWallet: !!useWallet });
  return { lines, bill };
}

export async function placeOrder(user, body) {
  return withTxn(async (session) => {
    const { lines, bill } = await priceCart(user, body, session);
    if (body.expectedTotal != null && Math.abs(Number(body.expectedTotal) - bill.total) > 0.5) {
      throw Object.assign(new HttpError(409, 'Prices have changed since you opened checkout. Please review your bill.'), { bill });
    }
    let address;
    try { address = await col('addresses').findOne({ _id: new ObjectId(String(body.addressId)), userId: user._id }, { session }); } catch { /* bad id */ }
    if (!address) throw new HttpError(400, 'Choose a delivery address.');
    if (!isServiceable(address.pincode)) throw new HttpError(400, `We don't deliver to ${address.pincode} yet.`);

    const method = bill.total === 0 ? 'wallet_credit' : String(body.payment?.method || '');
    let payment;
    if (method === 'cod') {
      if (!codAllowed(address.pincode)) throw new HttpError(400, 'Pay on delivery is not available here.');
      payment = { method, status: 'pending' };
    } else if (method === 'wallet_credit') {
      payment = { method, status: 'paid' };
    } else if (['upi', 'card', 'netbanking', 'wallet'].includes(method)) {
      const ref = String(body.payment?.ref || '');
      const pay = await col('payments').findOneAndUpdate(
        { _id: ref, userId: user._id, verified: true, usedBy: null, amount: { $gte: bill.total - 0.5 } },
        { $set: { usedBy: 'pending' } },
        { session, returnDocument: 'after' },
      );
      if (!pay) throw new HttpError(402, 'Payment not verified. You have not been charged twice; please try again.');
      payment = { method, status: 'paid', ref, gateway: pay.gateway };
    } else {
      throw new HttpError(400, 'Choose a payment method.');
    }

    const id = 'BR' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const created = new Date();
    const { _id: _a, userId: _u, ...addr } = address;
    const order = {
      _id: id, userId: user._id, status: 'placed', createdAt: created, deliveredAt: null,
      items: lines, bill, payment,
      address: { ...addr, id: String(address._id) },
      slot: body.slot === 'asap' || !body.slot ? 'asap' : String(body.slot).slice(0, 40),
      etaMinutes: rules.etaMin + Math.min(60, lines.length * 3),
      note: String(body.note || '').slice(0, 300),
      gstin: body.gst ? user.gstin || '' : '',
      businessName: body.gst ? user.businessName || '' : '',
      history: [{ status: 'placed', at: +created }],
    };
    await col('orders').insertOne(order, { session });
    if (payment.ref) await col('payments').updateOne({ _id: payment.ref }, { $set: { usedBy: id } }, { session });
    if (bill.wallet > 0) await col('wallet_txns').insertOne({ userId: user._id, amount: -bill.wallet, note: `Used on order ${id}`, orderId: id, createdAt: created }, { session });
    return serializeOrder(order);
  });
}

async function issueRefund(order, amount, session) {
  if (amount <= 0) return null;
  const to = refundDestination(order);
  const refund = { orderId: order._id, amount, to, paymentId: order.payment.ref || null, status: to === 'wallet' ? 'processed' : 'pending', createdAt: new Date() };
  if (to === 'wallet') {
    await col('wallet_txns').insertOne({ userId: order.userId, amount, note: `Refund · ${order._id}`, orderId: order._id, createdAt: new Date() }, { session });
  }
  const { insertedId } = await col('refunds').insertOne(refund, { session });
  return { ...refund, _id: insertedId };
}

/** Push a pending card/UPI refund to Razorpay (outside the DB transaction). */
async function settleGatewayRefund(refund) {
  if (!refund || refund.to !== 'source' || !refund.paymentId) return;
  if (!rzp.razorpayEnabled()) return; // stays pending; process from Razorpay dashboard
  try {
    await rzp.refund(refund.paymentId, refund.amount);
    await col('refunds').updateOne({ _id: refund._id }, { $set: { status: 'processed' } });
  } catch (e) {
    await col('refunds').updateOne({ _id: refund._id }, { $set: { status: 'failed', error: e.message } });
  }
}

export async function cancelOrder(user, id, reason, { byAdmin = false } = {}) {
  let refund;
  const order = await withTxn(async (session) => {
    const o = await col('orders').findOne(byAdmin ? { _id: id } : { _id: id, userId: user._id }, { session });
    if (!o) throw new HttpError(404, 'Order not found.');
    if (!byAdmin && !canCancel({ ...o, createdAt: +o.createdAt }, now())) throw new HttpError(400, 'This order can no longer be cancelled. Please contact support.');
    if (!['placed', 'confirmed', 'packed', 'out_for_delivery'].includes(o.status)) throw new HttpError(400, 'This order can’t be cancelled.');
    const at = now();
    const upd = await col('orders').findOneAndUpdate(
      { _id: id, status: o.status },
      { $set: { status: 'cancelled', cancelReason: String(reason || '').slice(0, 120) }, $push: { history: { status: 'cancelled', at } } },
      { session, returnDocument: 'after' },
    );
    if (!upd) throw new HttpError(409, 'Order changed, please retry.');
    if (o.bill.wallet > 0) await col('wallet_txns').insertOne({ userId: o.userId, amount: o.bill.wallet, note: `Credit restored · ${id}`, orderId: id, createdAt: new Date() }, { session });
    if (o.payment.status === 'paid' && o.bill.total > 0) {
      refund = await issueRefund(upd, o.bill.total, session);
      await col('orders').updateOne({ _id: id }, { $set: { refund: { amount: refund.amount, to: refund.to, at } } }, { session });
      upd.refund = { amount: refund.amount, to: refund.to, at };
    }
    return upd;
  });
  await settleGatewayRefund(refund);
  return serializeOrder(order);
}

export async function requestReturn(user, id, { itemIds, reason, note }) {
  const o = await col('orders').findOne({ _id: id, userId: user._id });
  if (!o) throw new HttpError(404, 'Order not found.');
  if (!canReturn({ ...o, deliveredAt: o.deliveredAt ? +o.deliveredAt : null }, now())) throw new HttpError(400, 'The return window for this order has closed.');
  const valid = new Set(o.items.filter((i) => i.returnable).map((i) => i.key));
  const ids = (itemIds || []).filter((k) => valid.has(k));
  if (!ids.length) throw new HttpError(400, 'Select items to return.');
  const at = now();
  const upd = await col('orders').findOneAndUpdate(
    { _id: id, status: 'delivered' },
    { $set: { status: 'return_requested', returnRequest: { itemIds: ids, reason: String(reason || '').slice(0, 80), note: String(note || '').slice(0, 500), at } }, $push: { history: { status: 'return_requested', at } } },
    { returnDocument: 'after' },
  );
  if (!upd) throw new HttpError(409, 'Order changed, please retry.');
  return serializeOrder(upd);
}

const NEXT = { placed: ['confirmed', 'cancelled'], confirmed: ['packed', 'cancelled'], packed: ['out_for_delivery', 'cancelled'], out_for_delivery: ['delivered', 'cancelled'], return_requested: ['returned', 'delivered'] };

export async function adminSetStatus(admin, id, status, extra = {}) {
  if (!STATUS[status]) throw new HttpError(400, 'Unknown status.');
  if (status === 'cancelled') return cancelOrder(admin, id, 'Cancelled by store', { byAdmin: true });
  let refund;
  const order = await withTxn(async (session) => {
    const o = await col('orders').findOne({ _id: id }, { session });
    if (!o) throw new HttpError(404, 'Order not found.');
    if (!(NEXT[o.status] || []).includes(status)) throw new HttpError(400, `Can’t move from ${o.status} to ${status}.`);
    const at = now();
    const $set = { status };
    if (status === 'delivered' && !o.deliveredAt) $set.deliveredAt = new Date(at);
    if (status === 'delivered' && o.payment.method === 'cod') $set['payment.status'] = 'paid';
    if (status === 'out_for_delivery' && extra.rider) $set.rider = { name: String(extra.rider.name || '').slice(0, 60), phone: String(extra.rider.phone || '').slice(0, 15), vehicle: String(extra.rider.vehicle || '').slice(0, 40) };
    const upd = await col('orders').findOneAndUpdate({ _id: id, status: o.status }, { $set, $push: { history: { status, at } } }, { session, returnDocument: 'after' });
    if (!upd) throw new HttpError(409, 'Order changed, please retry.');
    if (status === 'returned') {
      refund = await issueRefund(upd, returnAmount(upd), session);
      if (refund) {
        await col('orders').updateOne({ _id: id }, { $set: { refund: { amount: refund.amount, to: refund.to, at } } }, { session });
        upd.refund = { amount: refund.amount, to: refund.to, at };
      }
    }
    return upd;
  });
  await settleGatewayRefund(refund);
  return serializeOrder(order);
}
