import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Icons from './icons.js';
import { useStore } from '../lib/store.jsx';
import { money, pct } from '../lib/format.js';
import { unitPrice } from '../lib/pricing.js';
import { brand, rules } from '../config.js';
import { categoryById } from '../data/catalog.js';
import ProductIllustration from './ProductArt.jsx';
import { currentPosition, pincodeFromPosition } from '../lib/native.js';
import { imageUrl, mode } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';

export function Icon({ name, size = 20, ...rest }) {
  const C = Icons[name] || Icons.Box;
  return <C size={size} strokeWidth={1.8} {...rest} />;
}

export function ProductArt({ product, variant, showBadges = true, imageIndex = 0 }) {
  const cat = categoryById(product.categoryId);
  const v = variant || product.variants[0];
  const off = pct(v.price, v.mrp);
  const label = product.variants.length > 1 && !variant ? '' : shortPack(v.label || product.unit);
  return (
    <div className={`art ${product.inStock ? '' : 'out'}`} style={{ '--tint': cat?.tint || '#8e8e93' }}>
      {product.images?.length || product.image ? (
        <img src={imageUrl(product.images?.[imageIndex] || product.images?.[0] || product.image)} alt={product.name} loading="lazy" />
      ) : (
        <ProductIllustration kind={product.kind} color={product.color} label={label} />
      )}
      {showBadges && (product.deal ? <span className="tag deal">Deal</span> : product.tag ? <span className="tag">{product.tag}</span> : product.isNew ? <span className="tag">New</span> : null)}
      {showBadges && off >= 5 && <span className="off">{off}% off</span>}
    </div>
  );
}

// "50 kg bag" -> "50 kg", "8' × 4' sheet" -> "8' × 4'"
const shortPack = (s = '') => s.replace(/\b(bag|sheet|coil|length|each)\b/gi, '').trim().slice(0, 12);

export function Stepper({ qty, onChange, large }) {
  return (
    <div className={`stepper ${large ? 'lg' : ''}`}>
      <button aria-label="Decrease" onClick={() => onChange(qty - 1)}><Icon name="Minus" size={16} /></button>
      <span aria-live="polite">{qty}</span>
      <button aria-label="Increase" onClick={() => onChange(qty + 1)}><Icon name="Plus" size={16} /></button>
    </div>
  );
}

/** Add button / stepper for one size of a product. */
export function AddControl({ product, variant, large }) {
  const { qtyOf, setQty } = useStore();
  const { t } = useI18n();
  const v = variant || product.variants[0];
  const qty = qtyOf(product.id, v.id);
  if (!product.inStock) return <span className="small faint" style={{ fontWeight: 600 }}>{t('Out of stock')}</span>;
  if (qty > 0) return <Stepper qty={qty} large={large} onChange={(n) => setQty(product.id, v.id, n)} />;
  return (
    <button className={large ? 'btn primary block' : 'add-btn'} aria-label={large ? undefined : `Add ${product.name}${product.variants.length > 1 ? ` ${v.label}` : ''}`} onClick={() => setQty(product.id, v.id, 1)}>
      {t(large ? 'Add to cart' : 'Add')}
    </button>
  );
}

/** Pick sizes without leaving the list: every size with its price and its own stepper. */
export function VariantSheet({ product, open, onClose }) {
  const { qtyOf } = useStore();
  return (
    <Sheet open={open} onClose={onClose} title={product.name}>
      <div className="small muted" style={{ marginTop: -8, marginBottom: 4 }}>{product.brand} · choose a size</div>
      {product.variants.map((v) => {
        const qty = qtyOf(product.id, v.id);
        const tier = v.tiers?.[v.tiers.length - 1];
        return (
          <div className="vrow" key={v.id}>
            <div className="grow">
              <div style={{ fontWeight: 700 }}>{v.label}</div>
              <div className="row" style={{ gap: 6 }}>
                <span className="price">{money(unitPrice(v, Math.max(qty, 1)))}</span>
                {v.mrp > v.price && <span className="xs strike">{money(v.mrp)}</span>}
              </div>
              {tier && <div className="bulk-hint" style={{ display: 'inline-block', marginTop: 4 }}>{money(tier.price)} each on {tier.min}+</div>}
            </div>
            <AddControl product={product} variant={v} />
          </div>
        );
      })}
      <div className="row" style={{ marginTop: 12 }}>
        <Link className="btn outline grow" to={`/p/${product.id}`} onClick={onClose}>Details</Link>
        <button className="btn primary grow" onClick={onClose}>Done</button>
      </div>
    </Sheet>
  );
}

