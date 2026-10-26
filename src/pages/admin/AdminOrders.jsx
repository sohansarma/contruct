import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { dateTime, money } from '../../lib/format.js';
import { STATUS } from '../../lib/orderLogic.js';
import { Empty, Sheet } from '../../components/ui.jsx';
import { StatusPill, methodLabel } from '../Orders.jsx';
import { AdminHeader } from './AdminLayout.jsx';

const NEXT = { placed: ['confirmed', 'cancelled'], confirmed: ['packed', 'cancelled'], packed: ['out_for_delivery', 'cancelled'], out_for_delivery: ['delivered', 'cancelled'], return_requested: ['returned', 'delivered'] };
const FILTERS = [['active', 'Needs action'], ['', 'All'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['returned', 'Returned']];
const ACTION = { confirmed: 'Confirm', packed: 'Mark packed', out_for_delivery: 'Dispatch', delivered: 'Mark delivered', cancelled: 'Cancel', returned: 'Approve return' };

export default function AdminOrders() {
  const { notify } = useStore();
  const [orders, setOrders] = useState(null);
  const [status, setStatus] = useState('active');
  const [q, setQ] = useState('');
  const [dispatch, setDispatch] = useState(null);
  const [rider, setRider] = useState({ name: '', phone: '', vehicle: 'Mini-truck' });
  const load = useCallback(() => api.admin.orders(q ? { status, q } : { status }).then(setOrders).catch((e) => notify(e.message)), [status, q, notify]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const move = async (o, s, extra) => {
    if (s === 'cancelled' && !window.confirm(`Cancel order #${o.id}? The customer is refunded automatically.`)) return;
    try { await api.admin.setStatus(o.id, s, extra); notify(`#${o.id}: ${STATUS[s].label}`); load(); } catch (e) { notify(e.message); }
  };

  return (
    <>
      <AdminHeader title="Orders" sub="Updates every 20 seconds" />
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <div className="chips">{FILTERS.map(([v, l]) => <button key={l} className={`chip ${status === v ? 'on' : ''}`} onClick={() => setStatus(v)}>{l}</button>)}</div>
        <input className="input grow" style={{ maxWidth: 280 }} placeholder="Order #, phone or name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="glass card" style={{ overflowX: 'auto', padding: 6 }}>
        <table className="t">
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Slot</th><th className="num">Total</th><th>Status</th><th>Next step</th></tr></thead>
          <tbody>
            {(orders || []).map((o) => (
              <tr key={o.id}>
                <td><Link className="link" to={`/orders/${o.id}`}>#{o.id}</Link><div className="xs faint">{dateTime(o.createdAt)}</div></td>
                <td>{o.address.name}<div className="xs faint"><a href={`tel:${o.address.phone}`}>{o.address.phone}</a> · {o.address.pincode}</div></td>
                <td className="small">{o.items.map((i) => `${i.qty}× ${i.name} (${i.variant})`).join(', ')}{o.note && <div className="xs accent">Note: {o.note}</div>}</td>
                <td className="small">{o.slot === 'asap' ? 'Express' : o.slot}</td>
                <td className="num">{money(o.bill.total)}<div className="xs faint">{methodLabel(o.payment.method)} · {o.payment.status}</div></td>
                <td><StatusPill status={o.status} />{o.refund && <div className="xs green">Refund {money(o.refund.amount)} → {o.refund.to}</div>}</td>
                <td><div className="row wrap" style={{ gap: 6 }}>{(NEXT[o.status] || []).map((s) => (
                  <button key={s} className={`btn sm ${s === 'cancelled' ? 'danger' : 'outline'}`} onClick={() => (s === 'out_for_delivery' ? setDispatch(o) : move(o, s))}>{ACTION[s]}</button>
                ))}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders && !orders.length && <Empty icon="Inbox" title="Nothing here" text="New orders show up automatically." />}
      </div>
      <Sheet open={!!dispatch} onClose={() => setDispatch(null)} title={`Dispatch #${dispatch?.id}`}>
        <form className="col" onSubmit={(e) => { e.preventDefault(); move(dispatch, 'out_for_delivery', { rider }); setDispatch(null); }}>
          <label className="field"><span>Delivery partner name</span><input className="input" value={rider.name} onChange={(e) => setRider({ ...rider, name: e.target.value })} required /></label>
          <label className="field"><span>Phone</span><input className="input" inputMode="tel" value={rider.phone} onChange={(e) => setRider({ ...rider, phone: e.target.value })} required /></label>
          <label className="field"><span>Vehicle</span><input className="input" value={rider.vehicle} onChange={(e) => setRider({ ...rider, vehicle: e.target.value })} /></label>
          <button className="btn primary block">Dispatch now</button>
        </form>
      </Sheet>
    </>
  );
}
