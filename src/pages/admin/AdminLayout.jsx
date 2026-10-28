import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { api, mode } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { Empty, Icon } from '../../components/ui.jsx';
import Dashboard from './Dashboard.jsx';
import AdminOrders from './AdminOrders.jsx';
import AdminProducts from './AdminProducts.jsx';
import ProductEdit from './ProductEdit.jsx';
import AdminCategories from './AdminCategories.jsx';
import AdminOffers from './AdminOffers.jsx';
import AdminCustomers from './AdminCustomers.jsx';
import AdminQuotes from './AdminQuotes.jsx';
import AdminSettings from './AdminSettings.jsx';

const NAV = [
  ['', 'Dashboard', 'LayoutDashboard'],
  ['orders', 'Orders', 'Package'],
  ['products', 'Products', 'Boxes'],
  ['categories', 'Categories', 'LayoutGrid'],
  ['offers', 'Offers & banners', 'BadgePercent'],
  ['customers', 'Customers', 'Users'],
  ['quotes', 'Bulk quotes', 'Truck'],
  ['settings', 'Settings', 'Settings'],
];

/** Orders waiting on the store: new, in progress or returns to review. Polls every 30 s. */
function usePending(enabled) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled || mode === 'demo') return;
    const base = document.title.replace(/^\(\d+\) /, '');
    const load = () => api.admin.stats().then((s) => {
      const count = s.active + s.returns;
      setN(count);
      document.title = count ? `(${count}) ${base}` : base;
    }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { clearInterval(t); document.title = base; };
  }, [enabled]);
  return n;
}

export default function AdminLayout() {
  const { user, ready } = useStore();
  const pending = usePending(!!user?.isAdmin);
  if (!ready) return null;
  if (!user?.isAdmin) {
    return (
      <div className="page">
        <Empty icon="ShieldX" title="Admins only" text={mode === 'demo' ? 'In demo mode, log in with 0000000000 to see orders. Product, offer and settings management needs the live server.' : 'Ask an existing admin to give your number admin access (Admin → Customers), or add it to ADMIN_PHONES.'} />
      </div>
    );
  }
  return (
    <div className="page admin">
      <nav className="admin-nav glass" aria-label="Admin">
        {NAV.map(([to, label, icon]) => (
          <NavLink key={to} to={`/admin/${to}`} end={to === ''}><Icon name={icon} size={18} /><span>{label}</span>{to === 'orders' && pending > 0 && <span className="badge" aria-label={`${pending} orders need action`}>{pending}</span>}</NavLink>
        ))}
      </nav>
      <div className="admin-main">
        {mode === 'demo' && <div className="banner warn small" style={{ marginBottom: 14 }}><Icon name="FlaskConical" size={16} />Demo mode: connect the server to manage products, offers and settings.</div>}
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<ProductEdit />} />
          <Route path="products/:id" element={<ProductEdit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="offers" element={<AdminOffers />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="quotes" element={<AdminQuotes />} />
          <Route path="settings" element={<AdminSettings />} />
        </Routes>
      </div>
    </div>
  );
}

export function AdminHeader({ title, sub, right }) {
  return (
    <div className="row between wrap" style={{ marginBottom: 16, alignItems: 'flex-end' }}>
      <div><h1 style={{ fontSize: 28 }}>{title}</h1>{sub && <p className="small muted" style={{ marginTop: 4 }}>{sub}</p>}</div>
      {right && <div className="row wrap">{right}</div>}
    </div>
  );
}
