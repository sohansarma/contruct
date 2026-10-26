import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { money } from '../../lib/format.js';
import { Icon } from '../../components/ui.jsx';
import { AdminHeader } from './AdminLayout.jsx';

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.admin.stats().then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <><AdminHeader title="Dashboard" /><div className="banner warn small">{err}</div></>;
  if (!s) return <AdminHeader title="Dashboard" sub="Loading…" />;
  const maxRev = Math.max(1, ...s.days.map((d) => d.revenue));
  const cards = [
    ['ShoppingCart', `${s.today.orders}`, 'orders today', '/admin/orders'],
    ['IndianRupee', money(s.today.revenue), 'sales today', '/admin/orders'],
    ['Activity', `${s.active}`, 'orders in progress', '/admin/orders'],
    ['RotateCcw', `${s.returns}`, 'returns to review', '/admin/orders'],
    ['Truck', `${s.quotes}`, 'new bulk quotes', '/admin/quotes'],
    ['PackageX', `${s.lowStock}`, 'out of stock', '/admin/products'],
    ['Boxes', `${s.products}`, 'live products', '/admin/products'],
    ['Users', `${s.customers}`, 'customers', '/admin/customers'],
  ];
  return (
    <>
      <AdminHeader title="Dashboard" sub="Today at a glance" right={<><Link className="btn sm primary" to="/admin/products/new"><Icon name="Plus" size={16} />Add product</Link><Link className="btn sm outline" to="/admin/offers"><Icon name="BadgePercent" size={16} />New offer</Link></>} />
      <div className="stat-grid">
        {cards.map(([icon, v, l, to]) => (
          <Link key={l} to={to} className="glass card stat"><Icon name={icon} size={20} className="accent" /><b>{v}</b><span className="small muted">{l}</span></Link>
        ))}
      </div>
      <div className="two-col" style={{ marginTop: 18 }}>
        <section className="glass card" style={{ padding: 18 }}>
          <h3 style={{ marginBottom: 12 }}>Sales, last 14 days</h3>
          {s.days.length ? (
            <div className="bars" role="img" aria-label="Daily sales chart">
              {s.days.map((d) => (
                <div key={d._id} className="bar" title={`${d._id}: ${money(d.revenue)} · ${d.orders} orders`}>
                  <div style={{ height: `${(d.revenue / maxRev) * 100}%` }} />
                  <span className="xs faint">{d._id.slice(8)}</span>
                </div>
              ))}
            </div>
          ) : <p className="small muted">No orders yet.</p>}
        </section>
        <section className="glass card list">
          <div><b className="grow">Top products, 30 days</b></div>
          {s.top.map((t) => (
            <Link key={t._id} to={`/admin/products/${t._id}`}><span className="grow small">{t.name}</span><span className="xs muted">{t.qty} sold</span><b className="small">{money(t.revenue)}</b></Link>
          ))}
          {!s.top.length && <div className="small muted">Sales will appear here.</div>}
        </section>
      </div>
    </>
  );
}
