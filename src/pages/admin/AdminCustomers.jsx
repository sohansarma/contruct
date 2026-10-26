import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { money } from '../../lib/format.js';
import { Sheet } from '../../components/ui.jsx';
import { AdminHeader } from './AdminLayout.jsx';

export default function AdminCustomers() {
  const { notify, user } = useStore();
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [credit, setCredit] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => api.admin.customers(q).then(setList).catch((e) => notify(e.message)), 250);
    return () => clearTimeout(t);
  }, [q, notify]);
  const reload = () => api.admin.customers(q).then(setList);

  const giveCredit = async (e) => {
    e.preventDefault();
    try { await api.admin.adjustWallet(credit.id, +credit.amount, credit.note); notify('Credit updated'); setCredit(null); reload(); } catch (x) { notify(x.message); }
  };
  const toggleAdmin = async (c) => {
    if (!window.confirm(c.isAdmin ? `Remove admin access for ${c.phone}?` : `Give ${c.phone} full admin access?`)) return;
    try { await api.admin.setAdmin(c.id, !c.isAdmin); reload(); } catch (x) { notify(x.message); }
  };

  return (
    <>
      <AdminHeader title="Customers" sub={list ? `${list.length} shown` : 'Loading…'} />
      <input className="input" style={{ maxWidth: 320, marginBottom: 12 }} placeholder="Search phone or name" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="glass card" style={{ overflowX: 'auto', padding: 6 }}>
        <table className="t">
          <thead><tr><th>Customer</th><th>Business</th><th className="num">Orders</th><th className="num">Spent</th><th className="num">Credit</th><th>Joined</th><th /></tr></thead>
          <tbody>
            {(list || []).map((c) => (
              <tr key={c.id}>
                <td><b className="small">{c.name || '—'}</b>{c.isAdmin && <span className="status-pill live" style={{ marginLeft: 6 }}>Admin</span>}<div className="xs faint"><a href={`tel:${c.phone}`}>{c.phone}</a></div></td>
                <td className="small">{c.businessName || '—'}{c.gstin && <div className="xs faint">{c.gstin}</div>}</td>
                <td className="num">{c.orders}</td>
                <td className="num">{money(c.spent)}</td>
                <td className="num">{money(c.wallet)}</td>
                <td className="small">{new Date(c.joined).toLocaleDateString('en-IN')}</td>
                <td><div className="row" style={{ gap: 6 }}>
                  <button className="btn sm outline" onClick={() => setCredit({ ...c, amount: '', note: '' })}>Credit</button>
                  {c.id !== user.id && <button className="btn sm ghost" onClick={() => toggleAdmin(c)}>{c.isAdmin ? 'Remove admin' : 'Make admin'}</button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Sheet open={!!credit} onClose={() => setCredit(null)} title={`Credit for ${credit?.name || credit?.phone}`}>
        {credit && (
          <form className="col" onSubmit={giveCredit}>
            <p className="small muted">Current balance {money(credit.wallet)}. Use a negative amount to deduct.</p>
            <label className="field"><span>Amount ₹</span><input className="input" type="number" value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} required /></label>
            <label className="field"><span>Reason (shown to the customer)</span><input className="input" value={credit.note} onChange={(e) => setCredit({ ...credit, note: e.target.value })} placeholder="Goodwill credit for late delivery" /></label>
            <button className="btn primary block">Save</button>
          </form>
        )}
      </Sheet>
    </>
  );
}
