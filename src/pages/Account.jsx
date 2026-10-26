import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { BackHeader, Empty, Icon, Sheet } from '../components/ui.jsx';
import { AddressForm } from './Checkout.jsx';
import { api, mode, DEMO_OTP } from '../lib/api.js';
import { dateTime, money } from '../lib/format.js';
import { faqs, policies } from '../data/content.js';
import { brand, rules } from '../config.js';
import { isServiceable } from '../lib/pricing.js';
import { STATUS } from '../lib/orderLogic.js';
import { StatusPill, methodLabel } from './Orders.jsx';
import { NotFound } from './Shop.jsx';

export function Login() {
  const [params] = useSearchParams();
  const next = params.get('next') || '/account';
  const { setUser, user } = useStore();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('phone');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const refs = useRef([]);
  useEffect(() => { if (user) navigate(next, { replace: true }); }, [user, next, navigate]);
  useEffect(() => { if (resendIn <= 0) return; const t = setTimeout(() => setResendIn(resendIn - 1), 1000); return () => clearTimeout(t); }, [resendIn]);

  const e164 = '+91' + phone;
  const send = async (e) => {
    e?.preventDefault(); setErr('');
    if (!/^[6-9]\d{9}$/.test(phone)) return setErr('Enter a valid 10-digit mobile number.');
    setBusy(true);
    try { await api.sendOtp(e164); setStage('otp'); setResendIn(30); setTimeout(() => refs.current[0]?.focus(), 50); }
    catch (x) { setErr(x.message || 'Couldn’t send the code.'); } finally { setBusy(false); }
  };
  const verify = async (digits) => {
    setBusy(true); setErr('');
    try { setUser(await api.verifyOtp(e164, digits)); }
    catch (x) { setErr(x.message); setCode(['', '', '', '', '', '']); refs.current[0]?.focus(); }
    finally { setBusy(false); }
  };
  const onDigit = (i, v) => {
    const d = v.replace(/\D/g, '');
    if (d.length > 1) { // paste / autofill
      const arr = d.slice(0, 6).split(''); const nextCode = [...arr, ...Array(6 - arr.length).fill('')];
      setCode(nextCode); if (arr.length === 6) verify(arr.join('')); return;
    }
    const nextCode = [...code]; nextCode[i] = d; setCode(nextCode);
    if (d && i < 5) refs.current[i + 1]?.focus();
    if (nextCode.every(Boolean)) verify(nextCode.join(''));
  };

  return (
    <div className="page" style={{ maxWidth: 460 }}>
      <div className="glass card" style={{ padding: 26, marginTop: 20 }}>
        <img src="/icon.svg" alt="" width="52" style={{ borderRadius: 14, marginBottom: 16 }} />
        {stage === 'phone' ? (
          <form className="col" style={{ gap: 14 }} onSubmit={send}>
            <h1 style={{ fontSize: 28 }}>Log in or sign up</h1>
            <p className="muted">We’ll text you a 6-digit code. No passwords.</p>
            <div className="search-pill" style={{ height: 56, boxShadow: 'none' }}>
              <span style={{ fontWeight: 600 }}>+91</span>
              <input inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} autoFocus aria-label="Mobile number" />
            </div>
            {err && <div className="small red">{err}</div>}
            <button className="btn primary block" disabled={busy || phone.length !== 10}>{busy ? 'Sending…' : 'Continue'}</button>
            <p className="xs muted center">By continuing you agree to our <Link className="link" to="/policy/terms">Terms</Link> and <Link className="link" to="/policy/privacy">Privacy Policy</Link>.</p>
          </form>
        ) : (
          <div className="col" style={{ gap: 14 }}>
            <h1 style={{ fontSize: 28 }}>Enter code</h1>
            <p className="muted">Sent to +91 {phone}. <button className="link" onClick={() => setStage('phone')}>Change</button></p>
            {mode === 'demo' && <div className="banner info small"><Icon name="FlaskConical" size={16} />Demo mode: the code is {DEMO_OTP}</div>}
            <div className="otp">
              {code.map((c, i) => (
                <input key={i} ref={(el) => (refs.current[i] = el)} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? 6 : 1} value={c} aria-label={`Digit ${i + 1}`}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus(); }} />
              ))}
            </div>
            {err && <div className="small red center">{err}</div>}
            {busy && <div className="small muted center">Verifying…</div>}
            <button className="btn ghost block" disabled={resendIn > 0 || busy} onClick={send}>{resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Account() {
  const { user, setUser, ready } = useStore();
  const [wallet, setWallet] = useState(null);
  useEffect(() => { if (user) api.wallet(user).then(setWallet); }, [user]);
  if (!ready) return null;
  const links = [
    ['/orders', 'Package', 'Your orders'],
    ['/account/addresses', 'MapPin', 'Saved addresses'],
    ['/account/wallet', 'Wallet', 'BuildRun Credit', wallet ? money(wallet.balance) : ''],
    ['/account/profile', 'Building2', 'Profile & GST details'],
    ['/bulk', 'Truck', 'Bulk quote'],
  ];
  const help = [
    ['/help', 'CircleHelp', 'Help & FAQs'],
    ['/price-list', 'ListOrdered', 'Today’s price list'],
    ['/policy/refund', 'RotateCcw', 'Returns & refunds'],
    ['/policy/terms', 'FileText', 'Terms of service'],
    ['/policy/privacy', 'Lock', 'Privacy policy'],
    ['/about', 'Info', `About ${brand.name}`],
  ];
  return (
    <div className="page" style={{ maxWidth: 720 }}>
      {user ? (
        <div className="glass card row" style={{ padding: 18, marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700 }}>
            {(user.name || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="grow">
            <h2>{user.name || 'Add your name'}</h2>
            <div className="small muted">{user.phone}{user.businessName ? ` · ${user.businessName}` : ''}</div>
          </div>
          <Link to="/account/profile" className="btn sm ghost">Edit</Link>
        </div>
      ) : (
        <div className="glass card" style={{ padding: 22, marginBottom: 18 }}>
          <h2>Your account</h2>
          <p className="muted" style={{ margin: '6px 0 14px' }}>Sign in to place orders, track deliveries and download invoices.</p>
          <Link to="/login" className="btn primary">Log in or sign up</Link>
        </div>
      )}
      {user && (
        <div className="glass card list" style={{ marginBottom: 18 }}>
          {links.map(([to, icon, label, extra]) => (
            <Link key={to} to={to}><span className="ico"><Icon name={icon} size={18} /></span><span className="grow">{label}</span>{extra && <span className="small muted">{extra}</span>}<Icon name="ChevronRight" size={18} className="faint" /></Link>
          ))}
          {user.isAdmin && <Link to="/admin"><span className="ico"><Icon name="LayoutDashboard" size={18} /></span><span className="grow">Admin dashboard</span><Icon name="ChevronRight" size={18} className="faint" /></Link>}
        </div>
      )}
      <div className="glass card list" style={{ marginBottom: 18 }}>
        {help.map(([to, icon, label]) => (
          <Link key={to} to={to}><span className="ico"><Icon name={icon} size={18} /></span><span className="grow">{label}</span><Icon name="ChevronRight" size={18} className="faint" /></Link>
        ))}
        <a href={`tel:${brand.supportPhone}`}><span className="ico"><Icon name="Phone" size={18} /></span><span className="grow">Call support</span><span className="small muted">7 AM – 10 PM</span></a>
      </div>
      {user && <button className="btn danger block" onClick={async () => { await api.signOut(); setUser(null); }}>Log out</button>}
      <p className="xs faint center" style={{ marginTop: 16 }}>{brand.name} v1.0 · {mode === 'demo' ? 'Demo mode' : 'Live'}</p>
    </div>
  );
}

export function Profile() {
  const { user, setUser, notify } = useStore();
  const [f, setF] = useState({ name: user.name, email: user.email, businessName: user.businessName, gstin: user.gstin });
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (f.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(f.gstin.toUpperCase())) return setErr('That GSTIN doesn’t look right (15 characters, e.g. 29ABCDE1234F1Z5).');
    setUser(await api.updateProfile(user, { ...f, gstin: f.gstin.toUpperCase() }));
    notify('Profile saved');
  };
  const bind = (k) => ({ value: f[k] || '', onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <BackHeader title="Profile" />
      <form className="glass card col" style={{ padding: 18, gap: 14 }} onSubmit={save}>
        <div className="field"><label>Full name</label><input className="input" {...bind('name')} autoComplete="name" /></div>
        <div className="field"><label>Mobile</label><input className="input" value={user.phone} disabled /></div>
        <div className="field"><label>Email (for invoices)</label><input className="input" type="email" {...bind('email')} autoComplete="email" /></div>
        <h3 style={{ marginTop: 8 }}>Business details</h3>
        <p className="small muted" style={{ marginTop: -8 }}>Add these to get GST invoices with your GSTIN for input tax credit.</p>
        <div className="field"><label>Business name</label><input className="input" {...bind('businessName')} /></div>
        <div className="field"><label>GSTIN</label><input className="input" {...bind('gstin')} maxLength={15} style={{ textTransform: 'uppercase' }} /></div>
        {err && <div className="small red">{err}</div>}
        <button className="btn primary block">Save</button>
      </form>
    </div>
  );
}

export function Addresses() {
  const { user, notify } = useStore();
  const [list, setList] = useState([]);
  const [edit, setEdit] = useState(null);
  useEffect(() => { api.listAddresses(user).then(setList); }, [user]);
  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <BackHeader title="Saved addresses" right={<button className="btn sm primary" onClick={() => setEdit({})}><Icon name="Plus" size={16} />Add</button>} />
      {!list.length && <Empty icon="MapPin" title="No addresses yet" text="Save your site, home or office for one-tap checkout." />}
      <div className="col">
        {list.map((a) => (
          <div key={a.id} className="glass card" style={{ padding: 16 }}>
            <div className="row between">
              <div className="row" style={{ gap: 6 }}><b>{a.label}</b>{!isServiceable(a.pincode) && <span className="status-pill bad">Not serviceable</span>}</div>
              <div className="row">
                <button className="small accent" onClick={() => setEdit(a)}>Edit</button>
                <button className="small red" onClick={async () => { await api.deleteAddress(user, a.id); setList(list.filter((x) => x.id !== a.id)); notify('Address deleted'); }}>Delete</button>
              </div>
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>{[a.line1, a.line2, a.landmark, a.city, a.pincode].filter(Boolean).join(', ')}</div>
            <div className="xs faint">{a.name} · {a.phone}</div>
          </div>
        ))}
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit address' : 'New address'}>
        {edit && <AddressForm user={user} initial={edit} onCancel={() => setEdit(null)} onSaved={(a) => { setList(edit.id ? list.map((x) => (x.id === a.id ? a : x)) : [...list, a]); setEdit(null); notify('Address saved'); }} />}
      </Sheet>
    </div>
  );
}

export function WalletPage() {
  const { user } = useStore();
  const [w, setW] = useState(null);
  useEffect(() => { api.wallet(user).then(setW); }, [user]);
  if (!w) return <div className="page" />;
  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <BackHeader title="BuildRun Credit" />
      <div className="offer" style={{ background: 'linear-gradient(135deg,#1d1d1f,#3a3a3c)', marginBottom: 18 }}>
        <span className="small" style={{ opacity: 0.7 }}>Available balance</span>
        <h1 style={{ color: '#fff' }}>{money(w.balance)}</h1>
        <span className="xs" style={{ opacity: 0.7 }}>Use at checkout. Credit never expires.</span>
      </div>
      {w.txns.length ? (
        <div className="glass card list">
          {w.txns.map((t) => (
            <div key={t.id}><span className="ico"><Icon name={t.amount > 0 ? 'ArrowDownLeft' : 'ArrowUpRight'} size={18} /></span><span className="grow"><div className="small">{t.note}</div><div className="xs faint">{dateTime(t.at)}</div></span><b className={t.amount > 0 ? 'green' : ''}>{t.amount > 0 ? '+' : '−'}{money(Math.abs(t.amount))}</b></div>
          ))}
        </div>
      ) : <Empty icon="Wallet" title="No transactions yet" text="Refunds for cash orders and promotional credit will appear here." />}
    </div>
  );
}

export function Help() {
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <BackHeader title="Help & FAQs" />
      <div className="glass card row wrap" style={{ padding: 16, marginBottom: 20 }}>
        <Icon name="Headset" size={28} className="accent" />
        <div className="grow"><b>Need a hand?</b><div className="small muted">Our team is available 7 AM – 10 PM, every day.</div></div>
        <a className="btn sm outline" href={`tel:${brand.supportPhone}`}><Icon name="Phone" size={14} />Call</a>
        <a className="btn sm outline" href={`https://wa.me/${brand.supportPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><Icon name="MessageCircle" size={14} />WhatsApp</a>
        <a className="btn sm outline" href={`mailto:${brand.supportEmail}`}><Icon name="Mail" size={14} />Email</a>
      </div>
      {faqs.map((g) => (
        <section key={g.group} style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 4 }}>{g.group}</h3>
          {g.items.map(([q, a]) => (
            <details key={q} className="faq"><summary>{q}<Icon name="Plus" size={18} /></summary><p>{a}</p></details>
          ))}
        </section>
      ))}
    </div>
  );
}

export function Policy() {
  const { id } = useParams();
  const p = policies[id];
  if (!p) return <NotFound />;
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <BackHeader title={p.title} />
      <div className="glass card col" style={{ padding: 22, gap: 18 }}>
        {p.body.map(([h, t]) => <div key={h}><h3 style={{ marginBottom: 4 }}>{h}</h3><p className="muted">{t}</p></div>)}
        <p className="xs faint">Last updated {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}. Have this reviewed by your legal counsel before launch.</p>
      </div>
    </div>
  );
}

export function About() {
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <BackHeader title={`About ${brand.name}`} />
      <div className="glass card col" style={{ padding: 22, gap: 14 }}>
        <h2>Materials at the speed of your site.</h2>
        <p className="muted">A half-day lost to a missing bag of cement or a box of screws adds up. {brand.name} keeps thousands of construction and interior products stocked in neighbourhood stores across {brand.city}, so contractors, carpenters, electricians, plumbers and homeowners get what they need in about an hour, at fair, transparent prices.</p>
        <div className="usp" style={{ marginTop: 0 }}>
          {[['Timer', `${rules.etaMin}-minute express`], ['Store', 'Neighbourhood stores'], ['BadgeCheck', 'Authorised brands'], ['ReceiptIndianRupee', 'GST invoices']].map(([i, t]) => <div key={t} className="glass"><Icon name={i} />{t}</div>)}
        </div>
        <p className="small muted">{brand.legalName} · {brand.address}</p>
      </div>
    </div>
  );
}

export function PriceList() {
  const { id } = useParams();
  const { categories, products } = useStore();
  const cats = id ? categories.filter((c) => c.id === id) : categories;
  const heading = id ? cats[0]?.name : 'Building materials';
  useEffect(() => { if (heading) document.title = `${heading} price list in ${brand.city} · ${brand.name}`; }, [heading]);
  if (id && !cats.length) return <NotFound />;
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <BackHeader title={id ? `${cats[0].name} prices` : 'Price list'} />
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>Today’s prices in {brand.city}, {today}. All prices include GST.</p>
      {!id && <div className="chips" style={{ marginBottom: 16, flexWrap: 'wrap' }}>{categories.map((c) => <Link key={c.id} className="chip" to={`/price-list/${c.id}`}>{c.name}</Link>)}</div>}
      {cats.map((c) => (
        <section key={c.id} className="glass card" style={{ padding: 8, marginBottom: 16, overflowX: 'auto' }}>
          <h3 style={{ padding: '10px 12px' }}><Link to={`/c/${c.id}`}>{c.name}</Link></h3>
          <table className="t">
            <thead><tr><th>Product</th><th>Brand</th><th>Pack</th><th className="num">MRP</th><th className="num">Our price</th></tr></thead>
            <tbody>
              {products.filter((p) => p.categoryId === c.id).flatMap((p) => p.variants.map((v) => (
                <tr key={v.id}><td><Link to={`/p/${p.id}`}>{p.name}</Link></td><td>{p.brand}</td><td>{v.label}</td><td className="num strike">{money(v.mrp)}</td><td className="num"><b>{money(v.price)}</b></td></tr>
              )))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

export function Bulk() {
  const { user, notify } = useStore();
  const [f, setF] = useState({ name: user?.name || '', phone: user?.phone || '', pincode: '', items: '', when: 'This week' });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const bind = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.phone || !f.items) return setErr('Please fill your name, phone and material list.');
    await api.submitQuote(user, f); setDone(true); notify('Request sent');
  };
  if (done) return <div className="page"><Empty icon="CircleCheck" title="Request received" text="Our team will call you with a quote shortly, usually within the hour during working hours." action={<Link className="btn primary" to="/">Back to shopping</Link>} /></div>;
  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <BackHeader title="Bulk quote" />
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>Large orders, project supplies or something you can’t find? Tell us what you need.</p>
      <form className="glass card col" style={{ padding: 18, gap: 14 }} onSubmit={submit}>
        <div className="grid2">
          <div className="field"><label>Name</label><input className="input" {...bind('name')} /></div>
          <div className="field"><label>Phone</label><input className="input" inputMode="tel" {...bind('phone')} /></div>
        </div>
        <div className="field"><label>Site pincode</label><input className="input" inputMode="numeric" maxLength={6} {...bind('pincode')} /></div>
        <div className="field"><label>Material list</label><textarea className="input" rows={6} placeholder={'e.g.\n200 bags OPC 53\n40 sheets 18 mm BWP ply\n10 coils 1.5 sq mm FRLS wire'} {...bind('items')} /></div>
        <div className="field"><label>Needed by</label>
          <div className="seg">{['Today', 'This week', 'This month'].map((w) => <button type="button" key={w} className={f.when === w ? 'on' : ''} onClick={() => setF({ ...f, when: w })}>{w}</button>)}</div>
        </div>
        {err && <div className="small red">{err}</div>}
        <button className="btn primary block">Request quote</button>
      </form>
    </div>
  );
}

const ADMIN_NEXT = { placed: ['confirmed', 'cancelled'], confirmed: ['packed', 'cancelled'], packed: ['out_for_delivery'], out_for_delivery: ['delivered'], return_requested: ['returned', 'delivered'] };

export function Admin() {
  const { user } = useStore();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState('active');
  const load = () => { api.adminOrders().then(setOrders); api.adminQuotes().then(setQuotes); };
  useEffect(() => { if (user?.isAdmin) { load(); const t = setInterval(load, 15000); return () => clearInterval(t); } }, [user]);
  if (!user?.isAdmin) return <div className="page"><Empty icon="ShieldX" title="Admins only" text={mode === 'demo' ? 'In demo mode, log in with 0000000000 to see the admin dashboard.' : 'Set is_admin = true on your profile row in Supabase.'} /></div>;
  const today = orders.filter((o) => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const shown = orders.filter((o) => (filter === 'active' ? ['placed', 'confirmed', 'packed', 'out_for_delivery', 'return_requested'].includes(o.status) : true));
  return (
    <div className="page">
      <BackHeader title="Admin" />
      <div className="usp" style={{ marginTop: 0, marginBottom: 16 }}>
        <div className="glass"><Icon name="ShoppingCart" />{today.length} orders today</div>
        <div className="glass"><Icon name="IndianRupee" />{money(today.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.bill.total + (o.bill.wallet || 0), 0))} today</div>
        <div className="glass"><Icon name="Activity" />{orders.filter((o) => ['placed', 'confirmed', 'packed', 'out_for_delivery'].includes(o.status)).length} in progress</div>
        <div className="glass"><Icon name="Truck" />{quotes.length} bulk requests</div>
      </div>
      <div className="seg" style={{ maxWidth: 360, marginBottom: 14 }}>
        <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>Orders</button>
        <button className={tab === 'quotes' ? 'on' : ''} onClick={() => setTab('quotes')}>Bulk quotes</button>
      </div>
      {tab === 'orders' ? (
        <>
          <div className="chips" style={{ marginBottom: 12 }}>
            <button className={`chip ${filter === 'active' ? 'on' : ''}`} onClick={() => setFilter('active')}>Needs action</button>
            <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>All</button>
          </div>
          <div className="glass card" style={{ overflowX: 'auto', padding: 6 }}>
            <table className="t">
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Slot</th><th className="num">Total</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {shown.map((o) => (
                  <tr key={o.id}>
                    <td><Link className="link" to={`/orders/${o.id}`}>#{o.id}</Link><div className="xs faint">{dateTime(o.createdAt)}</div></td>
                    <td>{o.address.name}<div className="xs faint">{o.address.phone} · {o.address.pincode}</div></td>
                    <td className="small">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</td>
                    <td className="small">{o.slot === 'asap' ? 'Express' : o.slot}</td>
                    <td className="num">{money(o.bill.total)}<div className="xs faint">{methodLabel(o.payment.method)}</div></td>
                    <td><StatusPill status={o.status} /></td>
                    <td><div className="row wrap" style={{ gap: 6 }}>{(ADMIN_NEXT[o.status] || []).map((s) => (
                      <button key={s} className={`btn sm ${s === 'cancelled' ? 'danger' : 'outline'}`} onClick={async () => { await api.adminSetStatus(o.id, s); load(); }}>{STATUS[s].label}</button>
                    ))}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!shown.length && <Empty icon="Inbox" title="Nothing to do" />}
          </div>
        </>
      ) : (
        <div className="col">
          {quotes.map((q) => (
            <div key={q.id} className="glass card" style={{ padding: 16 }}>
              <div className="row between"><b>{q.name} · <a className="link" href={`tel:${q.phone}`}>{q.phone}</a></b><span className="small muted">{dateTime(q.at)}</span></div>
              <div className="small muted">Pincode {q.pincode || '—'} · Needed {q.when}</div>
              <pre className="small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '8px 0 0' }}>{q.items}</pre>
            </div>
          ))}
          {!quotes.length && <Empty icon="Inbox" title="No bulk requests yet" />}
        </div>
      )}
    </div>
  );
}
