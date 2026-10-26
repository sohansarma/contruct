import crypto from 'node:crypto';
import { env } from './env.js';

const auth = () => 'Basic ' + Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
export const razorpayEnabled = () => !!(env.razorpay.keyId && env.razorpay.keySecret);

async function call(path, body) {
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error?.description || 'Payment gateway error');
  return json;
}

export const createOrder = (amountRupees, receipt) =>
  call('/orders', { amount: Math.round(amountRupees * 100), currency: 'INR', receipt: String(receipt).slice(0, 40) });

export const fetchOrder = (id) => call(`/orders/${id}`);

export function signatureValid(orderId, paymentId, signature) {
  const expected = crypto.createHmac('sha256', env.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return expected.length === String(signature).length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
}

export const refund = (paymentId, amountRupees) => call(`/payments/${paymentId}/refund`, { amount: Math.round(amountRupees * 100) });