export function ProductCard({ product }) {
  const { qtyOf } = useStore();
  const { t } = useI18n();
  const [pick, setPick] = useState(false);
  const v = product.variants[0];
  const many = product.variants.length > 1;
  const inCart = many ? product.variants.reduce((n, x) => n + qtyOf(product.id, x.id), 0) : 0;
  const tier = v.tiers?.[v.tiers.length - 1];
  return (
    <div className="pcard">
      <Link to={`/p/${product.id}`} className="pcard-link">
        <ProductArt product={product} />
        <div className="meta">{product.brand}</div>
        <div className="name clamp2">{product.name}</div>
        <div className="meta">{many ? `${product.variants.length} sizes` : product.unit}</div>
        {tier && <div className="bulk-hint">{money(tier.price)} each on {tier.min}+</div>}
      </Link>
      <div className="foot">
        <div>
          <div className="price">{many && <span className="xs muted" style={{ fontWeight: 600 }}>from </span>}{money(v.price)}</div>
          {v.mrp > v.price && <div className="xs strike">{money(v.mrp)}</div>}
        </div>
        {!many ? <AddControl product={product} /> : !product.inStock ? <span className="small faint" style={{ fontWeight: 600 }}>{t('Out of stock')}</span> : (
          <button className={`add-btn ${inCart ? 'has' : ''}`} aria-label={`Choose size: ${product.name}`} onClick={() => setPick(true)}>
            {inCart ? `${inCart} in cart` : t('Add')}<Icon name="ChevronDown" size={13} />
          </button>
        )}
      </div>
      {many && <VariantSheet product={product} open={pick} onClose={() => setPick(false)} />}
    </div>
  );
}

