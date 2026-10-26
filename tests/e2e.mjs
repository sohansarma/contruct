// End-to-end test of the live API + MongoDB. Start the server first with:
//   ALLOW_MOCK_PAYMENTS=1 ADMIN_PHONES=+919000000000 \
//   TEST_LOGINS="+919876543210:246810,+919000000000:135790" npm start
// then: API=http://localhost:8080 npm run test:e2e
import assert from 'node:assert/strict';

const API = (process.env.API || 'http://localhost:8080') + '/api';
let passed = 0;

async function call(method, path, body, token) {
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const ok = async (...a) => { const r = await call(...a); assert.ok(r.status < 300, `${a[0]} ${a[1]} → ${r.status} ${JSON.stringify(r.body)}`); return r.body; };
const step = async (name, fn) => { await fn(); passed++; console.log('✓', name); };

const login = async (phone, code) => {
  await ok('POST', '/auth/otp', { phone });
  return (await ok('POST', '/auth/verify', { phone, code })).token;
};

let me, admin, catalog, siteAddr;

await step('catalog is served from MongoDB with bulk tiers', async () => {
  catalog = await ok('GET', '/catalog');
  assert.ok(catalog.categories.length >= 20);
  const cement = catalog.products.find((p) => p.id === 'ultratech-ppc');
  assert.deepEqual(cement.variants[0].tiers.map((t) => t.min), [10, 30]);
  assert.equal(cement.priceSource, undefined, 'internal fields are hidden');
});

await step('OTP login: wrong code rejected, right code signs in', async () => {
  await ok('POST', '/auth/otp', { phone: '9876543210' });
  assert.equal((await call('POST', '/auth/verify', { phone: '9876543210', code: '000000' })).status, 400);
  assert.equal((await call('POST', '/auth/otp', { phone: '12345' })).status, 400, 'invalid number');
  me = await login('9876543210', '246810');
  const profile = await ok('PATCH', '/me', { name: 'Ravi Kumar', businessName: 'RK Builders', gstin: '29ABCDE1234F1Z5' }, me);
  assert.equal(profile.gstin, '29ABCDE1234F1Z5');
  assert.equal((await call('GET', '/me')).status, 401, 'no token → 401');
  assert.equal((await call('PATCH', '/me', { gstin: 'bad' }, me)).status, 400);
});

await step('addresses: create, list; other users cannot see them', async () => {
  siteAddr = await ok('POST', '/addresses', { label: 'Site', name: 'Ravi', phone: '9876543210', line1: 'Plot 12', line2: 'HSR Layout', pincode: '560102', city: 'Bengaluru' }, me);
  const list = await ok('GET', '/addresses', null, me);
  assert.ok(list.some((a) => a.id === siteAddr.id));
  admin = await login('+919000000000', '135790');
  assert.ok(!(await ok('GET', '/addresses', null, admin)).some((a) => a.id === siteAddr.id));
});

const cart = (qty) => ({ items: [{ productId: 'ultratech-ppc', variantId: 'ultratech-ppc-0', qty }, { productId: 'legrand-switch-6a', variantId: 'legrand-switch-6a-0', qty: 4 }] });

await step('server applies bulk tier pricing (30 bags → ₹405 each)', async () => {
  const b = await ok('POST', '/orders/quote', cart(30), me);
  assert.equal(b.itemTotal, 30 * 405 + 4 * 59);
  assert.equal(b.loading, 30 * 10, 'heavy-item loading fee');
  assert.equal(b.delivery, 0, 'free delivery above threshold');
});

let codOrder;
await step('place a pay-on-delivery order; tampered total is refused', async () => {
  const quote = await ok('POST', '/orders/quote', { ...cart(30), coupon: 'FIRSTBUILD' }, me);
  assert.equal(quote.discount, 300, 'first-order coupon capped at ₹300');
  const tampered = await call('POST', '/orders', { ...cart(30), coupon: 'FIRSTBUILD', addressId: siteAddr.id, payment: { method: 'cod' }, expectedTotal: 1 }, me);
  assert.equal(tampered.status, 409);
  codOrder = await ok('POST', '/orders', { ...cart(30), coupon: 'FIRSTBUILD', addressId: siteAddr.id, payment: { method: 'cod' }, expectedTotal: quote.total, gst: true, note: 'Call on arrival' }, me);
  assert.equal(codOrder.status, 'placed');
  assert.equal(codOrder.bill.total, quote.total);
  assert.equal(codOrder.items[0].price, 405);
  assert.equal(codOrder.gstin, '29ABCDE1234F1Z5');
  assert.equal(codOrder.payment.status, 'pending');
});

await step('first-order coupon cannot be reused', async () => {
  const b = await ok('POST', '/orders/quote', { ...cart(1), coupon: 'FIRSTBUILD' }, me);
  assert.equal(b.discount, 0);
  assert.match(b.couponError, /first order/i);
});

await step('unserviceable pincode and missing payment are rejected', async () => {
  const far = await ok('POST', '/addresses', { name: 'X', phone: '9876543210', line1: 'A', pincode: '400001' }, me);
  assert.equal((await call('POST', '/orders', { ...cart(1), addressId: far.id, payment: { method: 'cod' } }, me)).status, 400);
  assert.equal((await call('POST', '/orders', { ...cart(1), addressId: siteAddr.id, payment: { method: 'upi', ref: 'fake' } }, me)).status, 402);
  await ok('DELETE', `/addresses/${far.id}`, null, me);
});

let paidOrder;
await step('online payment (mock gateway): pay, place, cancel → refund to source', async () => {
  const body = { items: [{ productId: 'century-sainik-mr-18', variantId: 'century-sainik-mr-18-1', qty: 2 }] };
  const p = await ok('POST', '/payments/order', body, me);
  assert.equal(p.amount, 2 * 3044 + 9 + 20);
  const { ref } = await ok('POST', '/payments/verify', { gateway: 'mock', amount: p.amount }, me);
  paidOrder = await ok('POST', '/orders', { ...body, addressId: siteAddr.id, payment: { method: 'upi', ref }, expectedTotal: p.amount }, me);
  assert.equal(paidOrder.payment.status, 'paid');
  assert.equal((await call('POST', '/orders', { ...body, addressId: siteAddr.id, payment: { method: 'upi', ref } }, me)).status, 402, 'payment cannot be reused');
  const c = await ok('POST', `/orders/${paidOrder.id}/cancel`, { reason: 'Ordered by mistake' }, me);
  assert.equal(c.status, 'cancelled');
  assert.deepEqual([c.refund.amount, c.refund.to], [p.amount, 'source']);
});

await step('customers cannot use admin endpoints or see others’ orders', async () => {
  assert.equal((await call('GET', '/admin/orders', null, me)).status, 403);
  const other = await login('+919000000000', '135790');
  assert.equal((await call('POST', `/orders/${codOrder.id}/cancel`, {}, other)).status, 404);
});

await step('admin moves the order: confirm → pack → dispatch → deliver (COD marked paid)', async () => {
  for (const s of ['confirmed', 'packed']) await ok('POST', `/admin/orders/${codOrder.id}/status`, { status: s }, admin);
  assert.equal((await call('POST', `/admin/orders/${codOrder.id}/status`, { status: 'returned' }, admin)).status, 400, 'illegal transition');
  await ok('POST', `/admin/orders/${codOrder.id}/status`, { status: 'out_for_delivery', rider: { name: 'Suresh', phone: '9000011111' } }, admin);
  const d = await ok('POST', `/admin/orders/${codOrder.id}/status`, { status: 'delivered' }, admin);
  assert.equal(d.status, 'delivered');
  assert.equal(d.payment.status, 'paid');
  assert.equal(d.rider.name, 'Suresh');
  assert.deepEqual(d.history.map((h) => h.status), ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered']);
  assert.equal((await call('POST', `/orders/${codOrder.id}/cancel`, {}, me)).status, 400, 'delivered orders cannot be cancelled');
});

await step('return within 24 h → admin approves → cash refund becomes wallet credit', async () => {
  const key = codOrder.items.find((i) => i.productId === 'legrand-switch-6a').key;
  const r = await ok('POST', `/orders/${codOrder.id}/return`, { itemIds: [key], reason: 'Defective / not working' }, me);
  assert.equal(r.status, 'return_requested');
  const done = await ok('POST', `/admin/orders/${codOrder.id}/status`, { status: 'returned' }, admin);
  assert.deepEqual([done.refund.amount, done.refund.to], [4 * 59, 'wallet']);
  const w = await ok('GET', '/wallet', null, me);
  assert.equal(w.balance, 236);
});

await step('wallet credit pays for the next order', async () => {
  const body = { items: [{ productId: 'philips-led-bulb', variantId: 'philips-led-bulb-0', qty: 2 }], useWallet: true };
  const q = await ok('POST', '/orders/quote', body, me);
  assert.equal(q.total, 0);
  const o = await ok('POST', '/orders', { ...body, addressId: siteAddr.id, payment: { method: 'cod' }, expectedTotal: 0 }, me);
  assert.equal(o.payment.method, 'wallet_credit');
  assert.equal((await ok('GET', '/wallet', null, me)).balance, 236 - q.wallet);
  const c = await ok('POST', `/orders/${o.id}/cancel`, { reason: 'test' }, me);
  assert.equal(c.status, 'cancelled');
  assert.equal((await ok('GET', '/wallet', null, me)).balance, 236, 'credit restored on cancel');
});

await step('admin edits a price; the new price is charged', async () => {
  const p = await ok('PATCH', '/admin/products/legrand-switch-6a', { variants: [{ id: 'legrand-switch-6a-0', price: 62, mrp: 75, tiers: [{ min: 20, price: 58 }] }] }, admin);
  assert.equal(p.variants[0].price, 62);
  const b = await ok('POST', '/orders/quote', { items: [{ productId: 'legrand-switch-6a', variantId: 'legrand-switch-6a-0', qty: 20 }] }, me);
  assert.equal(b.itemTotal, 20 * 58);
  assert.equal((await call('PATCH', '/admin/products/legrand-switch-6a', { variants: [{ id: 'legrand-switch-6a-0', price: 80, mrp: 75 }] }, admin)).status, 400, 'MRP below price refused');
  await ok('PATCH', '/admin/products/legrand-switch-6a', { inStock: false }, admin);
  assert.equal((await call('POST', '/orders/quote', { items: [{ productId: 'legrand-switch-6a', variantId: 'legrand-switch-6a-0', qty: 1 }] }, me)).status, 409, 'out of stock');
  await ok('PATCH', '/admin/products/legrand-switch-6a', { inStock: true, variants: [{ id: 'legrand-switch-6a-0', price: 59, mrp: 75, tiers: [{ min: 20, price: 55 }, { min: 50, price: 52 }] }] }, admin);
});

await step('bulk quote request reaches the admin', async () => {
  await ok('POST', '/quotes', { name: 'Ravi', phone: '9876543210', pincode: '560102', items: '200 bags OPC 53', when: 'This week' });
  assert.ok((await ok('GET', '/admin/quotes', null, admin)).some((q) => q.items === '200 bags OPC 53'));
});

console.log(`\n${passed} end-to-end checks passed against ${API}`);
