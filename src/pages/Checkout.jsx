import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { BackHeader, Empty, Icon, ProductArt, Sheet, Stepper } from '../components/ui.jsx';
import { money } from '../lib/format.js';
import { codAllowed, computeBill, isServiceable, offerLive, validateCoupon } from '../lib/pricing.js';
import { coupons, rules } from '../config.js';
import { api } from '../lib/api.js';
import { payOnline } from '../lib/payments.js';
import { useI18n } from '../lib/i18n.jsx';

function useAccountData(user) {
  const [addresses, setAddresses] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, txns: [] });
  const [orderCount, setOrderCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    api.listAddresses(user).then(setAddresses);
    api.wallet(user).then(setWallet);
    api.listOrders(user).then((o) => setOrderCount(o.filter((x) => x.status !== 'cancelled').length));
  }, [user]);
  return { addresses, setAddresses, wallet, orderCount };
}

export function BillCard({ bill }) {
  const { t } = useI18n();
  return (
    <div className="bill glass">
      <h3>{t('Bill details')}</h3>
      <div className="r"><span>{t('Item total')}</span><span>{bill.mrpTotal > bill.itemTotal && <span className="strike small" style={{ marginRight: 6 }}>{money(bill.mrpTotal)}</span>}{money(bill.itemTotal)}</span></div>
      <div className="r"><span>{t('Delivery fee')}</span><span>{bill.delivery ? money(bill.delivery) : <span className="green">{t('FREE')}</span>}</span></div>
      <div className="r"><span>{t('Handling fee')}</span><span>{money(bill.handling)}</span></div>
      {bill.loading > 0 && <div className="r"><span>{t('Loading & unloading')}</span><span>{money(bill.loading)}</span></div>}
      {bill.discount > 0 && <div className="r green"><span>{bill.coupon ? `Coupon ${bill.coupon}` : bill.offer?.title || 'Offer'}</span><span>−{money(bill.discount)}</span></div>}
      {bill.offer?.auto && bill.offer && !bill.discount && bill.delivery === 0 && <div className="r green small"><span>{bill.offer.title}</span><span>Free delivery</span></div>}
      {bill.wallet > 0 && <div className="r green"><span>Credit applied</span><span>−{money(bill.wallet)}</span></div>}
      <div className="r total"><span>{t('To pay')}</span><span>{money(bill.total)}</span></div>
      {bill.savings > 0 && <div className="banner ok small"><Icon name="PiggyBank" size={18} className="green" />You save {money(bill.savings)} on this order</div>}
    </div>
  );
}

