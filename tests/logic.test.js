import { describe, expect, it } from 'vitest';
import { computeBill, gstBreakup, isServiceable, validateCoupon } from '../src/lib/pricing.js';
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
    expect(searchProducts(products, categories, 'ply 18 mm').some((p) => p.id === 'bwp-ply-18')).toBe(true);
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