/** Placeholder cards while the catalogue loads. */
export function SkeletonGrid({ n = 6, rail }) {
  return (
    <div className={rail ? 'p-rail' : 'p-grid'} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div className="pcard" key={i}>
          <div className="skel" style={{ aspectRatio: '1' }} />
          <div className="skel" style={{ height: 12, width: '50%' }} />
          <div className="skel" style={{ height: 14 }} />
          <div className="skel" style={{ height: 30, width: '70%' }} />
        </div>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        {title && (
          <div className="row between" style={{ marginBottom: 14 }}>
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" size={18} /></button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}

export function Empty({ icon = 'Inbox', title, text, action }) {
  return (
    <div className="empty">
      <div className="ico"><Icon name={icon} size={32} /></div>
      <h3>{title}</h3>
      {text && <p className="muted" style={{ maxWidth: 340 }}>{text}</p>}
      {action}
    </div>
  );
}

export function LocationSheet({ open, onClose }) {
  const { location, setLocation } = useStore();
  const [pin, setPin] = useState(location?.pincode || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { t } = useI18n();
  useEffect(() => { if (open) { setPin(location?.pincode || ''); setErr(''); } }, [open, location]);

  const save = (p, area = '') => {
    if (!/^\d{6}$/.test(p)) return setErr('Enter a 6-digit pincode.');
    setLocation({ pincode: p, area });
    onClose();
  };
  const detect = async () => {
    setBusy(true); setErr('');
    try {
      const pos = await currentPosition();
      const r = await pincodeFromPosition(pos);
      if (!r.pincode) throw new Error();
      setPin(r.pincode);
      save(r.pincode, r.area);
    } catch {
      setErr('Couldn’t detect your location. Enter your pincode instead.');
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Delivery location')}>
      <div className="col" style={{ gap: 14 }}>
        <button className="radio" onClick={detect} disabled={busy}>
          <span className="ico" style={{ color: 'var(--accent)' }}><Icon name="LocateFixed" /></span>
          <span className="grow">
            <strong>{busy ? 'Detecting…' : t('Use current location')}</strong>
            <div className="small muted">{t('Fastest way to check delivery')}</div>
          </span>
        </button>
        <div className="row faint small" style={{ justifyContent: 'center' }}>{t('or')}</div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); save(pin.trim()); }}>
          <input className="input" inputMode="numeric" maxLength={6} placeholder="Site pincode e.g. 560102" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} autoFocus />
          <button className="btn dark" type="submit">{t('Check')}</button>
        </form>
        {err && <div className="small red">{err}</div>}
        <p className="small muted">We deliver across {brand.city} in {rules.etaMin}–{rules.etaMax} minutes, 7 AM to 10 PM.</p>
      </div>
    </Sheet>
  );
}

/** Pages that focus on one job hide the search row to save space. */
const COMPACT = /^\/(cart|checkout|login|orders|account|admin|bulk|help|policy|about)(\/|$)/;
/** Pages with their own pinned bottom button (no tab bar, no cart bar). */
const OWN_ACTION = /^\/(p\/|cart$|checkout$)/;

function HeaderSearch() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { pushRecent } = useStore();
  const { t, lang } = useI18n();
  const onSearch = pathname === '/search';
  const term = onSearch ? params.get('q') || '' : '';
  const [q, setQ] = useState(term);
  useEffect(() => { setQ(term); }, [term]);
  const change = (v) => {
    setQ(v);
    if (onSearch) setParams(v ? { q: v } : {}, { replace: true });
    else navigate(`/search${v ? `?q=${encodeURIComponent(v)}` : ''}`);
  };
  return (
    <form className="searchbar" role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) pushRecent(q.trim()); e.currentTarget.querySelector('input').blur(); }}>
      <Icon name="Search" size={18} className="faint" />
      <input
        type="search" enterKeyHint="search" autoComplete="off" aria-label="Search products"
        placeholder={lang === 'en' ? 'Search cement, wires, plywood…' : t('search.placeholder')}
        value={q} onChange={(e) => change(e.target.value)}
        onFocus={() => { if (!onSearch) navigate('/search'); }}
      />
      {q && <button type="button" aria-label="Clear search" onClick={() => change('')}><Icon name="X" size={16} /></button>}
    </form>
  );
}

export function Header() {
  const { location, cartCount, user } = useStore();
  const { pathname } = useLocation();
  const [locOpen, setLocOpen] = useState(false);
  const { t } = useI18n();
  const nav = [
    ['/categories', 'Categories', 'LayoutGrid'],
    ['/orders', 'Orders', 'Package'],
    ['/account', user ? 'Account' : 'Sign in', 'CircleUser'],
  ];
  return (
    <>
      <header className={`topbar no-print ${COMPACT.test(pathname) ? 'compact' : ''}`}>
        <div className="topbar-inner">
          <Link to="/" className="logo" aria-label={`${brand.name} home`}>
            <img src="/logo-mark.svg" alt="" />
            <span className="desk-only">{brand.name}</span>
          </Link>
          <button className="loc-btn" onClick={() => setLocOpen(true)}>
            <span className="eta">
              {location?.serviceable ? <><Icon name="Zap" size={16} />{rules.etaMin}–{rules.etaMax} min</> : t(location ? 'Not serviceable' : 'Set location')}
              <Icon name="ChevronDown" size={16} />
            </span>
            <span className="addr ellipsis">
              {location ? `${t('Delivering to')} ${location.area ? location.area + ', ' : ''}${location.pincode}` : `${t('Delivering across')} ${brand.city}`}
            </span>
          </button>
          <HeaderSearch />
          <nav className="nav-links" aria-label="Main">
            {nav.map(([to, label, icon]) => (
              <NavLink key={to} to={to}><Icon name={icon} size={18} />{t(label)}</NavLink>
            ))}
          </nav>
          <Link to="/cart" className="icon-btn" aria-label={`Cart, ${cartCount} items`}>
            <Icon name="ShoppingCart" size={19} />
            {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </Link>
        </div>
      </header>
      {mode === 'demo' && <DemoRibbon />}
      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </>
  );
}

function DemoRibbon() {
  const [hide, setHide] = useState(() => sessionStorage.getItem('br:ribbon') === '1');
  if (hide) return null;
  return (
    <div className="page no-print" style={{ paddingBottom: 0 }}>
      <div className="banner info small">
        <Icon name="FlaskConical" size={18} />
        <span className="grow">Demo mode: orders stay on this device and the login code is <b>123456</b>.</span>
        <button aria-label="Dismiss" onClick={() => { sessionStorage.setItem('br:ribbon', '1'); setHide(true); }}><Icon name="X" size={16} /></button>
      </div>
    </div>
  );
}

export function TabBar() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  if (OWN_ACTION.test(pathname)) return null;
  const tabs = [
    ['/', 'Home', 'House'],
    ['/categories', 'Categories', 'LayoutGrid'],
    ['/orders', 'Orders', 'Package'],
    ['/account', 'Account', 'CircleUser'],
  ];
  return (
    <nav className="tabbar no-print" aria-label="Primary">
      {tabs.map(([to, label, icon]) => (
        <NavLink key={to} to={to} end={to === '/'}>
          <Icon name={icon} size={22} />
          {t(label)}
        </NavLink>
      ))}
    </nav>
  );
}

