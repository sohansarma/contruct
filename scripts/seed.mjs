// Loads categories, products, pincodes and coupons into Supabase.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
import { createClient } from '@supabase/supabase-js';
import { categories, products } from '../src/data/catalog.js';

const { coupons, serviceablePincodes } = await import('../src/config.js');

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const run = async (label, p) => { const { error } = await p; if (error) { console.error(label, error.message); process.exit(1); } console.log('✓', label); };
await run('categories', db.from('categories').upsert(categories.map((c, i) => ({ id: c.id, sort: i, data: c }))));
await run('products', db.from('products').upsert(products.map(({ id, categoryId, inStock, ...data }) => ({ id, category_id: categoryId, in_stock: inStock, data }))));
await run('pincodes', db.from('pincodes').upsert([...serviceablePincodes].map((pincode) => ({ pincode }))));
await run('coupons', db.from('coupons').upsert(coupons.map((c) => ({ code: c.code, type: c.type, value: c.value || 0, max_discount: c.max ?? null, min_cart: c.minCart || 0, first_order_only: !!c.firstOrderOnly }))));
console.log('Seed complete.');
