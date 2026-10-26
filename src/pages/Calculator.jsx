import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { BackHeader, Icon } from '../components/ui.jsx';
import ProductIllustration from '../components/ProductArt.jsx';
import { money } from '../lib/format.js';
import { unitPrice } from '../lib/pricing.js';
import { SQFT_PER_M2, packsFor, paintLitres, plasterCementBags, puttyBags, tileAdhesiveBags, wireCoils } from '../lib/calc.js';
import { useI18n } from '../lib/i18n.jsx';

const TOOLS = [
  ['plaster', 'Plastering cement', 'Package'],
  ['putty', 'Wall putty', 'PaintRoller'],
  ['paint', 'Paint', 'Paintbrush'],
  ['tiles', 'Tile adhesive', 'Grid3x3'],
  ['wires', 'House wiring', 'Cable'],
];

export default function Calculator() {
  const { productMap, setQty, notify, qtyOf } = useStore();
  const { t } = useI18n();
  const [tool, setTool] = useState('plaster');
  const [unit, setUnit] = useState('sqft');
  const [area, setArea] = useState(1000);
  const [thick, setThick] = useState(12);
  const [coats, setCoats] = useState(2);
  const [lights, setLights] = useState(20);
  const [sockets, setSockets] = useState(12);
  const m2 = unit === 'sqft' ? area / SQFT_PER_M2 : area;

  // [productId, variantIndex, qty, note]
  const lines = useMemo(() => {
    if (!(m2 > 0) && tool !== 'wires') return [];
    if (tool === 'plaster') return [['ultratech-ppc', 0, plasterCementBags(m2, { thicknessMm: thick }), `1:4 mix, ${thick} mm`]];
    if (tool === 'putty') return [['ap-trucare-putty-40', 0, puttyBags(m2, 40), '2 coats']];
    if (tool === 'paint') {
      const l = paintLitres(m2, coats);
      const packs = packsFor(l, [20, 10, 4, 1]);
      const idx = { 1: 0, 4: 1, 10: 2, 20: 3 };
      return [
        ['ap-interior-primer', 1, Math.ceil(l / 2 / 4), '1 coat primer'],
        ...Object.entries(packs).map(([size, n]) => ['ap-tractor-emulsion', idx[size], n, `${l} L total, ${coats} coats`]),
      ];
    }
    if (tool === 'tiles') return [['roff-tile-adhesive', 0, tileAdhesiveBags(m2), '~4.5 m² per bag'], ['tile-spacer-2mm', 0, Math.max(1, Math.ceil(m2 / 20)), '']];
    const w = wireCoils({ lightPoints: lights, socketPoints: sockets });
    return [
      ['polycab-maxima-1-5', 0, w.light, 'Lights & fans'],
      ['polycab-maxima-2-5', 0, w.power, 'Sockets'],
      ['polycab-maxima-1-5', 2, w.earth, 'Earth (green)'],
    ].filter((x) => x[2] > 0);
  }, [tool, m2, thick, coats, lights, sockets]);

  const rows = lines
    .map(([id, vi, qty, note]) => {
      const p = productMap[id];
      const v = p?.variants[vi];
      return p && v ? { p, v, qty, note, price: unitPrice(v, qty) } : null;
    })
    .filter(Boolean);
  const total = rows.reduce((s, r) => s + r.price * r.qty, 0);

  const addAll = () => {
    rows.forEach((r) => setQty(r.p.id, r.v.id, qtyOf(r.p.id, r.v.id) + r.qty));
    notify(`${rows.length} item${rows.length > 1 ? 's' : ''} added to cart`);
  };

  const num = (val, set, props = {}) => (
    <input className="input" type="number" inputMode="decimal" min="0" value={val} onChange={(e) => set(Math.max(0, Number(e.target.value)))} {...props} />
  );

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <BackHeader title={t('Material calculator')} />
      <div className="chips" style={{ marginBottom: 16 }}>
        {TOOLS.map(([id, label, icon]) => (
          <button key={id} className={`chip ${tool === id ? 'on' : ''}`} onClick={() => setTool(id)}><Icon name={icon} size={15} />{label}</button>
        ))}
      </div>
      <div className="two-col">
        <section className="glass card col" style={{ padding: 18, gap: 14 }}>
          {tool !== 'wires' ? (
            <>
              <div className="field">
                <label>{tool === 'tiles' ? 'Floor / wall area to tile' : tool === 'plaster' ? 'Wall area to plaster' : 'Wall area to cover'}</label>
                <div className="row">
                  {num(area, setArea, { 'aria-label': 'Area' })}
                  <div className="seg" style={{ minWidth: 130 }}>
                    <button className={unit === 'sqft' ? 'on' : ''} onClick={() => setUnit('sqft')}>sq ft</button>
                    <button className={unit === 'm2' ? 'on' : ''} onClick={() => setUnit('m2')}>m²</button>
                  </div>
                </div>
                <div className="xs muted">Tip: wall area ≈ room perimeter × height, minus doors and windows.</div>
              </div>
              {tool === 'plaster' && (
                <div className="field"><label>Plaster thickness</label>
                  <div className="seg">{[12, 15, 20].map((x) => <button key={x} className={thick === x ? 'on' : ''} onClick={() => setThick(x)}>{x} mm</button>)}</div>
                </div>
              )}
              {tool === 'paint' && (
                <div className="field"><label>Coats</label>
                  <div className="seg">{[1, 2, 3].map((x) => <button key={x} className={coats === x ? 'on' : ''} onClick={() => setCoats(x)}>{x}</button>)}</div>
                </div>
              )}
            </>
          ) : (
            <div className="grid2">
              <div className="field"><label>Light & fan points</label>{num(lights, setLights)}</div>
              <div className="field"><label>Socket points</label>{num(sockets, setSockets)}</div>
            </div>
          )}
          <p className="xs muted">Estimates use common site thumb rules and include a small wastage allowance. Check with your engineer or contractor for structural work.</p>
        </section>

        <section className="col sticky" style={{ gap: 12 }}>
          <div className="glass card list">
            {rows.map((r, i) => (
              <Link key={i} to={`/p/${r.p.id}`}>
                <div style={{ width: 52, height: 52, flexShrink: 0, display: 'grid', placeItems: 'center' }}><ProductIllustration kind={r.p.kind} color={r.p.color} /></div>
                <div className="grow">
                  <div className="small" style={{ fontWeight: 600 }}>{r.qty} × {r.p.name}</div>
                  <div className="xs muted">{r.v.label}{r.note ? ` · ${r.note}` : ''}</div>
                </div>
                <b className="small">{money(r.price * r.qty)}</b>
              </Link>
            ))}
            {!rows.length && <div className="small muted">Enter an area to see what you need.</div>}
          </div>
          {rows.length > 0 && (
            <button className="btn primary block" onClick={addAll}>Add all to cart · {money(total)}</button>
          )}
        </section>
      </div>
    </div>
  );
}