export function CartBar() {
  const { lines, cartCount } = useStore();
  const { pathname } = useLocation();
  const { t } = useI18n();
  if (!cartCount || OWN_ACTION.test(pathname) || pathname.startsWith('/orders') || pathname.startsWith('/admin') || pathname === '/login') return null;
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  return (
    <Link to="/cart" className="cartbar no-print">
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800 }}>{cartCount} item{cartCount > 1 ? 's' : ''} · {money(total)}</div>
        <div className="xs ellipsis" style={{ opacity: 0.8 }}>{total >= rules.freeDeliveryAbove ? 'Free delivery unlocked' : `Add ${money(rules.freeDeliveryAbove - total)} for free delivery`}</div>
      </div>
      <span className="go">{t('View cart')} <Icon name="ChevronRight" size={18} /></span>
    </Link>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return <div className="toast" role="status" key={toast.id}>{toast.msg}</div>;
}

export function Footer() {
  return (
    <footer className="footer no-print">
      <div>
        <div className="logo" style={{ marginBottom: 8 }}><img src="/icon.svg" alt="" width="26" />{brand.name}</div>
        <p className="muted small">{brand.tagline}</p>
      </div>
      <div>
        <h4>Shop</h4>
        <Link to="/categories">All categories</Link>
        <Link to="/price-list">Price list</Link>
        <Link to="/bulk">Bulk quote</Link>
        <Link to="/calculator">Material calculator</Link>
      </div>
      <div>
        <h4>Help</h4>
        <Link to="/help">FAQs</Link>
        <Link to="/policy/shipping">Delivery</Link>
        <Link to="/policy/refund">Returns & refunds</Link>
        <a href={`tel:${brand.supportPhone}`}>Call support</a>
      </div>
      <div>
        <h4>Company</h4>
        <Link to="/about">About</Link>
        <Link to="/policy/terms">Terms</Link>
        <Link to="/policy/privacy">Privacy</Link>
      </div>
    </footer>
  );
}

export function BackHeader({ title, right }) {
  const navigate = useNavigate();
  return (
    <div className="row" style={{ marginBottom: 16 }}>
      <button className="icon-btn" aria-label="Back" style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }} onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
        <Icon name="ChevronLeft" size={20} />
      </button>
      <h2 className="grow ellipsis">{title}</h2>
      {right}
    </div>
  );
}

export function RequireAuth({ children }) {
  const { user, ready } = useStore();
  const { pathname } = useLocation();
  if (!ready) return null;
  if (!user) {
    return (
      <div className="page">
        <Empty icon="LogIn" title="Sign in to continue" text="Use your mobile number. It takes ten seconds and no password." action={<Link className="btn primary" to={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>} />
      </div>
    );
  }
  return children;
}
