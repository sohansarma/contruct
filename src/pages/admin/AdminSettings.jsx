import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { parsePincodes } from '../../config.js';
import { AdminHeader } from './AdminLayout.jsx';

export default function AdminSettings() {
  const { notify, reloadCatalog } = useStore();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.admin.settings().then(setS).catch((e) => notify(e.message)); }, [notify]);
  if (!s) return <AdminHeader title="Settings" sub="Loading…" />;

  const b = (k) => ({ value: s.brand[k] ?? '', onChange: (e) => setS({ ...s, brand: { ...s.brand, [k]: e.target.value } }) });
  const r = (k) => ({ value: s.rules[k] ?? '', onChange: (e) => setS({ ...s, rules: { ...s.rules, [k]: e.target.value } }) });
  const pinCount = parsePincodes(s.rules.pincodes).size;

  const save = async () => {
    setBusy(true);
    try {
      const rules = { ...s.rules };
      for (const k of ['freeDeliveryAbove', 'deliveryFee', 'handlingFee', 'heavyItemFee', 'cancelWindowMin', 'returnWindowHours', 'etaMin', 'etaMax']) rules[k] = Number(rules[k]);
      rules.gstRate = Number(rules.gstRate);
      rules.scheduledSlots = typeof rules.scheduledSlots === 'string' ? rules.scheduledSlots.split('\n') : rules.scheduledSlots;
      rules.codPincodes = typeof rules.codPincodes === 'string' ? rules.codPincodes.split(/[\s,]+/).filter(Boolean) : rules.codPincodes;
      const next = await api.admin.saveSettings({ brand: s.brand, rules });
      setS(next); reloadCatalog(); notify('Settings saved');
    } catch (e) { notify(e.message); } finally { setBusy(false); }
  };
  const slots = Array.isArray(s.rules.scheduledSlots) ? s.rules.scheduledSlots.join('\n') : s.rules.scheduledSlots;
  const cod = Array.isArray(s.rules.codPincodes) ? s.rules.codPincodes.join(', ') : s.rules.codPincodes;

  return (
    <>
      <AdminHeader title="Settings" sub="Changes apply to the shop and apps immediately" right={<button className="btn sm primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>} />
      <div className="settings-grid">
        <section className="glass card col" style={{ padding: 18, gap: 12 }}>
          <h3>Store</h3>
          <div className="grid2">
            <label className="field"><span>Store name</span><input className="input" {...b('name')} /></label>
            <label className="field"><span>City</span><input className="input" {...b('city')} /></label>
          </div>
          <label className="field"><span>Tagline</span><input className="input" {...b('tagline')} /></label>
          <div className="grid2">
            <label className="field"><span>Support phone</span><input className="input" {...b('supportPhone')} /></label>
            <label className="field"><span>Support email</span><input className="input" {...b('supportEmail')} /></label>
          </div>
          <h3 style={{ marginTop: 6 }}>Invoice details</h3>
          <label className="field"><span>Legal name</span><input className="input" {...b('legalName')} /></label>
          <div className="grid2">
            <label className="field"><span>GSTIN</span><input className="input" {...b('gstin')} /></label>
            <label className="field"><span>GST rate (0.18 = 18%)</span><input className="input" type="number" step="0.01" {...r('gstRate')} /></label>
          </div>
          <label className="field"><span>Invoice number prefix (up to 4 letters)</span><input className="input" {...b('invoicePrefix')} maxLength={4} /></label>
          <label className="field"><span>Registered address</span><input className="input" {...b('address')} /></label>
        </section>

        <section className="glass card col" style={{ padding: 18, gap: 12 }}>
          <h3>Fees</h3>
          <div className="grid2">
            <label className="field"><span>Delivery fee ₹</span><input className="input" type="number" min="0" {...r('deliveryFee')} /></label>
            <label className="field"><span>Free delivery above ₹</span><input className="input" type="number" min="0" {...r('freeDeliveryAbove')} /></label>
            <label className="field"><span>Handling fee ₹ / order</span><input className="input" type="number" min="0" {...r('handlingFee')} /></label>
            <label className="field"><span>Loading fee ₹ / heavy unit</span><input className="input" type="number" min="0" {...r('heavyItemFee')} /></label>
          </div>
          <h3 style={{ marginTop: 6 }}>Delivery & orders</h3>
          <div className="grid2">
            <label className="field"><span>Delivery time from (min)</span><input className="input" type="number" min="5" {...r('etaMin')} /></label>
            <label className="field"><span>Delivery time to (min)</span><input className="input" type="number" min="5" {...r('etaMax')} /></label>
            <label className="field"><span>Free cancellation (minutes)</span><input className="input" type="number" min="0" {...r('cancelWindowMin')} /></label>
            <label className="field"><span>Return window (hours)</span><input className="input" type="number" min="0" {...r('returnWindowHours')} /></label>
          </div>
          <label className="field"><span>Scheduled delivery slots (one per line)</span><textarea className="input" rows={6} value={slots} onChange={(e) => setS({ ...s, rules: { ...s.rules, scheduledSlots: e.target.value } })} /></label>
        </section>

        <section className="glass card col" style={{ padding: 18, gap: 12 }}>
          <h3>Delivery area</h3>
          <div className="field">
            <label>Pincodes we deliver to · {pinCount} pincodes</label>
            <textarea className="input" rows={5} {...r('pincodes')} />
            <span className="xs muted">Single pincodes or ranges, separated by commas. Put a minus before a pincode to exclude it: <code>560001-560110, 562125, -560088</code></span>
          </div>
          <div className="field">
            <label>Pay on delivery only in these pincodes (leave empty for all)</label>
            <textarea className="input" rows={3} value={cod} onChange={(e) => setS({ ...s, rules: { ...s.rules, codPincodes: e.target.value } })} />
          </div>
        </section>
      </div>
    </>
  );
}
