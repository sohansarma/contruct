import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { AddControl, BackHeader, Empty, Icon, LocationSheet, ProductArt, ProductCard, SkeletonGrid, Stepper } from '../components/ui.jsx';
import { money, pct } from '../lib/format.js';
import { banners, brand, coupons, rules } from '../config.js';
import { api, imageUrl } from '../lib/api.js';
import { nextTier, offerLive, unitPrice } from '../lib/pricing.js';
import { share } from '../lib/native.js';
import { searchProducts } from '../lib/search.js';
import ProductIllustration from '../components/ProductArt.jsx';
import { useI18n } from '../lib/i18n.jsx';

function CatArt({ c, size = 34 }) {
  if (c.image) return <img src={imageUrl(c.image)} alt="" />;
  if (c.art) return <ProductIllustration kind={c.art[0]} color={c.art[1]} />;
  return <Icon name={c.icon} size={size} />;
}

function Rail({ title, to, note, items }) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {to ? <Link to={to}>{t('See all')}</Link> : note ? <span className="small muted">{note}</span> : null}
      </div>
      <div className="p-rail">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </section>
  );
}

export function Home() {
  const { ready, categories, products, productMap, location, user } = useStore();
  const [locOpen, setLocOpen] = useState(false);
  const [again, setAgain] = useState([]);
  const { t, lang } = useI18n();

  // returning customers: what they ordered before, most recent first
  useEffect(() => {
    if (!user) { setAgain([]); return; }
    api.listOrders(user).then((orders) => {
      const ids = [];
      for (const o of orders) for (const i of o.items) if (!ids.includes(i.productId)) ids.push(i.productId);
      setAgain(ids.slice(0, 12));
    }).catch(() => {});
  }, [user]);

  const lead = productMap['ultratech-ppc'] || products[0];
  const liveBanners = banners.filter((b) => offerLive(b));
  const liveCoupons = coupons.filter((c) => offerLive(c));
  const brands = useMemo(() => {
    const n = {};
    for (const p of products) if (p.brand !== 'Generic') n[p.brand] = (n[p.brand] || 0) + 1;
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([b]) => b);
  }, [products]);

  if (!ready) {
    return (
      <div className="page">
        <div className="skel" style={{ height: 148, borderRadius: 20, marginBottom: 20 }} />
        <SkeletonGrid n={4} />
      </div>
    );
  }

  return (
    <div className="page">
      {!location && (
        <button className="notice ask" onClick={() => setLocOpen(true)}>
          <Icon name="MapPin" size={18} />
          <span className="grow">{t('Check delivery to your site')}</span>
          <Icon name="ChevronRight" size={16} className="faint" />
        </button>
      )}
      {location && !location.serviceable && (
        <div className="notice warn">
          <Icon name="TriangleAlert" size={18} />
          <span className="grow">We don’t deliver to {location.pincode} yet. Browse, or <Link className="link" to="/bulk">ask for a bulk quote</Link>.</span>
        </div>
      )}

      <div className="promo-rail">
        <Link to="/categories" className="promo lead">
          <div>
            <h3>{lang === 'en' ? `Site materials in ${rules.etaMin} minutes` : t('We’ll be there within the hour.')}</h3>
            <div className="sub" style={{ marginTop: 6 }}>{lang === 'en' ? `${brand.city}’s marketplace for cement, plywood, paint, electricals and plumbing.` : t('hero.sub')}</div>
          </div>
          <span className="cta">{t('Shop now')} <Icon name="ArrowRight" size={15} /></span>
          {lead && <div className="art-bg"><ProductIllustration kind={lead.kind} color={lead.color} /></div>}
        </Link>
        {liveBanners.map((b) => (
          <Link key={b.id} to={b.link || '/'} className="promo" style={b.image ? { background: `linear-gradient(0deg,rgba(0,0,0,.6),rgba(0,0,0,.1)), url(${imageUrl(b.image)}) center/cover` } : { '--promo': b.color }}>
            <div><h3>{b.title}</h3><div className="sub" style={{ marginTop: 6 }}>{b.subtitle}</div></div>
            <span className="cta">{t('View')} <Icon name="ArrowRight" size={15} /></span>
          </Link>
        ))}
      </div>

      <Rail title={t('Buy again')} to="/orders" items={again.map((id) => productMap[id]).filter(Boolean)} />

      <section className="section">
        <div className="section-head"><h2>{t('Shop by category')}</h2><Link to="/categories">{t('See all')}</Link></div>
        <CategoryGrid categories={categories.slice(0, 12)} />
      </section>

      <Rail title={t('Deals of the week')} note={t('Lower prices on bulk')} items={products.filter((p) => p.deal)} />

      <section className="section">
        <div className="tools">
          <Link to="/calculator" className="tool">
            <span className="ico"><Icon name="Calculator" size={20} /></span>
            <div className="col" style={{ gap: 2 }}><b>{t('How much do I need?')}</b><span>{t('calc.short')}</span></div>
          </Link>
          <Link to="/bulk" className="tool">
            <span className="ico"><Icon name="Truck" size={20} /></span>
            <div className="col" style={{ gap: 2 }}><b>{t('Bulk quote')}</b><span>{t('bulk.short')}</span></div>
          </Link>
        </div>
      </section>

      <Rail title={t('Bestsellers')} items={products.filter((p) => p.tag === 'Bestseller')} />

      {liveCoupons.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>{t('Offers')}</h2></div>
          <div className="chips" style={{ margin: '0 -16px', padding: '2px 16px' }}>
            {liveCoupons.map((c) => (
              <div key={c.id || c.code} className="ticket">
                <b>{c.title}</b>
                {c.auto ? <span className="xs muted">Applied automatically</span> : <code>{c.code}</code>}
              </div>
            ))}
          </div>
        </section>
      )}

      {['cement', 'painting', 'plywood', 'wires'].map((cid) => {
        const c = categories.find((x) => x.id === cid);
        return c ? <Rail key={cid} title={c.name} to={`/c/${cid}`} items={products.filter((p) => p.categoryId === cid)} /> : null;
      })}

      <Rail title={t('New arrivals')} items={products.filter((p) => p.isNew)} />

      {brands.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>{t('Shop by brand')}</h2></div>
          <div className="brand-grid">{brands.map((b) => <Link key={b} to={`/b/${encodeURIComponent(b)}`} className="brand-tile">{b}</Link>)}</div>
        </section>
      )}

      <section className="section">
        <div className="usp">
          <div><Icon name="Timer" />{rules.etaMin}–{rules.etaMax} min delivery</div>
          <div><Icon name="BadgeCheck" />Genuine brands only</div>
          <div><Icon name="ReceiptIndianRupee" />GST invoice on every order</div>
          <div><Icon name="RotateCcw" />{rules.returnWindowHours}-hour returns</div>
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
          <div className="tile"><CatArt c={c} /></div>
          <span>{c.name}</span>
        </Link>
      ))}
    </div>
  );
}

