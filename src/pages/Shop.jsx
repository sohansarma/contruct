import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { AddControl, BackHeader, Empty, Icon, LocationSheet, ProductArt, ProductCard, Stepper } from '../components/ui.jsx';
import { money, pct } from '../lib/format.js';
import { brand, coupons, rules } from '../config.js';
import { share } from '../lib/native.js';
import { searchProducts } from '../lib/search.js';

const usps = [
  ['Timer', `Delivered in ${rules.etaMin}–${rules.etaMax} min`],
  ['BadgeCheck', 'Genuine brands only'],
  ['ReceiptIndianRupee', 'GST invoice on every order'],
  ['RotateCcw', `${rules.returnWindowHours}h easy returns`],
];

export function Home() {
  const { categories, products, location } = useStore();
  const [q, setQ] = useState('');
  const [locOpen, setLocOpen] = useState(false);
  const navigate = useNavigate();
  const best = products.filter((p) => p.tag === 'Bestseller');
  const rails = ['cement', 'painting', 'plywood', 'wires'];

  return (
    <div className="page">
      <section className="hero glass">
        <div>
        <h1>Site running short? <span className="accent">We’ll be there within the hour.</span></h1>
        <p>Cement, plywood, paint, electricals, plumbing and hardware from the brands you trust, delivered to your site anywhere in {brand.city}.</p>
        <form className="search-pill" onSubmit={(e) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(q)}`); }}>
          <Icon name="Search" size={20} className="faint" />
          <input placeholder="Search 'cement', 'FRLS wire', '18 mm ply'…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
          <button className="go" aria-label="Search"><Icon name="ArrowRight" size={18} /></button>
        </form>
        {!location && (
          <button className="chip" style={{ marginTop: 14 }} onClick={() => setLocOpen(true)}>
            <Icon name="MapPin" size={15} /> Check delivery to your site
          </button>
        )}
        {location && !location.serviceable && (
          <div className="banner warn small" style={{ marginTop: 14, maxWidth: 640 }}>
            <Icon name="TriangleAlert" size={18} />
            <span className="grow">We don’t deliver to {location.pincode} yet. You can still browse or <Link className="link" to="/bulk">request a bulk quote</Link>.</span>
          </div>
        )}
        {location?.serviceable && (
          <div className="banner ok small" style={{ marginTop: 14, maxWidth: 640 }}>
            <Icon name="Zap" size={18} className="green" />
            <span>Express delivery available at {location.pincode}: about {rules.etaMin} minutes.</span>
          </div>
        )}
        </div>
        <div className="hero-art" aria-hidden="true">
          {categories.slice(0, 9).map((c) => (
            <div key={c.id} className="glass" style={{ color: c.tint, background: `linear-gradient(145deg, ${c.tint}30, ${c.tint}0c)` }}><Icon name={c.icon} size={36} /></div>
          ))}
        </div>
      </section>

      <div className="usp">
        {usps.map(([icon, text]) => (
          <div key={text} className="glass"><Icon name={icon} />{text}</div>
        ))}
      </div>

      <section className="section">
        <div className="section-head"><h2>Shop by category</h2><Link to="/categories">See all</Link></div>
        <CategoryGrid categories={categories.slice(0, 12)} />
      </section>

      <section className="section">
        <div className="section-head"><h2>Offers</h2></div>
        <div className="offers">
          {coupons.map((c, i) => (
            <div key={c.code} className="offer" style={{ background: ['linear-gradient(135deg,#ff4f1f,#ff385c)', 'linear-gradient(135deg,#5e5ce6,#0a84ff)', 'linear-gradient(135deg,#1f9d55,#30d158)'][i % 3] }}>
              <h3>{c.title}</h3>
              <div className="row between"><code>{c.code}</code><span className="xs" style={{ opacity: .85 }}>Apply in cart</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Bestsellers</h2></div>
        <div className="p-rail">{best.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      </section>

      {rails.map((cid) => {
        const c = categories.find((x) => x.id === cid);
        if (!c) return null;
        return (
          <section className="section" key={cid}>
            <div className="section-head"><h2>{c.name}</h2><Link to={`/c/${cid}`}>See all</Link></div>
            <div className="p-rail">{products.filter((p) => p.categoryId === cid).map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>
        );
      })}

      <section className="section">
        <div className="glass card" style={{ padding: 22, display: 'grid', gap: 14 }}>
          <div className="row"><Icon name="Truck" size={28} className="accent" /><h2>Buying for a big project?</h2></div>
          <p className="muted">Share your material list and we’ll call back with a quote, usually within the hour. Scheduled truck deliveries available.</p>
          <div><Link className="btn dark" to="/bulk">Get a bulk quote</Link></div>
        </div>
      </section>
      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </div>
  );
}

export function CategoryGrid({ categories }) {
  return (
    <div className="cat-grid">
      {categories.map((c) => (
        <Link key={c.id} to={`/c/${c.id}`} className="cat">
          <div className="tile glass" style={{ color: c.tint, background: `linear-gradient(145deg, ${c.tint}26, ${c.tint}0a)` }}>
            <Icon name={c.icon} size={34} />
          </div>
          {c.name}
        </Link>
      ))}
    </div>
  );
}

export function Categories() {
  const { categories } = useStore();
  return (
    <div className="page">
      <h1 style={{ marginBottom: 6 }}>All categories</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Everything for structure, finishing and fit-out.</p>
      <div className="col" style={{ gap: 10 }}>
        {categories.map((c) => (
          <Link key={c.id} to={`/c/${c.id}`} className="glass card row" style={{ padding: 12 }}>
            <div className="tile" style={{ width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', color: c.tint, background: `${c.tint}1f` }}>
              <Icon name={c.icon} size={26} />
            </div>
            <div className="grow">
              <h3>{c.name}</h3>
              <div className="small muted ellipsis">{c.blurb}</div>
            </div>
            <Icon name="ChevronRight" className="faint" />
          </Link>
        ))}
      </div>
    </div>
  );
}

const SORTS = [
  ['relevance', 'Popular'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['discount', 'Biggest discount'],
];

function sortList(list, sort) {
  const s = [...list];
  if (sort === 'price-asc') s.sort((a, b) => a.variants[0].price - b.variants[0].price);
  if (sort === 'price-desc') s.sort((a, b) => b.variants[0].price - a.variants[0].price);
  if (sort === 'discount') s.sort((a, b) => pct(b.variants[0].price, b.variants[0].mrp) - pct(a.variants[0].price, a.variants[0].mrp));
  if (sort === 'relevance') s.sort((a, b) => (b.tag ? 1 : 0) - (a.tag ? 1 : 0));
  return s;
}

function FilterBar({ list, brandSel, setBrandSel, sort, setSort }) {
  const brands = [...new Set(list.map((p) => p.brand))].sort();
  return (
    <div className="toolbar">
      <label className="chip" style={{ paddingRight: 8 }}>
        <Icon name="ArrowUpDown" size={14} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ border: 0, background: 'transparent', outline: 0 }} aria-label="Sort">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      {brands.length > 1 && brands.map((b) => (
        <button key={b} className={`chip ${brandSel.includes(b) ? 'on' : ''}`} onClick={() => setBrandSel((s) => (s.includes(b) ? s.filter((x) => x !== b) : [...s, b]))}>
          {b}
        </button>
      ))}
      {brandSel.length > 0 && <button className="chip" onClick={() => setBrandSel([])}><Icon name="X" size={14} />Clear</button>}
    </div>
  );
}

export function Category() {
  const { id } = useParams();
  const { categories, products } = useStore();
  const cat = categories.find((c) => c.id === id);
  const [brandSel, setBrandSel] = useState([]);
  const [sort, setSort] = useState('relevance');
  useEffect(() => { setBrandSel([]); window.scrollTo(0, 0); }, [id]);
  const all = products.filter((p) => p.categoryId === id);
  const list = sortList(all.filter((p) => !brandSel.length || brandSel.includes(p.brand)), sort);
  if (!cat) return <NotFound />;
  return (
    <div className="page">
      <div className="layout-side">
        <aside className="side-cats glass">
          {categories.map((c) => <Link key={c.id} to={`/c/${c.id}`} className={c.id === id ? 'on' : ''}>{c.name}</Link>)}
        </aside>
        <div>
          <BackHeader title={cat.name} right={<Link to={`/price-list/${cat.id}`} className="chip"><Icon name="ListOrdered" size={14} />Price list</Link>} />
          <p className="muted small" style={{ marginTop: -8, marginBottom: 12 }}>{cat.blurb} · {all.length} products</p>
          <FilterBar list={all} brandSel={brandSel} setBrandSel={setBrandSel} sort={sort} setSort={setSort} />
          {list.length ? <div className="p-grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <Empty icon="SearchX" title="Nothing matches" text="Try removing a filter." />}
        </div>
      </div>
    </div>
  );
}

export function Product() {
  const { id } = useParams();
  const { productMap, products, qtyOf, setQty, categories, location, notify } = useStore();
  const p = productMap[id];
  const [vid, setVid] = useState(null);
  useEffect(() => { setVid(null); window.scrollTo(0, 0); }, [id]);
  if (!p) return <NotFound />;
  const v = p.variants.find((x) => x.id === vid) || p.variants[0];
  const qty = qtyOf(p.id, v.id);
  const off = pct(v.price, v.mrp);
  const cat = categories.find((c) => c.id === p.categoryId);
  const similar = products.filter((x) => x.categoryId === p.categoryId && x.id !== p.id).slice(0, 8);

  return (
    <div className="page">
      <BackHeader title="" right={
        <button className="icon-btn" aria-label="Share" onClick={async () => { const r = await share({ title: p.name, text: `${p.name} on ${brand.name}`, url: window.location.href }); if (r?.copied) notify('Link copied'); }}>
          <Icon name="Share" size={18} />
        </button>
      } />
      <div className="pdp">
        <ProductArt product={p} size={120} />
        <div className="col" style={{ gap: 16 }}>
          <div>
            <Link to={`/c/${p.categoryId}`} className="small accent">{cat?.name}</Link>
            <div className="small muted" style={{ marginTop: 6 }}>{p.brand}</div>
            <h1 style={{ fontSize: 28, marginTop: 2 }}>{p.name}</h1>
            <div className="muted" style={{ marginTop: 4 }}>{v.label}</div>
          </div>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="price" style={{ fontSize: 28 }}>{money(v.price)}</span>
            {v.mrp > v.price && <><span className="strike">MRP {money(v.mrp)}</span><span className="green small" style={{ fontWeight: 600 }}>{off}% off</span></>}
          </div>
          <div className="xs muted" style={{ marginTop: -10 }}>Inclusive of all taxes</div>

          {p.variants.length > 1 && (
            <div className="col">
              <div className="small" style={{ fontWeight: 600 }}>Choose option</div>
              <div className="variant-row">
                {p.variants.map((x) => (
                  <button key={x.id} className={`variant ${x.id === v.id ? 'on' : ''}`} onClick={() => setVid(x.id)}>
                    <div style={{ fontWeight: 600 }}>{x.label}</div>
                    <div className="small muted">{money(x.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="row">
            {qty > 0 ? (
              <>
                <Stepper large qty={qty} onChange={(n) => setQty(p.id, v.id, n)} />
                <Link to="/cart" className="btn dark grow">Go to cart · {money(v.price * qty)}</Link>
              </>
            ) : (
              <div className="grow"><AddControl large product={p} variant={v} /></div>
            )}
          </div>

          <div className="glass card list">
            <div><span className="ico"><Icon name="Zap" size={18} className="accent" /></span><span className="grow small">{location?.serviceable ? `Arrives in ${rules.etaMin}–${rules.etaMax} min at ${location.pincode}` : `Express delivery across ${brand.city}`}</span></div>
            <div><span className="ico"><Icon name={p.returnable ? 'RotateCcw' : 'Ban'} size={18} /></span><span className="grow small">{p.returnable ? `Returnable within ${rules.returnWindowHours} hours if damaged, defective or wrong` : 'Non-returnable item'}</span></div>
            {p.heavy && <div><span className="ico"><Icon name="Weight" size={18} /></span><span className="grow small">Heavy item: unloaded at your gate (₹{rules.heavyItemFee}/unit)</span></div>}
            <div><span className="ico"><Icon name="ShieldCheck" size={18} /></span><span className="grow small">100% genuine, sourced from authorised distributors</span></div>
          </div>

          {Object.keys(p.specs).length > 0 && (
            <div>
              <h3 style={{ marginBottom: 10 }}>Details</h3>
              <dl className="specs">
                <dt>Brand</dt><dd>{p.brand}</dd>
                {Object.entries(p.specs).map(([k, val]) => <FragmentRow key={k} k={k} v={val} />)}
              </dl>
            </div>
          )}
        </div>
      </div>
      {similar.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>You may also need</h2></div>
          <div className="p-rail">{similar.map((x) => <ProductCard key={x.id} product={x} />)}</div>
        </section>
      )}
    </div>
  );
}
const FragmentRow = ({ k, v }) => (<><dt>{k}</dt><dd>{v}</dd></>);

export function Search() {
  const [params, setParams] = useSearchParams();
  const { products, categories, recent, pushRecent, setRecent } = useStore();
  const [q, setQ] = useState(params.get('q') || '');
  const [sort, setSort] = useState('relevance');
  const [brandSel, setBrandSel] = useState([]);
  const term = params.get('q') || '';
  const results = useMemo(() => searchProducts(products, categories, term), [products, categories, term]);
  const list = sort === 'relevance' ? results.filter((p) => !brandSel.length || brandSel.includes(p.brand)) : sortList(results.filter((p) => !brandSel.length || brandSel.includes(p.brand)), sort);
  const live = useMemo(() => (q && q !== term ? searchProducts(products, categories, q).slice(0, 6) : []), [q, term, products, categories]);

  useEffect(() => { if (term) pushRecent(term); }, [term, pushRecent]);
  const submit = (val) => { setQ(val); setParams(val ? { q: val } : {}); };

  return (
    <div className="page">
      <form className="search-pill" onSubmit={(e) => { e.preventDefault(); submit(q.trim()); }} style={{ marginBottom: 16 }}>
        <Icon name="Search" size={20} className="faint" />
        <input autoFocus placeholder="Search products, brands, categories" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        {q && <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => submit('')} aria-label="Clear"><Icon name="X" size={16} /></button>}
      </form>

      {live.length > 0 && (
        <div className="glass card list" style={{ marginBottom: 16 }}>
          {live.map((p) => (
            <Link key={p.id} to={`/p/${p.id}`}><span className="ico"><Icon name="Search" size={16} /></span><span className="grow ellipsis">{p.name}</span><span className="small muted">{p.brand}</span></Link>
          ))}
        </div>
      )}

      {!term ? (
        <>
          {recent.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <div className="section-head"><h3>Recent searches</h3><button className="small accent" onClick={() => setRecent([])}>Clear</button></div>
              <div className="chips wrap" style={{ flexWrap: 'wrap' }}>{recent.map((r) => <button key={r} className="chip" onClick={() => submit(r)}><Icon name="History" size={14} />{r}</button>)}</div>
            </section>
          )}
          <section>
            <div className="section-head"><h3>Popular</h3></div>
            <div className="chips" style={{ flexWrap: 'wrap' }}>
              {['cement', 'plywood 18mm', 'wire 1.5', 'putty', 'tile adhesive', 'fevicol', 'cpvc', 'mcb', 'led bulb', 'hinge'].map((r) => <button key={r} className="chip" onClick={() => submit(r)}><Icon name="TrendingUp" size={14} />{r}</button>)}
            </div>
          </section>
          <section className="section"><div className="section-head"><h3>Browse categories</h3></div><CategoryGrid categories={categories} /></section>
        </>
      ) : (
        <>
          <div className="small muted" style={{ marginBottom: 8 }}>{results.length} result{results.length === 1 ? '' : 's'} for “{term}”</div>
          {results.length > 0 && <FilterBar list={results} brandSel={brandSel} setBrandSel={setBrandSel} sort={sort} setSort={setSort} />}
          {list.length ? <div className="p-grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div> : (
            <Empty icon="SearchX" title="No matches" text="Try a simpler term, or ask us for it: we can source most materials." action={<Link className="btn outline" to="/bulk">Request an item</Link>} />
          )}
        </>
      )}
    </div>
  );
}

export function NotFound() {
  return (
    <div className="page">
      <Empty icon="Construction" title="Page not found" text="This page may have moved." action={<Link className="btn primary" to="/">Go home</Link>} />
    </div>
  );
}
