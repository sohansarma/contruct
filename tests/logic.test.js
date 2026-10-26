import { describe, expect, it } from 'vitest';
import { computeBill, gstBreakup, isServiceable, nextTier, unitPrice, validateCoupon } from '../src/lib/pricing.js';
import { packsFor, paintLitres, plasterCementBags, puttyBags, tileAdhesiveBags, wireCoils } from '../src/lib/calc.js';
import { canCancel, canReturn, refundDestination, simulatedStatus } from '../src/lib/orderLogic.js';
import { searchProducts } from '../src/lib/search.js';
import { categories, products } from '../src/data/catalog.js';
import { rules } from '../src/config.js';

const line = (price, qty = 1, extra = {}) => ({ price, mrp: price + 10, qty, heavy: false, ...extra });

describe('bill', () => {
  it('charges delivery below the free threshold and waives it above', () => {
    expect(computeBill([line(100)]).delivery).toBe(rules.deliveryFee);
    expect(computeBill([line(rules.freeDeliveryAbove)]).delivery).toBe(0);
  });
  it('adds per-unit loading for heavy items', () => {
    const b = computeBill([line(420, 10, { heavy: true })]);
    expect(b.loading).toBe(10 * rules.heavyItemFee);
    expect(b.total).toBe(4200 + rules.handlingFee + b.loading);
  });
  it('applies percent coupons with a cap and first-order rule', () => {
    expect(computeBill([line(10000)], { coupon: 'FIRSTBUILD', isFirstOrder: true }).discount).toBe(300);
    expect(computeBill([line(1000)], { coupon: 'FIRSTBUILD', isFirstOrder: false }).couponError).toMatch(/first order/);
  });
  it('rejects unknown codes and enforces minimum cart', () => {
    expect(validateCoupon('NOPE', 5000, true).ok).toBe(false);
    expect(validateCoupon('SITE200', 1000, false).error).toMatch(/more/);
  });
  it('free-delivery coupon zeroes delivery', () => {
    expect(computeBill([line(100)], { coupon: 'FREEDEL' }).delivery).toBe(0);
  });
  it('wallet never pushes total below zero', () => {
    const b = computeBill([line(100)], { walletBalance: 10000, useWallet: true });
    expect(b.total).toBe(0);
    expect(b.wallet).toBe(100 + rules.deliveryFee + rules.handlingFee);
  });
  it('splits GST into equal halves', () => {
    const g = gstBreakup(118);
    expect(g.taxable).toBe(100);
    expect(g.cgst).toBe(9);
    expect(g.sgst).toBe(9);
  });
});

describe('serviceability', () => {
  it('knows Bengaluru pincodes', () => {
    expect(isServiceable('560102')).toBe(true);
    expect(isServiceable('400001')).toBe(false);
    expect(isServiceable('')).toBe(false);
  });
});

describe('order lifecycle', () => {
  const base = { status: 'placed', createdAt: 0, items: [{ returnable: true }], payment: { method: 'upi' }, etaMinutes: 60 };
  it('allows cancel only inside the window', () => {
    expect(canCancel(base, 60_000)).toBe(true);
    expect(canCancel(base, rules.cancelWindowMin * 60_000 + 1)).toBe(false);
    expect(canCancel({ ...base, status: 'packed' }, 1000)).toBe(false);
  });
  it('allows returns for 24h after delivery when something is returnable', () => {
    const d = { ...base, status: 'delivered', deliveredAt: 1000 };
    expect(canReturn(d, 2000)).toBe(true);
    expect(canReturn(d, 1000 + 25 * 3_600_000)).toBe(false);
    expect(canReturn({ ...d, items: [{ returnable: false }] }, 2000)).toBe(false);
  });
  it('refunds cash to wallet and online to source', () => {
    expect(refundDestination({ payment: { method: 'cod' } })).toBe('wallet');
    expect(refundDestination({ payment: { method: 'card' } })).toBe('source');
  });
  it('simulator advances monotonically and marks delivery', () => {
    expect(simulatedStatus(base, 20 * 60_000).status).toBe('packed');
    const done = simulatedStatus(base, 61 * 60_000);
    expect(done.status).toBe('delivered');
    expect(done.deliveredAt).toBe(60 * 60_000);
    expect(simulatedStatus({ ...base, status: 'cancelled' }, 1e9).status).toBe('cancelled');
    expect(simulatedStatus({ ...base, slot: '2026-01-01 8 – 10 AM' }, 1e9).status).toBe('placed');
  });
});

describe('search', () => {
  it('finds by name, brand, synonyms and size tokens', () => {
    expect(searchProducts(products, categories, 'cement')[0].categoryId).toBe('cement');
    expect(searchProducts(products, categories, 'polycab').every((p) => p.brand === 'Polycab')).toBe(true);
    expect(searchProducts(products, categories, 'ply 18 mm').some((p) => p.id === 'century-sainik-mr-18')).toBe(true);
    expect(searchProducts(products, categories, 'zzzz')).toEqual([]);
  });
});

describe('catalog integrity', () => {
  it('every product has a valid category and priced variants', () => {
    const ids = new Set(categories.map((c) => c.id));
    for (const p of products) {
      expect(ids.has(p.categoryId)).toBe(true);
      for (const v of p.variants) { expect(v.price).toBeGreaterThan(0); expect(v.mrp).toBeGreaterThanOrEqual(v.price); }
    }
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
  });
});

describe('bulk tiers', () => {
  const v = { price: 425, tiers: [{ min: 10, price: 415 }, { min: 30, price: 405 }] };
  it('picks the best tier the quantity reaches', () => {
    expect(unitPrice(v, 1)).toBe(425);
    expect(unitPrice(v, 10)).toBe(415);
    expect(unitPrice(v, 29)).toBe(415);
    expect(unitPrice(v, 30)).toBe(405);
    expect(unitPrice({ price: 100 }, 50)).toBe(100);
  });
  it('tells how many more units unlock the next tier', () => {
    expect(nextTier(v, 4)).toEqual({ min: 10, price: 415, more: 6 });
    expect(nextTier(v, 30)).toBe(null);
  });
  it('catalog tiers are always cheaper than the base price', () => {
    for (const p of products) for (const x of p.variants) for (const t of x.tiers) { expect(t.price).toBeLessThan(x.price); expect(t.min).toBeGreaterThan(1); }
  });
});

describe('material calculator', () => {
  it('estimates plaster cement, putty, paint, tile adhesive and wire', () => {
    expect(plasterCementBags(100)).toBe(10); // 100 m² at 12 mm, 1:4 ≈ 9.7 bags incl. wastage
    expect(puttyBags(100, 40)).toBe(3);
    expect(paintLitres(120, 2)).toBe(21);
    expect(packsFor(21)).toEqual({ 20: 1, 1: 1 });
    expect(packsFor(37)).toEqual({ 20: 1, 10: 1, 4: 1, 1: 3 });
    expect(tileAdhesiveBags(45)).toBe(11);
    expect(wireCoils({ lightPoints: 20, socketPoints: 12 })).toEqual({ light: 5, power: 4, earth: 3 });
  });
});
