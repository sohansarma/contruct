// Loads the catalogue into MongoDB. Safe to re-run: existing products keep
// prices edited in the admin dashboard unless you pass --reset-prices.
//   MONGODB_URI=... npm run seed
import { categories, products } from '../src/data/catalog.js';
import { close, col, connect } from './db.js';

const resetPrices = process.argv.includes('--reset-prices');
await connect();

await col('categories').bulkWrite(categories.map((c, i) => ({
  replaceOne: { filter: { _id: c.id }, replacement: { ...Object.fromEntries(Object.entries(c).filter(([k]) => k !== 'id')), sort: i }, upsert: true },
})));

let created = 0, updated = 0;
for (const { id, variants, inStock, active, priceSource, ...rest } of products) {
  const existing = await col('products').findOne({ _id: id });
  if (!existing) {
    await col('products').insertOne({ _id: id, ...rest, variants, inStock, active, priceSource, createdAt: new Date() });
    created++;
  } else {
    const keepPrices = !resetPrices && existing.priceSource === 'admin';
    await col('products').updateOne({ _id: id }, { $set: { ...rest, ...(keepPrices ? {} : { variants, priceSource }) } });
    updated++;
  }
}
console.log(`✓ ${categories.length} categories, ${created} products created, ${updated} updated`);
await close();
