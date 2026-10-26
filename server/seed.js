// Loads the starter catalogue and default settings into MongoDB.
// Safe to re-run: it only adds what is missing and refreshes products nobody
// has edited in the admin. Use --reset to overwrite everything with the seed.
//   MONGODB_URI=... npm run seed
import { categories, products } from '../src/data/catalog.js';
import { currentSettings } from '../src/config.js';
import { close, col, connect } from './db.js';

const reset = process.argv.includes('--reset');
await connect();

let cats = 0;
for (const [i, { id, ...c }] of categories.entries()) {
  const r = await col('categories').updateOne(
    { _id: id },
    reset ? { $set: { ...c, sort: i, hidden: false } } : { $setOnInsert: { ...c, sort: i, hidden: false } },
    { upsert: true },
  );
  cats += r.upsertedCount;
}

let created = 0, refreshed = 0, kept = 0;
for (const { id, ...p } of products) {
  const existing = await col('products').findOne({ _id: id });
  const doc = { ...p, images: p.image ? [p.image] : [], updatedAt: new Date() };
  if (!existing) {
    await col('products').insertOne({ _id: id, ...doc, createdAt: new Date() });
    created++;
  } else if (reset || existing.priceSource !== 'admin') {
    await col('products').updateOne({ _id: id }, { $set: doc });
    refreshed++;
  } else kept++;
}

const s = await col('settings').updateOne({ _id: 'store' }, reset ? { $set: currentSettings() } : { $setOnInsert: currentSettings() }, { upsert: true });

console.log(`✓ categories: ${cats} added · products: ${created} added, ${refreshed} refreshed, ${kept} kept (edited in admin) · settings: ${s.upsertedCount ? 'created' : reset ? 'reset' : 'kept'}`);
await close();