export function Categories() {
  const { categories, products } = useStore();
  const { t } = useI18n();
  const count = (id) => products.filter((p) => p.categoryId === id).length;
  return (
    <div className="page">
      <h1 style={{ marginBottom: 14 }}>{t('All categories')}</h1>
      <div className="glass card list">
        {categories.map((c) => (
          <Link key={c.id} to={`/c/${c.id}`}>
            <div style={{ width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--bg)', overflow: 'hidden', flexShrink: 0 }}><CatArt c={c} size={24} /></div>
            <div className="grow">
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div className="small muted ellipsis">{c.blurb}</div>
            </div>
            <span className="xs faint">{count(c.id)}</span>
            <Icon name="ChevronRight" size={18} className="faint" />
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
      <label className="chip" style={{ paddingRight: 6 }}>
        <Icon name="ArrowUpDown" size={14} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ border: 0, background: 'transparent', outline: 0 }} aria-label="Sort">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      {brands.length > 1 && brands.map((b) => (
        <button key={b} className={`chip ${brandSel.includes(b) ? 'on' : ''}`} aria-pressed={brandSel.includes(b)} onClick={() => setBrandSel((s) => (s.includes(b) ? s.filter((x) => x !== b) : [...s, b]))}>
          {b}
        </button>
      ))}
      {brandSel.length > 0 && <button className="chip" onClick={() => setBrandSel([])}><Icon name="X" size={14} />Clear</button>}
    </div>
  );
}

export function Category() {
  const { id } = useParams();
  const { ready, categories, products } = useStore();
  const cat = categories.find((c) => c.id === id);
  const [brandSel, setBrandSel] = useState([]);
  const [sort, setSort] = useState('relevance');
  const rail = useRef();
  useEffect(() => { setBrandSel([]); window.scrollTo(0, 0); rail.current?.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [id]);
  useEffect(() => { if (cat) document.title = `${cat.name} price in ${brand.city} · Buy online · ${brand.name}`; }, [cat]);
  const all = products.filter((p) => p.categoryId === id);
  const list = sortList(all.filter((p) => !brandSel.length || brandSel.includes(p.brand)), sort);
  if (!ready) return <div className="page"><SkeletonGrid /></div>;
  if (!cat) return <NotFound />;
  return (
    <div className="page">
      <nav className="cat-rail" ref={rail} aria-label="Categories">
        {categories.map((c) => (
          <Link key={c.id} to={`/c/${c.id}`} replace className={c.id === id ? 'on' : ''} aria-current={c.id === id ? 'page' : undefined}>
            <span className="tile"><CatArt c={c} size={22} /></span><span>{c.name}</span>
          </Link>
        ))}
      </nav>
      <div className="layout-side">
        <aside className="side-cats glass">
          {categories.map((c) => <Link key={c.id} to={`/c/${c.id}`} className={c.id === id ? 'on' : ''}>{c.name}</Link>)}
        </aside>
        <div>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="grow">
              <h1 style={{ fontSize: 22 }}>{cat.name}</h1>
              <div className="small muted">{all.length} products · {cat.blurb}</div>
            </div>
            <Link to={`/price-list/${cat.id}`} className="chip hide-sm"><Icon name="ListOrdered" size={14} />Price list</Link>
          </div>
          <FilterBar list={all} brandSel={brandSel} setBrandSel={setBrandSel} sort={sort} setSort={setSort} />
          {list.length ? <div className="p-grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <Empty icon="SearchX" title="Nothing matches" text="Try removing a filter." />}
        </div>
      </div>
    </div>
  );
}

export function BrandPage() {
  const { name } = useParams();
  const { ready, products } = useStore();
  const list = products.filter((p) => p.brand.toLowerCase() === String(name).toLowerCase());
  useEffect(() => { document.title = `${name} products in ${brand.city} · ${brand.name}`; }, [name]);
  if (!ready) return <div className="page"><SkeletonGrid /></div>;
  return (
    <div className="page">
      <BackHeader title={list[0]?.brand || name} />
      <p className="small muted" style={{ marginTop: -8, marginBottom: 12 }}>{list.length} products · genuine, from authorised distributors</p>
      {list.length ? <div className="p-grid">{sortList(list, 'relevance').map((p) => <ProductCard key={p.id} product={p} />)}</div> : <Empty icon="SearchX" title="No products from this brand yet" action={<Link className="btn primary" to="/categories">Browse categories</Link>} />}
    </div>
  );
}

export function Product() {
  const { id } = useParams();
  const { ready, productMap, products, qtyOf, setQty, categories, location, notify } = useStore();
  const p = productMap[id];
  const [vid, setVid] = useState(null);
  const [img, setImg] = useState(0);
  const { t } = useI18n();
  useEffect(() => { setVid(null); setImg(0); window.scrollTo(0, 0); }, [id]);
  useEffect(() => {
    if (!p) return;
    document.title = `${p.name}${p.unit ? ` (${p.unit})` : ''} · ${brand.name}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', `Buy ${p.name} by ${p.brand} in ${brand.city}. Delivered in about an hour.`);
  }, [p]);
  if (!ready) return <div className="page"><div className="skel" style={{ aspectRatio: '4/3', borderRadius: 20 }} /></div>;
  if (!p) return <NotFound />;
  const v = p.variants.find((x) => x.id === vid) || p.variants[0];
  const qty = qtyOf(p.id, v.id);
  const off = pct(v.price, v.mrp);
  const cat = categories.find((c) => c.id === p.categoryId);
  const similar = products.filter((x) => x.categoryId === p.categoryId && x.id !== p.id).slice(0, 8);
  const price = unitPrice(v, Math.max(qty, 1));
  const next = nextTier(v, qty);
  const unitWord = /bag/i.test(v.label) ? 'bags' : /sheet/i.test(v.label) ? 'sheets' : 'units';

  return (
    <div className="page">
      <BackHeader title="" right={
        <button className="icon-btn" aria-label="Share" style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }} onClick={async () => { const r = await share({ title: p.name, text: `${p.name} on ${brand.name}`, url: window.location.href }); if (r?.copied) notify('Link copied'); }}>
          <Icon name="Share" size={18} />
        </button>
      } />
      <div className="pdp">
        <div className="col">
          <ProductArt product={p} variant={v} imageIndex={img} />
          {p.images?.length > 1 && (
            <div className="gallery">{p.images.map((u, i) => <button key={u} className={i === img ? 'on' : ''} onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`}><img src={imageUrl(u)} alt="" /></button>)}</div>
          )}
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div>
            <div className="row small" style={{ gap: 6, fontWeight: 600 }}>
              <Link to={`/b/${encodeURIComponent(p.brand)}`} className="accent">{p.brand}</Link>
              <span className="faint">·</span>
              <Link to={`/c/${p.categoryId}`} className="muted">{cat?.name}</Link>
            </div>
            <h1 style={{ fontSize: 24, marginTop: 4 }}>{p.name}</h1>
            <div className="muted" style={{ marginTop: 2, fontWeight: 500 }}>{v.label}</div>
          </div>
          <div>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span className="price" style={{ fontSize: 28 }}>{money(price)}</span>
              {v.mrp > v.price && <><span className="strike">MRP {money(v.mrp)}</span><span className="green small" style={{ fontWeight: 800 }}>{off}% off</span></>}
            </div>
            <div className="row" style={{ marginTop: 6, gap: 8 }}>
              <span className="eta-chip"><Icon name="Zap" size={13} />{location?.serviceable ? `${rules.etaMin}–${rules.etaMax} min to ${location.pincode}` : `${rules.etaMin}–${rules.etaMax} min delivery`}</span>
              <span className="xs muted">{t('Inclusive of all taxes')}</span>
            </div>
          </div>

          {p.variants.length > 1 && (
            <div className="col" style={{ gap: 8 }}>
              <div className="small" style={{ fontWeight: 700 }}>{t('Choose option')}</div>
              <div className="variant-row">
                {p.variants.map((x) => (
                  <button key={x.id} className={`variant ${x.id === v.id ? 'on' : ''}`} aria-pressed={x.id === v.id} onClick={() => setVid(x.id)}>
                    <div style={{ fontWeight: 700 }}>{x.label}</div>
                    <div className="small muted">{money(x.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {v.tiers?.length > 0 && (
            <div className="col" style={{ gap: 8 }}>
              <div className="small" style={{ fontWeight: 700 }}>Buy more, pay less</div>
              <div className="tiers">
                {[{ min: 1, price: v.price }, ...v.tiers].map((tier, i, arr) => {
                  const on = qty >= tier.min && (i === arr.length - 1 || qty < arr[i + 1].min);
                  return (
                    <div key={tier.min} className={on ? 'on' : ''}>
                      <div className="xs muted">{tier.min === 1 ? `1–${arr[1].min - 1}` : `${tier.min}+`} {unitWord}</div>
                      <b>{money(tier.price)}</b><span className="xs muted"> each</span>
                    </div>
                  );
                })}
              </div>
              {next && qty > 0 && <div className="small green" style={{ fontWeight: 600 }}>Add {next.more} more to pay {money(next.price)} each</div>}
            </div>
          )}

          {p.inStock && (p.heavy || v.tiers?.length > 0) && (
            <div className="qty-presets" aria-label="Quick quantity">
              <span className="small muted" style={{ fontWeight: 600 }}>Quick add</span>
              {(p.heavy ? [5, 10, 20, 30, 50] : [5, 10, 20, 50]).map((n) => (
                <button key={n} className={`chip ${qty === n ? 'on' : ''}`} aria-pressed={qty === n} onClick={() => setQty(p.id, v.id, n)}>{n}</button>
              ))}
            </div>
          )}

          <div className="actionbar">
            {qty > 0 ? (
              <>
                <Stepper large qty={qty} onChange={(n) => setQty(p.id, v.id, n)} />
                <Link to="/cart" className="btn primary grow">{t('Go to cart')} · {money(price * qty)}</Link>
              </>
            ) : (
              <>
                <div className="ab-info mob-only"><b>{money(price)}</b><span className="xs muted">{v.label}</span></div>
                <div className="grow"><AddControl large product={p} variant={v} /></div>
              </>
            )}
          </div>

          <div className="glass card list">
            <div><span className="ico"><Icon name={p.returnable ? 'RotateCcw' : 'Ban'} size={18} /></span><span className="grow small">{p.returnable ? `Returnable within ${rules.returnWindowHours} hours if damaged, defective or wrong` : 'Non-returnable item'}</span></div>
            {p.heavy && <div><span className="ico"><Icon name="Weight" size={18} /></span><span className="grow small">Heavy item: unloaded at your gate (₹{rules.heavyItemFee} per unit)</span></div>}
            <div><span className="ico"><Icon name="ShieldCheck" size={18} /></span><span className="grow small">Genuine {p.brand} stock from authorised distributors, with GST invoice</span></div>
          </div>

          {p.description && <p className="muted" style={{ whiteSpace: 'pre-line' }}>{p.description}</p>}

          <div>
            <h3 style={{ marginBottom: 10 }}>{t('Details')}</h3>
            <dl className="specs">
              <dt>Brand</dt><dd>{p.brand}</dd>
              {Object.entries(p.specs || {}).map(([k, val]) => <SpecRow key={k} k={k} v={val} />)}
              {p.hsn && <><dt>HSN</dt><dd>{p.hsn}</dd></>}
            </dl>
          </div>
        </div>
      </div>
      {similar.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>{t('You may also need')}</h2></div>
          <div className="p-rail">{similar.map((x) => <ProductCard key={x.id} product={x} />)}</div>
        </section>
      )}
    </div>
  );
}
const SpecRow = ({ k, v }) => (<><dt>{k}</dt><dd>{v}</dd></>);

const POPULAR = ['cement', 'plywood 18mm', 'wire 1.5', 'putty', 'tile adhesive', 'fevicol', 'cpvc', 'mcb', 'led bulb', 'hinge'];

export function Search() {
  const [params, setParams] = useSearchParams();
  const { ready, products, categories, recent, pushRecent, setRecent } = useStore();
  const [sort, setSort] = useState('relevance');
  const [brandSel, setBrandSel] = useState([]);
  const term = params.get('q') || '';
  const results = useMemo(() => searchProducts(products, categories, term), [products, categories, term]);
  const filtered = results.filter((p) => !brandSel.length || brandSel.includes(p.brand));
  const list = sort === 'relevance' ? filtered : sortList(filtered, sort);
  const cats = term.length >= 2 ? categories.filter((c) => c.name.toLowerCase().includes(term.toLowerCase())).slice(0, 3) : [];

  // results update as you type; remember a search once the customer pauses on it
  useEffect(() => {
    setBrandSel([]);
    if (term.trim().length < 3) return;
    const id = setTimeout(() => pushRecent(term), 1500);
    return () => clearTimeout(id);
  }, [term, pushRecent]);
  const go = (val) => setParams(val ? { q: val } : {});

  if (!ready) return <div className="page"><SkeletonGrid /></div>;
  return (
    <div className="page">
      {!term ? (
        <>
          {recent.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <div className="section-head"><h3>Recent searches</h3><button onClick={() => setRecent([])}>Clear</button></div>
              <div className="chips" style={{ flexWrap: 'wrap' }}>{recent.map((r) => <button key={r} className="chip" onClick={() => go(r)}><Icon name="History" size={14} />{r}</button>)}</div>
            </section>
          )}
          <section>
            <div className="section-head"><h3>Popular right now</h3></div>
            <div className="chips" style={{ flexWrap: 'wrap' }}>
              {POPULAR.map((r) => <button key={r} className="chip" onClick={() => go(r)}><Icon name="TrendingUp" size={14} />{r}</button>)}
            </div>
          </section>
          <section className="section"><div className="section-head"><h3>Browse categories</h3></div><CategoryGrid categories={categories} /></section>
        </>
      ) : (
        <>
          {cats.length > 0 && (
            <div className="chips" style={{ marginBottom: 10 }}>
              {cats.map((c) => <Link key={c.id} to={`/c/${c.id}`} className="chip"><Icon name="LayoutGrid" size={14} />{c.name}</Link>)}
            </div>
          )}
          <div className="small muted" style={{ marginBottom: 8 }} aria-live="polite">{results.length} result{results.length === 1 ? '' : 's'} for “{term}”</div>
          {results.length > 0 && <FilterBar list={results} brandSel={brandSel} setBrandSel={setBrandSel} sort={sort} setSort={setSort} />}
          {list.length ? <div className="p-grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div> : (
            <Empty icon="SearchX" title="No matches" text="Try a simpler word, or tell us what you need: we can source most materials." action={<Link className="btn primary" to="/bulk">Request an item</Link>} />
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
