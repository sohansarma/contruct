// Rule-of-thumb material estimators used on site. All areas in m².
export const SQFT_PER_M2 = 10.7639;

/** Cement for plastering at mix 1:ratio and thickness (mm). Returns 50 kg bags. */
export function plasterCementBags(area, { thicknessMm = 12, ratio = 4 } = {}) {
  const wet = area * (thicknessMm / 1000);
  const dry = wet * 1.27 * 1.1; // dry-volume factor + 10% wastage
  const cementM3 = dry / (1 + ratio);
  return Math.ceil((cementM3 * 1440) / 50);
}

/** Wall putty, two coats ≈ 1 kg/m². Returns bags of `bagKg`. */
export function puttyBags(area, bagKg = 40) {
  return Math.ceil((area * 1.0 * 1.05) / bagKg);
}

/** Paint litres: ~12 m² per litre per coat, plus 5%. */
export function paintLitres(area, coats = 2) {
  return Math.ceil(((area * coats) / 12) * 1.05);
}

/** Split litres into the fewest packs using available sizes (litres), smallest overshoot. */
export function packsFor(litres, sizes = [20, 10, 4, 1]) {
  const sorted = [...sizes].sort((a, b) => b - a);
  const out = {};
  let left = litres;
  for (const s of sorted) {
    const n = Math.floor(left / s);
    if (n) { out[s] = n; left -= n * s; }
  }
  if (left > 0) { const s = sorted[sorted.length - 1]; out[s] = (out[s] || 0) + Math.ceil(left / s); }
  return out;
}

/** Tile adhesive, ~4.5 m² per 20 kg bag (6 mm notch trowel), plus 5%. */
export function tileAdhesiveBags(area) {
  return Math.ceil((area * 1.05) / 4.5);
}

/** House wiring: ~10 m of 1.5 sq mm per light/fan point, ~12 m of 2.5 sq mm per socket; phase + neutral. 90 m coils. */
export function wireCoils({ lightPoints = 0, socketPoints = 0 }) {
  return {
    light: Math.ceil((lightPoints * 10 * 2) / 90),
    power: Math.ceil((socketPoints * 12 * 2) / 90),
    earth: Math.ceil(((lightPoints * 10 + socketPoints * 12) * 0.6) / 90),
  };
}
