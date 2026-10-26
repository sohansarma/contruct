// Supabase Edge Function: creates Razorpay orders and verifies payment signatures.
// Deploy:  supabase functions deploy razorpay
// Secrets: supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=...
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!;
const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;
const auth = 'Basic ' + btoa(`${KEY_ID}:${KEY_SECRET}`);

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await req.json();

  if (body.action === 'create') {
    const amount = Math.round(Number(body.amount) * 100);
    if (!(amount > 0)) return json({ error: 'bad amount' }, 400);
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'INR', receipt: String(body.receipt).slice(0, 40), notes: { user: user.id } }),
    });
    return json(await r.json(), r.status);
  }

  if (body.action === 'verify') {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    const expected = await hmacHex(KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expected !== razorpay_signature) return json({ valid: false }, 400);
    const r = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, { headers: { Authorization: auth } });
    const order = await r.json();
    await admin.from('payments').upsert({
      id: razorpay_payment_id, gateway_order_id: razorpay_order_id, user_id: user.id, amount: order.amount_paid / 100, verified: true,
    });
    return json({ valid: true });
  }

  if (body.action === 'refund') {
    // Admin-only: push pending 'source' refunds to Razorpay.
    const { data: prof } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!prof?.is_admin) return json({ error: 'forbidden' }, 403);
    const { data: pending } = await admin.from('refunds').select('*').eq('status', 'pending').eq('destination', 'source');
    const results = [];
    for (const rf of pending ?? []) {
      const r = await fetch(`https://api.razorpay.com/v1/payments/${rf.payment_id}/refund`, {
        method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Math.round(rf.amount * 100) }),
      });
      await admin.from('refunds').update({ status: r.ok ? 'processed' : 'failed' }).eq('id', rf.id);
      results.push({ id: rf.id, ok: r.ok });
    }
    return json({ results });
  }
  return json({ error: 'unknown action' }, 400);
});