export function Cart() {
  const { lines, setQty, user, clearCart } = useStore();
  const [coupon, setCoupon] = useState(() => sessionStorage.getItem('br:coupon') || '');
  const [couponOpen, setCouponOpen] = useState(false);
  const { orderCount } = useAccountData(user);
  const navigate = useNavigate();
  const { t } = useI18n();
  const bill = computeBill(lines, { coupon, isFirstOrder: orderCount === 0 });
  useEffect(() => { sessionStorage.setItem('br:coupon', bill.coupon || ''); }, [bill.coupon]);

  if (!lines.length) {
    return <div className="page"><BackHeader title={t('Cart')} /><Empty icon="ShoppingBag" title={t('Your cart is empty')} text="Add materials and they’ll be at your site in about an hour." action={<Link className="btn primary" to="/">{t('Start shopping')}</Link>} /></div>;
  }
  return (
    <div className="page">
      <BackHeader title={t('Cart')} right={<button className="small muted" onClick={clearCart}>{t('Clear')}</button>} />
      <div className="two-col">
        <div className="col" style={{ gap: 14 }}>
          {bill.freeDeliveryGap > 0 && (
            <div className="glass card" style={{ padding: 14 }}>
              <div className="small" style={{ marginBottom: 8 }}>Add <b>{money(bill.freeDeliveryGap)}</b> more for free delivery</div>
              <div className="progress"><div style={{ width: `${Math.min(100, (bill.itemTotal / rules.freeDeliveryAbove) * 100)}%` }} /></div>
            </div>
          )}
          <div className="glass card list">
            {lines.map((l) => (
              <div key={l.key}>
                <Link to={`/p/${l.product.id}`} style={{ width: 64, flexShrink: 0 }}><ProductArt product={l.product} size={28} showBadges={false} /></Link>
                <div className="grow">
                  <div className="small" style={{ fontWeight: 600 }}>{l.product.name}</div>
                  <div className="xs muted">{l.product.brand} · {l.variant.label}</div>
                  {!l.product.returnable && <div className="xs faint">Non-returnable</div>}
                </div>
                <div className="col" style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Stepper qty={l.qty} onChange={(n) => setQty(l.product.id, l.variant.id, n)} />
                  <div className="small" style={{ fontWeight: 600 }}>{money(l.price * l.qty)}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="glass card row" style={{ padding: 14, width: '100%' }} onClick={() => setCouponOpen(true)}>
            <Icon name="TicketPercent" className="accent" />
            <span className="grow" style={{ textAlign: 'left' }}>
              {bill.coupon ? <><b>{bill.coupon}</b> applied</> : t('Apply coupon')}
              {bill.couponError && <div className="xs red">{bill.couponError}</div>}
            </span>
            {bill.coupon ? <span className="small red" onClick={(e) => { e.stopPropagation(); setCoupon(''); }}>Remove</span> : <Icon name="ChevronRight" className="faint" />}
          </button>
        </div>
        <div className="col sticky" style={{ gap: 14 }}>
          <BillCard bill={bill} />
          <button className="btn primary block" onClick={() => navigate(user ? '/checkout' : '/login?next=/checkout')}>
            {t(user ? 'Proceed to checkout' : 'Sign in to checkout')} <Icon name="ArrowRight" size={18} />
          </button>
          <p className="xs muted center">No minimum order. Prices include GST.</p>
        </div>
      </div>
      <CouponSheet open={couponOpen} onClose={() => setCouponOpen(false)} lines={lines} onApply={(c) => { setCoupon(c); setCouponOpen(false); }} isFirstOrder={orderCount === 0} />
    </div>
  );
}

function CouponSheet({ open, onClose, onApply, lines, isFirstOrder }) {
  const [code, setCode] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title="Coupons">
      <form className="row" onSubmit={(e) => { e.preventDefault(); onApply(code.trim().toUpperCase()); }} style={{ marginBottom: 16 }}>
        <input className="input" placeholder="Enter code" value={code} onChange={(e) => setCode(e.target.value)} style={{ textTransform: 'uppercase' }} />
        <button className="btn dark">Apply</button>
      </form>
      <div className="col">
        {coupons.filter((c) => c.code && offerLive(c)).map((c) => {
          const check = validateCoupon(c.code, lines, isFirstOrder);
          const blocked = !check.ok;
          return (
            <div key={c.code} className="radio" style={{ cursor: 'default' }}>
              <Icon name="BadgePercent" className="accent" />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{c.code}</div>
                <div className="small muted">{c.title}</div>
                {blocked && <div className="xs faint">{check.error}</div>}
              </div>
              <button className="btn sm outline" disabled={blocked} onClick={() => onApply(c.code)}>Apply</button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

const emptyAddr = { label: 'Site', name: '', phone: '', line1: '', line2: '', landmark: '', pincode: '', city: 'Bengaluru' };

export function AddressForm({ initial, user, onSaved, onCancel }) {
  const [a, setA] = useState({ ...emptyAddr, phone: user?.phone || '', name: user?.name || '', ...initial });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const f = (k) => ({ value: a[k], onChange: (e) => setA({ ...a, [k]: e.target.value }) });
  const save = async (e) => {
    e.preventDefault();
    if (!a.name || !a.line1 || !/^\d{6}$/.test(a.pincode)) return setErr('Name, address and a 6-digit pincode are required.');
    if (!/^\+?\d{10,13}$/.test(a.phone.replace(/\s/g, ''))) return setErr('Enter a valid phone number for the delivery partner.');
    setBusy(true);
    try { onSaved(await api.saveAddress(user, a)); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form className="col" style={{ gap: 12 }} onSubmit={save}>
      <div className="seg">
        {['Site', 'Home', 'Office', 'Other'].map((l) => <button type="button" key={l} className={a.label === l ? 'on' : ''} onClick={() => setA({ ...a, label: l })}>{l}</button>)}
      </div>
      <div className="grid2">
        <label className="field"><span>Receiver name</span><input className="input" {...f('name')} autoComplete="name" /></label>
        <label className="field"><span>Receiver phone</span><input className="input" inputMode="tel" {...f('phone')} autoComplete="tel" /></label>
      </div>
      <label className="field"><span>Flat / plot / building</span><input className="input" {...f('line1')} autoComplete="address-line1" /></label>
      <label className="field"><span>Street & area</span><input className="input" {...f('line2')} autoComplete="address-line2" /></label>
      <label className="field"><span>Landmark (helps the driver)</span><input className="input" {...f('landmark')} /></label>
      <div className="grid2">
        <label className="field"><span>Pincode</span><input className="input" inputMode="numeric" maxLength={6} {...f('pincode')} autoComplete="postal-code" /></label>
        <label className="field"><span>City</span><input className="input" {...f('city')} /></label>
      </div>
      {/^\d{6}$/.test(a.pincode) && !isServiceable(a.pincode) && <div className="banner warn small"><Icon name="TriangleAlert" size={16} />We don’t deliver to this pincode yet.</div>}
      {err && <div className="small red">{err}</div>}
      <div className="row">
        {onCancel && <button type="button" className="btn ghost grow" onClick={onCancel}>Cancel</button>}
        <button className="btn primary grow" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
      </div>
    </form>
  );
}

const METHODS = [
  ['upi', 'UPI', 'GPay, PhonePe, Paytm & more', 'Smartphone'],
  ['card', 'Credit / debit card', 'Visa, Mastercard, RuPay', 'CreditCard'],
  ['netbanking', 'Net banking', 'All major banks', 'Landmark'],
  ['wallet', 'Wallets', 'Paytm, Mobikwik & more', 'Wallet'],
  ['cod', 'Pay on delivery', 'Cash or UPI to the delivery partner', 'Banknote'],
];

function nextDays(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0);
    return { value: d.toISOString().slice(0, 10), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }) };
  });
}

export function Checkout() {
  const { lines, user, clearCart, notify, location, setLocation } = useStore();
  const { addresses, setAddresses, wallet, orderCount } = useAccountData(user);
  const [addrId, setAddrId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [slotMode, setSlotMode] = useState('asap');
  const [day, setDay] = useState(nextDays()[0].value);
  const [slot, setSlot] = useState(rules.scheduledSlots[0]);
  const [method, setMethod] = useState('upi');
  const [useWallet, setUseWallet] = useState(false);
  const [note, setNote] = useState('');
  const [gst, setGst] = useState(!!user?.gstin);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (addrId || !addresses.length) return;
    const pref = addresses.find((a) => a.pincode === location?.pincode && isServiceable(a.pincode)) || addresses.find((a) => isServiceable(a.pincode)) || addresses[0];
    setAddrId(pref.id);
  }, [addresses, addrId, location]);

  const addr = addresses.find((a) => a.id === addrId);
  const coupon = sessionStorage.getItem('br:coupon') || '';
  const bill = computeBill(lines, { coupon, isFirstOrder: orderCount === 0, walletBalance: wallet.balance, useWallet });
  const days = useMemo(() => nextDays(), []);
  const serviceable = addr && isServiceable(addr.pincode);
  const cod = addr && codAllowed(addr.pincode);
  const payMethod = bill.total === 0 ? 'wallet_credit' : method;

  if (!lines.length) return <div className="page"><Empty icon="ShoppingBag" title="Your cart is empty" action={<Link className="btn primary" to="/">Shop now</Link>} /></div>;

  const place = async () => {
    setErr('');
    if (!addr) return setErr('Add a delivery address.');
    if (!serviceable) return setErr('This address is outside our delivery area.');
    if (payMethod === 'cod' && !cod) return setErr('Pay on delivery isn’t available here.');
    setBusy(true);
    try {
      const draft = {
        items: lines.map((l) => ({
          key: l.key, productId: l.product.id, variantId: l.variant.id, name: l.product.name, brand: l.product.brand,
          variant: l.variant.label, price: l.price, mrp: l.mrp, qty: l.qty, heavy: l.heavy, returnable: l.product.returnable, categoryId: l.product.categoryId,
        })),
        address: addr,
        slot: slotMode === 'asap' ? 'asap' : `${day} ${slot}`,
        etaMinutes: rules.etaMin + Math.min(60, Math.floor(lines.length * 3)),
        bill,
        couponCode: coupon,
        payment: { method: payMethod, status: payMethod === 'cod' ? 'pending' : 'paid' },
        note,
        gstin: gst ? user.gstin : '',
        businessName: gst ? user.businessName : '',
      };
      if (!['cod', 'wallet_credit'].includes(payMethod)) {
        const r = await payOnline({ order: draft, method: payMethod, user });
        draft.payment = { method: payMethod, status: 'paid', ref: r.ref, gateway: r.gateway };
      }
      const order = await api.createOrder(user, draft);
      clearCart();
      sessionStorage.removeItem('br:coupon');
      if (location?.pincode !== addr.pincode) setLocation({ pincode: addr.pincode, area: addr.line2 });
      notify('Order placed');
      navigate(`/orders/${order.id}?placed=1`, { replace: true });
    } catch (x) {
      setErr(x.message || 'Something went wrong. You have not been charged.');
    } finally { setBusy(false); }
  };

  return (
    <div className="page">
      <BackHeader title={t('Checkout')} />
      <div className="two-col">
        <div className="col" style={{ gap: 18 }}>
          <section className="glass card" style={{ padding: 16 }}>
            <div className="row between" style={{ marginBottom: 12 }}><h3>{t('Deliver to')}</h3>{addresses.length > 0 && <button className="small accent" onClick={() => setAdding(true)}>+ New address</button>}</div>
            {addresses.length === 0 && !adding && <AddressForm user={user} onSaved={(a) => { setAddresses([...addresses, a]); setAddrId(a.id); }} />}
            <div className="col">
              {addresses.map((a) => (
                <button key={a.id} className={`radio ${a.id === addrId ? 'on' : ''}`} onClick={() => setAddrId(a.id)}>
                  <span className="dot" />
                  <span className="grow">
                    <span className="row" style={{ gap: 6 }}><b>{a.label}</b>{!isServiceable(a.pincode) && <span className="status-pill bad">Not serviceable</span>}</span>
                    <span className="small muted clamp2">{[a.line1, a.line2, a.landmark, a.city, a.pincode].filter(Boolean).join(', ')}</span>
                    <span className="xs faint">{a.name} · {a.phone}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="glass card" style={{ padding: 16 }}>
            <h3 style={{ marginBottom: 12 }}>{t('Delivery time')}</h3>
            <div className="seg" style={{ marginBottom: 12 }}>
              <button className={slotMode === 'asap' ? 'on' : ''} onClick={() => setSlotMode('asap')}>Express · {rules.etaMin}–{rules.etaMax} min</button>
              <button className={slotMode === 'later' ? 'on' : ''} onClick={() => setSlotMode('later')}>{t('Schedule')}</button>
            </div>
            {slotMode === 'later' && (
              <div className="col">
                <div className="chips">{days.map((d) => <button key={d.value} className={`chip ${day === d.value ? 'on' : ''}`} onClick={() => setDay(d.value)}>{d.label}</button>)}</div>
                <div className="chips" style={{ flexWrap: 'wrap' }}>{rules.scheduledSlots.map((s) => <button key={s} className={`chip ${slot === s ? 'on' : ''}`} onClick={() => setSlot(s)}>{s}</button>)}</div>
              </div>
            )}
            <div className="field" style={{ marginTop: 12 }}>
              <label>Instructions for the delivery partner (optional)</label>
              <input className="input" placeholder="e.g. Call site supervisor Ravi on arrival" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </section>

          <section className="glass card" style={{ padding: 16 }}>
            <h3 style={{ marginBottom: 12 }}>{t('Payment')}</h3>
            {wallet.balance > 0 && (
              <label className="radio" style={{ marginBottom: 10 }}>
                <input type="checkbox" className="check" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
                <span className="grow"><b>Use BuildRun Credit</b><div className="small muted">Balance {money(wallet.balance)}</div></span>
              </label>
            )}
            {bill.total > 0 ? (
              <div className="col">
                {METHODS.map(([id, label, sub, icon]) => {
                  const disabled = id === 'cod' && addr && !cod;
                  return (
                    <button key={id} className={`radio ${method === id ? 'on' : ''}`} onClick={() => !disabled && setMethod(id)} disabled={disabled} style={disabled ? { opacity: 0.5 } : null}>
                      <span className="dot" />
                      <Icon name={icon} />
                      <span className="grow"><b>{label}</b><div className="small muted">{disabled ? 'Not available for this pincode' : sub}</div></span>
                    </button>
                  );
                })}
              </div>
            ) : <div className="banner ok small">Fully covered by your credit.</div>}
            {user?.gstin ? (
              <label className="row small" style={{ marginTop: 12 }}>
                <input type="checkbox" className="check" checked={gst} onChange={(e) => setGst(e.target.checked)} />
                Add GSTIN {user.gstin} to invoice
              </label>
            ) : (
              <p className="small muted" style={{ marginTop: 12 }}>Need a GST invoice for your business? <Link className="link" to="/account/profile">Add your GSTIN</Link>.</p>
            )}
          </section>
        </div>

        <div className="col sticky" style={{ gap: 14 }}>
          <BillCard bill={bill} />
          {err && <div className="banner warn small"><Icon name="CircleAlert" size={18} />{err}</div>}
          <button className="btn primary block" onClick={place} disabled={busy || !addr}>
            {busy ? 'Placing order…' : payMethod === 'cod' ? `${t('Place order')} · ${money(bill.total)}` : bill.total === 0 ? t('Place order') : `${t('Pay')} ${money(bill.total)}`}
          </button>
          <p className="xs muted center">By placing this order you agree to our <Link className="link" to="/policy/terms">Terms</Link> and <Link className="link" to="/policy/refund">Return policy</Link>. Cancel free within {rules.cancelWindowMin} minutes.</p>
        </div>
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} title="New address">
        <AddressForm user={user} onCancel={() => setAdding(false)} onSaved={(a) => { setAddresses([...addresses, a]); setAddrId(a.id); setAdding(false); }} />
      </Sheet>
    </div>
  );
}
