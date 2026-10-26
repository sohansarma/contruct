import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icons from './icons.js';
import { useStore } from '../lib/store.jsx';
import { money, pct } from '../lib/format.js';
import { brand, rules } from '../config.js';
import { categoryById } from '../data/catalog.js';
import { currentPosition, pincodeFromPosition } from '../lib/native.js';
import { mode } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';

export function Icon({ name, size = 20, ...rest }) {
  const C = Icons[name] || Icons.Box;
  return <C size={size} strokeWidth={1.8} {...rest} />;
}

export function ProductArt({ product, size = 64, showBadges = true }) {
  const cat = categoryById(product.categoryId);
  const v = product.variants[0];
  const off = pct(v.price, v.mrp);
  const tint = cat?.tint || '#8e8e93';
  return (
    <div className="art" style={{ background: `linear-gradient(145deg, ${tint}22, ${tint}0d)` }}>
      {product.image ? (
        <img src={product.image} alt={product.name} loading="lazy" />
      ) : (
        <div style={{ color: tint, display: 'grid', placeItems: 'center', gap: 6 }}>
          <Icon name={cat?.icon} size={size} />
        </div>
      )}
      {showBadges && product.tag && <span className="tag">{product.tag}</span>}
      {showBadges && off >= 5 && <span className="off">{off}% off</span>}
    </div>
  );
}

export function Stepper({ qty, onChange, large }) {
  return (
    <div className={`stepper ${large ? 'lg' : ''}`} onClick={(e) => e.preventDefault()}>
      <button aria-label="Decrease" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(qty - 1); }}>
        <Icon name="Minus" size={16} />
      </button>
      <span aria-live="polite">{qty}</span>
      <button aria-label="Increase" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(qty + 1); }}>
        <Icon name="Plus" size={16} />
      </button>
    </div>
  );
}

export function AddControl({ product, variant, large }) {
  const { qtyOf, setQty } = useStore();
  const v = variant || product.variants[0];
  const qty = qtyOf(product.id, v.id);
  const navigate = useNavigate();
  const { t } = useI18n();
  if (!product.inStock) return <span className="small faint">{t('Out of stock')}</span>;
  if (qty > 0) return <Stepper qty={qty} large={large} onChange={(n) => setQty(product.id, v.id, n)} />;
  // multi-variant products open the product page from cards so customers pick a size
  const needsChoice = !variant && product.variants.length > 1;
  return (
    <button
      className={large ? 'btn primary block' : 'add-btn'}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        if (needsChoice) navigate(`/p/${product.id}`);
        else setQty(product.id, v.id, 1);
      }}
    >
      {t(large ? 'Add to cart' : needsChoice ? 'Choose' : 'Add')}
    </button>
  );
}

export function ProductCard({ product }) {
  const v = product.variants[0];
  const many = product.variants.length > 1;
  return (
    <Link to={`/p/${product.id}`} className="pcard glass">
      <ProductArt product={product} />
      <div className="meta">{product.brand}</div>
      <div className="name clamp2">{product.name}</div>
      <div className="meta">{many ? `${product.variants.length} options` : product.unit}</div>
      <div className="foot">
        <div>
          <div className="price">{many && <span className="xs muted" style={{ fontWeight: 500 }}>from </span>}{money(v.price)}</div>
          {v.mrp > v.price && <div className="xs strike">{money(v.mrp)}</div>}
        </div>
        <AddControl product={product} />
      </div>
    </Link>
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

export function Header() {
  const { location, cartCount, user } = useStore();
  const [locOpen, setLocOpen] = useState(false);
  const { t } = useI18n();
  const nav = [
    ['/', 'Home', 'House'],
    ['/categories', 'Categories', 'LayoutGrid'],
    ['/orders', 'Orders', 'Package'],
    ['/account', user ? 'Account' : 'Sign in', 'CircleUser'],
  ];
  return (
    <>
      <header className="topbar glass">
        <div className="topbar-inner">
          <Link to="/" className="logo" aria-label={brand.name}>
            <img src="/icon.svg" alt="" />
            <span className="hide-sm">{brand.name}</span>
          </Link>
          <button className="loc-btn grow" onClick={() => setLocOpen(true)}>
            <span className="eta">
              {location?.serviceable ? `${rules.etaMin}–${rules.etaMax} min` : t(location ? 'Not serviceable' : 'Set location')}
              <Icon name="ChevronDown" size={16} />
            </span>
            <span className="addr ellipsis">
              <Icon name="MapPin" size={12} /> {location ? `${location.area ? location.area + ', ' : ''}${location.pincode}` : `${t('Delivering across')} ${brand.city}`}
            </span>
          </button>
          <nav className="nav-links">
            {nav.map(([to, label, icon]) => (
              <NavLink key={to} to={to} end={to === '/'}><Icon name={icon} size={18} />{t(label)}</NavLink>
            ))}
          </nav>
          <Link to="/search" className="icon-btn" aria-label="Search"><Icon name="Search" size={19} /></Link>
          <Link to="/cart" className="icon-btn" aria-label="Cart">
            <Icon name="ShoppingBag" size={19} />
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
        <span className="grow">Demo mode: orders are saved on this device, and the login code is <b>123456</b>. Connect Supabase to go live.</span>
        <button aria-label="Dismiss" onClick={() => { sessionStorage.setItem('br:ribbon', '1'); setHide(true); }}><Icon name="X" size={16} /></button>
      </div>
    </div>
  );
}

export function TabBar() {
  const { cartCount } = useStore();
  const { t } = useI18n();
  const tabs = [
    ['/', 'Home', 'House'],
    ['/categories', 'Categories', 'LayoutGrid'],
    ['/orders', 'Orders', 'Package'],
    ['/account', 'Account', 'CircleUser'],
  ];
  return (
    <nav className="tabbar glass" aria-label="Primary">
      {tabs.map(([to, label, icon]) => (
        <NavLink key={to} to={to} end={to === '/'}>
          <Icon name={icon} size={22} />
          {t(label)}
          {to === '/cart' && cartCount > 0 && <span className="badge">{cartCount}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export function CartBar() {
  const { lines, cartCount } = useStore();
  const { pathname } = useLocation();
  const { t } = useI18n();
  if (!cartCount || ['/cart', '/checkout'].includes(pathname) || pathname.startsWith('/orders') || pathname.startsWith('/admin')) return null;
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  return (
    <Link to="/cart" className="cartbar no-print">
      <div>
        <div style={{ fontWeight: 700 }}>{cartCount} item{cartCount > 1 ? 's' : ''} · {money(total)}</div>
        <div className="xs" style={{ opacity: 0.85 }}>{total >= rules.freeDeliveryAbove ? 'Free delivery unlocked' : `Add ${money(rules.freeDeliveryAbove - total)} for free delivery`}</div>
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
      <button className="icon-btn" aria-label="Back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
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
