import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useConsole } from '../components/Console.jsx';
import { inr } from '../lib/format.js';
import { IconReceipt, IconCheck, IconRefresh } from '../components/Icons.jsx';

const STATUS = {
  pending: { label: 'Pending', cls: 'bg-accent-soft text-accent-ink border-accent/20' },
  kept: { label: 'Kept ✓', cls: 'bg-good-soft text-good border-good/20' },
  overdue: { label: 'Overdue', cls: 'bg-stop-soft text-stop border-stop/20' },
};

export default function Promises() {
  const { refreshKey } = useConsole();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [remindedId, setRemindedId] = useState(null);

  const load = () => api.promises().then(setRows).catch(() => {});
  useEffect(() => { load(); }, [refreshKey]);

  const seed = async () => { setBusy(true); await api.seedPromises().catch(() => {}); await load(); setBusy(false); };
  const remind = async (r) => {
    setRemindedId(r.paymentId);
    await api.callTool('send_whatsapp', { paymentId: r.paymentId }).catch(() => {});
    setTimeout(() => setRemindedId(null), 2200);
  };

  const k = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.amountRs, 0);
    return {
      total,
      pending: rows.filter((r) => r.status === 'pending').length,
      kept: rows.filter((r) => r.status === 'kept').length,
      overdue: rows.filter((r) => r.status === 'overdue').length,
    };
  }, [rows]);

  return (
    <div className="p-6 max-w-[1180px] mx-auto space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[10px] bg-accent-soft text-accent grid place-items-center"><IconReceipt size={18} /></span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">Promise-to-Pay Tracker</h1>
          <p className="text-[13px] text-muted">Customers who committed to a date — tracked to kept, pending, or overdue.</p>
        </div>
        <button onClick={seed} disabled={busy} className="ml-auto chip h-8 px-3 bg-ink text-white border-ink hover:brightness-110 disabled:opacity-50">
          <IconRefresh size={13} /> {busy ? 'Logging…' : 'Log demo promises'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="₹ promised" value={inr(k.total)} tone="ink" />
        <Kpi label="Pending" value={k.pending} tone="accent" />
        <Kpi label="Kept" value={k.kept} tone="good" />
        <Kpi label="Overdue" value={k.overdue} tone="stop" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-muted border-b border-hairline">
              <th className="font-medium px-4 py-3">Customer</th>
              <th className="font-medium px-4 py-3">Amount</th>
              <th className="font-medium px-4 py-3">Promised by</th>
              <th className="font-medium px-4 py-3">Status</th>
              <th className="font-medium px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const st = STATUS[r.status];
              return (
                <tr key={r.paymentId} className="border-b border-hairline last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3 font-medium">{r.customerName}</td>
                  <td className="px-4 py-3 tabular-nums">{inr(r.amountRs)}</td>
                  <td className="px-4 py-3 tabular-nums">{new Date(r.by).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3"><span className={`chip h-6 px-2 text-[11px] ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'kept' ? (
                      <span className="inline-flex items-center gap-1 text-good text-[12px]"><IconCheck size={13} /> Paid</span>
                    ) : remindedId === r.paymentId ? (
                      <span className="text-good text-[12px]">Reminder sent ✓</span>
                    ) : (
                      <button onClick={() => remind(r)} className="chip h-7 px-3 bg-canvas text-ink border-hairline hover:bg-surface">Send reminder</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted text-[13px]">No promises logged yet — click <b>Log demo promises</b> to populate.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const c = { good: 'text-good', stop: 'text-stop', accent: 'text-accent', ink: 'text-ink' }[tone] || 'text-ink';
  return (
    <div className="card p-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`mt-1.5 text-[24px] font-semibold tracking-tight2 tabular-nums ${c}`}>{value}</div>
    </div>
  );
}
