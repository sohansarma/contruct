// Lightweight client-side search: token match across name, brand, category,
// variants and specs, with a few trade synonyms. Good for a few thousand SKUs.
const SYN = {
  ply: 'plywood', plyboard: 'plywood', wire: 'wires', cable: 'wire', mcb: 'mcb', db: 'distribution',
  tap: 'cock', faucet: 'faucet', bulb: 'bulb', light: 'led', glue: 'adhesive', fevicol: 'adhesive',
  pipe: 'pipe', tank: 'tank', lock: 'lock', paint: 'emulsion', primer: 'primer', drill: 'drill',
};
const norm = (s) => String(s || '').toLowerCase().replace(/(\d)\s*(mm|sq|kg|l|w|a)\b/g, '$1$2').replace(/[^a-z0-9.]+/g, ' ').trim();

export function searchProducts(products, categories, query) {
  const q = norm(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const scored = [];
  for (const p of products) {
    const name = norm(p.name);
    const hay = norm([p.name, p.brand, catName[p.categoryId], p.categoryId, p.unit, ...p.variants.map((v) => v.label), ...Object.values(p.specs)].join(' '));
    let score = 0;
    let all = true;
    for (const t of tokens) {
      const alt = SYN[t];
      if (name.includes(t)) score += 3;
      else if (hay.includes(t)) score += 2;
      else if (alt && hay.includes(alt)) score += 1;
      else if (t.length > 3 && hay.includes(t.slice(0, -1))) score += 1; // plural / typo tail
      else all = false;
    }
    if (all && score) scored.push([score + (p.tag ? 0.5 : 0), p]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map(([, p]) => p);
}
