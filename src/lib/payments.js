// Online payments through Razorpay (UPI, cards, net banking, wallets).
// Live: an order is created and its signature verified server-side by the
// Supabase Edge Function in supabase/functions/razorpay. Demo: simulated.
import { api, mode } from './api.js';

const KEY = import.meta.env?.VITE_RAZORPAY_KEY_ID;
export const paymentsLive = !!KEY && mode === 'live';

function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = res; s.onerror = () => rej(new Error('Could not load payment gateway'));
    document.body.appendChild(s);
  });
}

/** Resolves with { status: 'paid', ref } or rejects if the user dismisses / payment fails. */
export async function payOnline({ amount, method, user, receipt }) {
  if (!paymentsLive) {
    await new Promise((r) => setTimeout(r, 900));
    return { status: 'paid', ref: 'demo_' + Date.now().toString(36), gateway: 'demo' };
  }
  await loadScript();
  const fn = api.client.functions;
  const { data: rzpOrder, error } = await fn.invoke('razorpay', { body: { action: 'create', amount, receipt } });
  if (error) throw new Error('Could not start payment');
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: KEY,
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: 'INR',
      name: 'BuildRun',
      prefill: { contact: user.phone, email: user.email || undefined, name: user.name || undefined, method },
      theme: { color: '#ff385c' },
      handler: async (resp) => {
        const { data, error: e } = await fn.invoke('razorpay', { body: { action: 'verify', ...resp } });
        if (e || !data?.valid) return reject(new Error('Payment could not be verified'));
        resolve({ status: 'paid', ref: resp.razorpay_payment_id, gatewayOrder: resp.razorpay_order_id, gateway: 'razorpay' });
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
    rzp.open();
  });
}
