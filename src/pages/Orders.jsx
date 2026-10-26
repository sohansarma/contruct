import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { BackHeader, Empty, Icon, Sheet } from '../components/ui.jsx';
import { dateTime, money, money2, time } from '../lib/format.js';
import { api, returnAmount } from '../lib/api.js';
import { STATUS, TRACK_STEPS, canCancel, canReturn, cancelSecondsLeft, isActive, refundDestination } from '../lib/orderLogic.js';
import { gstBreakup } from '../lib/pricing.js';
import { brand, rules } from '../config.js';
import { useI18n } from '../lib/i18n.jsx';

export function StatusPill({ status }) {
  const { t } = useI18n();
  const cls = isActive({ status }) ? 'live' : status === 'delivered' || status === 'returned' ? 'ok' : status === 'cancelled' ? 'bad' : '';
  return <span className={`status-pill ${cls}`}>{isActive({ status }) && <span className="pulse" />}{t(STATUS[status]?.label || status)}</span>;
}

function usePoll(fn, ms, deps) {
  useEffect(() => {
    fn();
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function Orders() {
  const { user, setQty, notify } = useStore();
  const [orders, setOrders] = useState(null);
  usePoll(() => api.listOrders(user).then(setOrders), 15000, [user]);
  const { t } = useI18n();
  const reorder = (o) => { o.items.forEach((i) => setQty(i.productId, i.variantId, i.qty)); notify('Items added to cart'); };

  if (!orders) return <div className="page"><h1>{t('Orders')}</h1></div>;
  if (!orders.length) return <div className="page"><h1>{t('Orders')}</h1><Empty icon="Package" title={t('No orders yet')} text="Your orders and live tracking will show up here." action={<Link className="btn primary" to="/">Start shopping</Link>} /></div>;
  return (
    <div className="page">
      <h1 style={{ marginBottom: 16 }}>{t('Orders')}</h1>
      <div className="col" style={{ gap: 12 }}>
        {orders.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="glass card" style={{ padding: 16, display: 'block' }}>
            <div className="row between">
              <StatusPill status={o.status} />
              <span className="small muted">{dateTime(o.createdAt)}</span>
            </div>
            <div style={{ marginTop: 10, fontWeight: 600 }} className="ellipsis">{o.items.map((i) => i.name).join(', ')}</div>
            <div className="row between" style={{ marginTop: 8 }}>
              <span className="small muted">#{o.id} · {o.items.reduce((s, i) => s + i.qty, 0)} items</span>
              <span style={{ fontWeight: 700 }}>{money(o.bill.total + (o.bill.wallet || 0))}</span>
            </div>
            {!isActive(o) && (
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn sm outline" onClick={(e) => { e.preventDefault(); reorder(o); }}><Icon name="RotateCw" size={14} />Reorder</button>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user, notify, setQty } = useStore();
  const [o, setO] = useState(undefined);
  const [now, setNow] = useState(Date.now());
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const { t } = useI18n();
  const load = useCallback(() => api.getOrder(user, id).then(setO), [user, id]);
  usePoll(load, 10000, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  if (o === undefined) return <div className="page" />;
  if (!o) return <div className="page"><Empty icon="PackageX" title="Order not found" action={<Link className="btn primary" to="/orders">All orders</Link>} /></div>;

  const step = STATUS[o.status]?.step ?? 0;
  const secs = cancelSecondsLeft(o, now);
  const eta = o.createdAt + (o.etaMinutes || rules.etaMin) * 60000;
  const historyAt = (s) => o.history?.find((h) => h.status === s)?.at;
  const scheduled = o.slot && o.slot !== 'asap';

  return (
    <div className="page">
      <BackHeader title={`Order #${o.id}`} right={<Link className="icon-btn" to={`/orders/${o.id}/invoice`} aria-label="Invoice"><Icon name="FileText" size={18} /></Link>} />
      {params.get('placed') && (
        <div className="banner ok" style={{ marginBottom: 16 }}>
          <Icon name="PartyPopper" className="green" />
          <div><b>Order placed!</b><div className="small muted">We’ll send updates by SMS. You can track every step here.</div></div>
        </div>
      )}
      <div className="two-col">
        <div className="col" style={{ gap: 16 }}>
          <section className="glass card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <StatusPill status={o.status} />
              <span className="small muted">{dateTime(o.createdAt)}</span>
            </div>
            {isActive(o) && (
              <h2 style={{ margin: '10px 0 16px' }}>
                {scheduled ? `Scheduled for ${o.slot}` : now < eta ? `Arriving by ${time(eta)}` : 'Arriving shortly'}
              </h2>
            )}
            {o.status === 'delivered' && <h2 style={{ margin: '10px 0 16px' }}>Delivered at {time(o.deliveredAt)}</h2>}
            {o.status === 'cancelled' && <p className="muted" style={{ margin: '10px 0' }}>This order was cancelled{o.cancelReason ? ` (${o.cancelReason})` : ''}.</p>}
            {['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered'].includes(o.status) && (
              <div className="track">
                {TRACK_STEPS.map((s, i) => {
                  const st = STATUS[s].step;
                  const cls = st < step || o.status === 'delivered' ? 'done' : st === step ? 'now' : '';
                  const at = historyAt(s);
                  return (
                    <div key={s} className={`step ${cls}`}>
                      <div className="node">{cls === 'done' ? <Icon name="Check" size={16} /> : <span className="xs">{i + 1}</span>}</div>
                      <div>
                        <div style={{ fontWeight: cls ? 600 : 400 }} className={cls ? '' : 'muted'}>{t(STATUS[s].label)}</div>
                        {cls === 'now' && s === 'out_for_delivery' && <div className="small muted">Your delivery partner is on the way</div>}
                        {at && <div className="xs faint">{time(at)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {o.status === 'out_for_delivery' && (
              <div className="radio" style={{ marginTop: 16, cursor: 'default' }}>
                <span className="ico" style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}><Icon name="Truck" /></span>
                <span className="grow"><b>{o.rider?.name || 'Delivery partner'}</b><div className="small muted">{o.rider?.vehicle || 'Mini-truck'} · contact via support</div></span>
                <a className="btn sm outline" href={`tel:${o.rider?.phone || brand.supportPhone}`}><Icon name="Phone" size={14} />Call</a>
              </div>
            )}
            {o.status === 'return_requested' && <div className="banner info small" style={{ marginTop: 12 }}><Icon name="RotateCcw" size={18} />Return requested for {o.returnRequest.itemIds.length} item(s). We’ll arrange a pickup and inspection.</div>}
            {o.refund && (
              <div className="banner ok small" style={{ marginTop: 12 }}>
                <Icon name="BadgeIndianRupee" size={18} className="green" />
                Refund of {money(o.refund.amount)} {o.refund.to === 'wallet' ? 'added to your BuildRun Credit' : 'sent to your original payment method (1–7 business days)'}.
              </div>
            )}
            <div className="row wrap" style={{ marginTop: 16 }}>
              {canCancel(o, now) && <button className="btn sm danger" onClick={() => setCancelOpen(true)}>{t('Cancel order')} · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</button>}
              {canReturn(o, now) && <button className="btn sm outline" onClick={() => setReturnOpen(true)}><Icon name="RotateCcw" size={14} />{t('Return items')}</button>}
              <a className="btn sm outline" href={`https://wa.me/${brand.supportPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I need help with order #${o.id}`)}`} target="_blank" rel="noreferrer"><Icon name="MessageCircle" size={14} />{t('Help')}</a>
              {!isActive(o) && <button className="btn sm outline" onClick={() => { o.items.forEach((i) => setQty(i.productId, i.variantId, i.qty)); notify('Items added to cart'); }}><Icon name="RotateCw" size={14} />{t('Reorder')}</button>}
            </div>
          </section>

          <section className="glass card list">
            {o.items.map((i) => (
              <div key={i.key}>
                <div className="grow">
                  <div className="small" style={{ fontWeight: 600 }}>{i.name}</div>
                  <div className="xs muted">{i.brand} · {i.variant} · Qty {i.qty}</div>
                </div>
                <div className="small" style={{ fontWeight: 600 }}>{money(i.price * i.qty)}</div>
              </div>
            ))}
          </section>
        </div>
        <div className="col sticky" style={{ gap: 14 }}>
          <div className="bill glass">
            <h3>Payment</h3>
            <div className="r"><span>Item total</span><span>{money(o.bill.itemTotal)}</span></div>
            <div className="r"><span>Delivery</span><span>{o.bill.delivery ? money(o.bill.delivery) : 'FREE'}</span></div>
            <div className="r"><span>Handling</span><span>{money(o.bill.handling)}</span></div>
            {o.bill.loading > 0 && <div className="r"><span>Loading</span><span>{money(o.bill.loading)}</span></div>}
            {o.bill.discount > 0 && <div className="r green"><span>Coupon</span><span>−{money(o.bill.discount)}</span></div>}
            {o.bill.wallet > 0 && <div className="r green"><span>Credit</span><span>−{money(o.bill.wallet)}</span></div>}
            <div className="r total"><span>{o.payment.method === 'cod' && o.payment.status !== 'paid' ? 'To pay on delivery' : 'Paid'}</span><span>{money(o.bill.total)}</span></div>
            <div className="small muted">{methodLabel(o.payment.method)}{o.payment.ref ? ` · ${o.payment.ref}` : ''}</div>
          </div>
          <div className="glass card" style={{ padding: 16 }}>
            <h3 style={{ marginBottom: 6 }}>Delivery address</h3>
            <div className="small muted">{[o.address.name, o.address.line1, o.address.line2, o.address.landmark, o.address.city, o.address.pincode].filter(Boolean).join(', ')}</div>
            <div className="small muted">{o.address.phone}</div>
            {o.note && <div className="small" style={{ marginTop: 8 }}>Note: {o.note}</div>}
          </div>
          <Link className="btn outline block" to={`/orders/${o.id}/invoice`}><Icon name="Download" size={18} />{t('GST invoice')}</Link>
        </div>
      </div>
      <CancelSheet open={cancelOpen} onClose={() => setCancelOpen(false)} order={o} onDone={(x) => { setO(x); setCancelOpen(false); notify('Order cancelled'); }} />
      <ReturnSheet open={returnOpen} onClose={() => setReturnOpen(false)} order={o} onDone={(x) => { setO(x); setReturnOpen(false); notify('Return requested'); }} />
    </div>
  );
}

export const methodLabel = (m) => ({ upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet', cod: 'Pay on delivery', wallet_credit: 'BuildRun Credit' })[m] || m;

function CancelSheet({ open, onClose, order, onDone }) {
  const { user } = useStore();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const reasons = ['Ordered by mistake', 'Need to change items', 'Delivery time too long', 'Found a better price', 'Other'];
  return (
    <Sheet open={open} onClose={onClose} title="Cancel order?">
      <div className="col">
        {reasons.map((r) => <button key={r} className={`radio ${reason === r ? 'on' : ''}`} onClick={() => setReason(r)}><span className="dot" />{r}</button>)}
        <p className="small muted">
          {order.payment.status === 'paid' && order.bill.total > 0
            ? refundDestination(order) === 'wallet' ? 'Your payment will be added to your BuildRun Credit.' : `${money(order.bill.total)} will be refunded to your original payment method.`
            : 'Nothing has been charged for this order.'}
        </p>
        <button className="btn danger block" disabled={!reason || busy} onClick={async () => { setBusy(true); try { onDone(await api.cancelOrder(user, order.id, reason)); } finally { setBusy(false); } }}>
          {busy ? 'Cancelling…' : 'Cancel order'}
        </button>
      </div>
    </Sheet>
  );
}

function ReturnSheet({ open, onClose, order, onDone }) {
  const { user } = useStore();
  const eligible = order.items.filter((i) => i.returnable);
  const [sel, setSel] = useState([]);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const reasons = ['Damaged in transit', 'Defective / not working', 'Wrong item delivered', 'Item missing'];
  const amount = returnAmount({ ...order, returnRequest: { itemIds: sel } });
  return (
    <Sheet open={open} onClose={onClose} title="Return items">
      <div className="col">
        <p className="small muted">Select the items to return. They should be unused and in their original packaging.</p>
        {eligible.map((i) => (
          <label key={i.key} className={`radio ${sel.includes(i.key) ? 'on' : ''}`}>
            <input type="checkbox" className="check" checked={sel.includes(i.key)} onChange={() => setSel((s) => (s.includes(i.key) ? s.filter((x) => x !== i.key) : [...s, i.key]))} />
            <span className="grow"><b className="small">{i.name}</b><div className="xs muted">{i.variant} · Qty {i.qty}</div></span>
            <span className="small">{money(i.price * i.qty)}</span>
          </label>
        ))}
        {order.items.length > eligible.length && <p className="xs faint">Some items in this order are non-returnable.</p>}
        <h3 style={{ marginTop: 6 }}>Reason</h3>
        {reasons.map((r) => <button key={r} className={`radio ${reason === r ? 'on' : ''}`} onClick={() => setReason(r)}><span className="dot" />{r}</button>)}
        <textarea className="input" placeholder="Tell us more (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        {sel.length > 0 && <p className="small">Refund of <b>{money(amount)}</b> {refundDestination(order) === 'wallet' ? 'as BuildRun Credit' : 'to your original payment method'} after pickup.</p>}
        <button className="btn primary block" disabled={!sel.length || !reason || busy} onClick={async () => { setBusy(true); try { onDone(await api.requestReturn(user, order.id, { itemIds: sel, reason, note })); } finally { setBusy(false); } }}>
          Request return
        </button>
      </div>
    </Sheet>
  );
}

export function Invoice() {
  const { id } = useParams();
  const { user } = useStore();
  const [o, setO] = useState(null);
  useEffect(() => { api.getOrder(user, id).then(setO); }, [user, id]);
  if (!o) return <div className="page" />;
  const fees = o.bill.delivery + o.bill.handling + o.bill.loading;
  const rows = [
    ...o.items.map((i) => ({ desc: `${i.name} (${i.brand}, ${i.variant})`, qty: i.qty, rate: i.price, amount: i.price * i.qty })),
    ...(fees ? [{ desc: 'Delivery, handling & loading charges', qty: 1, rate: fees, amount: fees }] : []),
    ...(o.bill.discount ? [{ desc: `Discount (${o.bill.coupon})`, qty: 1, rate: -o.bill.discount, amount: -o.bill.discount }] : []),
  ];
  const gross = rows.reduce((s, r) => s + r.amount, 0);
  const g = gstBreakup(gross);
  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="row no-print" style={{ marginBottom: 16 }}>
        <BackHeader title="Tax invoice" />
      </div>
      <div className="glass card" style={{ padding: 24 }}>
        <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="logo"><img src="/icon.svg" alt="" width="28" />{brand.name}</div>
            <div className="small muted" style={{ marginTop: 6 }}>{brand.legalName}<br />{brand.address}<br />GSTIN: {brand.gstin}</div>
          </div>
          <div className="small" style={{ textAlign: 'right' }}>
            <h2>Tax Invoice</h2>
            <div>Invoice #: INV-{o.id}</div>
            <div>Date: {new Date(o.createdAt).toLocaleDateString('en-IN')}</div>
            <div>Order #: {o.id}</div>
          </div>
        </div>
        <div className="small" style={{ margin: '20px 0' }}>
          <b>Billed to</b><br />
          {o.businessName || o.address.name}<br />
          {[o.address.line1, o.address.line2, o.address.city, o.address.pincode].filter(Boolean).join(', ')}<br />
          {o.gstin && <>GSTIN: {o.gstin}<br /></>}
          Phone: {o.address.phone}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="t">
            <thead><tr><th>#</th><th>Description</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.desc}</td><td className="num">{r.qty}</td><td className="num">{money2(r.rate)}</td><td className="num">{money2(r.amount)}</td></tr>)}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} className="num">Taxable value</td><td className="num">{money2(g.taxable)}</td></tr>
              <tr><td colSpan={4} className="num">CGST @ {(rules.gstRate * 50).toFixed(0)}%</td><td className="num">{money2(g.cgst)}</td></tr>
              <tr><td colSpan={4} className="num">SGST @ {(rules.gstRate * 50).toFixed(0)}%</td><td className="num">{money2(g.sgst)}</td></tr>
              <tr><td colSpan={4} className="num"><b>Invoice total</b></td><td className="num"><b>{money2(gross)}</b></td></tr>
              {o.bill.wallet > 0 && <tr><td colSpan={4} className="num">Paid with credit</td><td className="num">−{money2(o.bill.wallet)}</td></tr>}
              <tr><td colSpan={4} className="num">Paid via {methodLabel(o.payment.method)}</td><td className="num">{money2(o.bill.total)}</td></tr>
            </tfoot>
          </table>
        </div>
        <p className="xs muted" style={{ marginTop: 16 }}>Prices are inclusive of GST. A single rate is shown for simplicity; configure per-item HSN codes and rates before launch. This is a computer-generated invoice.</p>
      </div>
      <div className="row no-print" style={{ marginTop: 16 }}>
        <button className="btn dark" onClick={() => window.print()}><Icon name="Printer" size={18} />Print / Save as PDF</button>
      </div>
    </div>
  );
}
