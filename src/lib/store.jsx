import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { applySettings } from '../config.js';
import { isServiceable, unitPrice } from './pricing.js';
import { tap } from './native.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const read = (k, d) => { try { return JSON.parse(localStorage.getItem('br:' + k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem('br:' + k, JSON.stringify(v)); } catch { /* ignore */ } };

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [location, setLocationState] = useState(() => read('location', null));
  const [cart, setCart] = useState(() => read('cart', {})); // key -> { productId, variantId, qty }
  const [toast, setToast] = useState(null);
  const [recent, setRecent] = useState(() => read('recent', []));

  useEffect(() => {
    Promise.all([api.getSession(), api.catalog()])
      .then(([u, cat]) => {
        if (cat.settings) applySettings(cat.settings);
        setUser(u); setProducts(cat.products); setCategories(cat.categories);
      })
      .finally(() => setReady(true));
  }, []);

  // after admin edits: re-read catalogue + settings so the shop shows them at once
  const reloadCatalog = useCallback(async () => {
    const cat = await api.catalog();
    if (cat.settings) applySettings(cat.settings);
    setProducts(cat.products); setCategories(cat.categories);
    setLocationState((l) => (l ? { ...l, serviceable: isServiceable(l.pincode) } : l));
  }, []);
  useEffect(() => write('cart', cart), [cart]);
  useEffect(() => write('recent', recent), [recent]);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const notify = useCallback((msg) => {
    setToast({ msg, id: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.id >= 2400 ? null : t)), 2500);
  }, []);

  const setLocation = useCallback((loc) => {
    const next = loc ? { ...loc, serviceable: isServiceable(loc.pincode) } : null;
    setLocationState(next); write('location', next);
  }, []);

  const setQty = useCallback((productId, variantId, qty) => {
    tap();
    setCart((c) => {
      const key = `${productId}|${variantId}`;
      const next = { ...c };
      if (qty <= 0) delete next[key];
      else next[key] = { productId, variantId, qty: Math.min(qty, 999) };
      return next;
    });
  }, []);
  const qtyOf = useCallback((productId, variantId) => cart[`${productId}|${variantId}`]?.qty || 0, [cart]);
  const clearCart = useCallback(() => setCart({}), []);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([key, l]) => {
          const p = productMap[l.productId];
          const v = p?.variants.find((x) => x.id === l.variantId);
          if (!p || !v) return null;
          return { key, product: p, variant: v, qty: l.qty, price: unitPrice(v, l.qty), mrp: v.mrp, heavy: p.heavy };
        })
        .filter(Boolean),
    [cart, productMap],
  );
  const cartCount = lines.reduce((s, l) => s + l.qty, 0);

  const pushRecent = useCallback((q) => {
    if (!q?.trim()) return;
    setRecent((r) => [q.trim(), ...r.filter((x) => x.toLowerCase() !== q.trim().toLowerCase())].slice(0, 8));
  }, []);

  const value = {
    ready, user, setUser, products, categories, productMap, reloadCatalog,
    location, setLocation,
    cart, lines, cartCount, setQty, qtyOf, clearCart,
    toast, notify, recent, pushRecent, setRecent,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
