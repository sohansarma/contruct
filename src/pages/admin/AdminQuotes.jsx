import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { dateTime } from '../../lib/format.js';
import { Empty } from '../../components/ui.jsx';
import { AdminHeader } from './AdminLayout.jsx';

const STATES = [['new', 'New'], ['contacted', 'Contacted'], ['won', 'Won'], ['lost', 'Lost']];

export default function AdminQuotes() {
  const { notify } = useStore();
  const [list, setList] = useState(null);
  const load = () => api.admin.quotes().then(setList).catch((e) => notify(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = async (q, status) => { try { await api.admin.updateQuote(q.id, { status, note: q.note || '' }); load(); } catch (e) { notify(e.message); } };
  return (
    <>
      <AdminHeader title="Bulk quotes" sub="Call back fast — these are your biggest orders" />
      <div className="col">
        {(list || []).map((q) => (
          <div key={q.id} className="glass card" style={{ padding: 16 }}>
            <div className="row between wrap">
              <b>{q.name} · <a className="link" href={`tel:${q.phone}`}>{q.phone}</a></b>
              <span className="small muted">{dateTime(q.at)}</span>
            </div>
            <div className="small muted">Pincode {q.pincode || '—'} · Needed {q.when}</div>
            <pre className="small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '8px 0' }}>{q.items}</pre>
            <div className="seg" style={{ maxWidth: 420 }}>
              {STATES.map(([v, l]) => <button key={v} className={(q.status || 'new') === v ? 'on' : ''} onClick={() => set(q, v)}>{l}</button>)}
            </div>
          </div>
        ))}
        {list && !list.length && <Empty icon="Inbox" title="No bulk requests yet" />}
      </div>
    </>
  );
}
