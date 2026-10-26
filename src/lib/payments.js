// Online payments (UPI, cards, net banking, wallets) via Razorpay.
// The server prices the cart, opens the gateway order and verifies the
// signature; the app only opens Razorpay Checkout. Demo mode simulates it.
import { api, mode } from './api.js';
import { brand } from '../config.js';

function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = res;
    s.onerror = () => rej(new Error('Could not load the payment page. Check your connection.'));
    document.body.appendChild(s);
  });
}

/** Resolves with { ref, gateway } once the payment is verified by the server. */
export async function payOnline({ order, method, user }) {
  if (mode !== 'live') {
    await new Promise((r) => setTimeout(r, 900));
    return { ref: 'demo_' + Date.now().toString(36), gateway: 'demo' };
  }
  const p = await api.paymentOrder(order);
  if (p.gateway === 'mock') {
    const { ref } = await api.verifyPayment({ gateway: 'mock', amount: p.amount });
    return { ref, gateway: 'mock' };
  }
  await loadScript();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: p.keyId,
      order_id: p.orderId,
      amount: Math.round(p.amount * 100),
      currency: 'INR',
      name: brand.name,
      prefill: { contact: user.phone, email: user.email || undefined, name: user.name || undefined, method },
      theme: { color: '#ff4f1f' },
      handler: async (resp) => {
        try {
          const { ref } = await api.verifyPayment(resp);
          resolve({ ref, gateway: 'razorpay' });
        } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled. You have not been charged.')) },
    });
    rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed.')));
    rzp.open();
  });
}
