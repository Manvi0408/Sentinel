import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useConsole } from '../components/Console.jsx';
import { inr } from '../lib/format.js';
import { IconReceipt } from '../components/Icons.jsx';

// B2B receivables chaser — overdue invoices synthesised from the batch's larger
// tickets, with a promise-to-pay tracker.
const NEXT_ACTION = ['WhatsApp reminder', 'Payment link sent', 'Voice call scheduled', 'Escalate to owner', 'Promise-to-pay follow-up'];
const CHASER = [
  { t: 'Reminder sent', c: 'bg-accent-soft text-accent-ink border-accent/20' },
  { t: 'Awaiting', c: 'bg-warn-soft text-warn border-warn/20' },
  { t: 'Promise-to-pay', c: 'bg-good-soft text-good border-good/20' },
  { t: 'Escalated', c: 'bg-stop-soft text-stop border-stop/20' },
];

export default function Receivables() {
  const { refreshKey } = useConsole();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.payments().then((p) => {
      const overdue = p
        .filter((r) => r.amountRs >= 2000)
        .slice(0, 12)
        .map((r, i) => ({
          id: r.id,
          inv: `INV-${9200 + i}`,
          customer: r.customerName,
          due: r.amountRs,
          daysOverdue: 3 + ((i * 7) % 40),
          next: NEXT_ACTION[i % NEXT_ACTION.length],
          chaser: CHASER[i % CHASER.length],
          ptp: i % 3 === 0,
        }));
      setRows(overdue);
    });
  }, [refreshKey]);

  const total = useMemo(() => rows.reduce((s, r) => s + r.due, 0), [rows]);
  const ptp = rows.filter((r) => r.ptp).length;

  return (
    <div className="p-6 max-w-[1180px] mx-auto space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[10px] bg-warn-soft text-warn grid place-items-center"><IconReceipt size={18} /></span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">Receivables</h1>
          <p className="text-[13px] text-muted">Overdue B2B invoices, chaser status, and the promise-to-pay tracker.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Kpi label="Total overdue" value={inr(total)} tone="stop" />
        <Kpi label="Open invoices" value={rows.length} />
        <Kpi label="Promise-to-pay" value={ptp} tone="good" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-surface/60">
                <th className="th">Invoice</th>
                <th className="th">Customer</th>
                <th className="th text-right">Amount due</th>
                <th className="th text-right">Days overdue</th>
                <th className="th">Next action</th>
                <th className="th">Chaser status</th>
                <th className="th">P2P</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-hairline2 last:border-0 hover:bg-surface/60">
                  <td className="td font-mono text-2xs text-muted">{r.inv}</td>
                  <td className="td font-medium">{r.customer}</td>
                  <td className="td text-right tabular-nums font-medium">{inr(r.due)}</td>
                  <td className={`td text-right tabular-nums ${r.daysOverdue > 20 ? 'text-stop' : 'text-muted'}`}>{r.daysOverdue}d</td>
                  <td className="td text-muted">{r.next}</td>
                  <td className="td"><span className={`chip ${r.chaser.c}`}>{r.chaser.t}</span></td>
                  <td className="td">{r.ptp ? <span className="chip bg-good-soft text-good border-good/20">Yes</span> : <span className="text-faint">—</span>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-14 text-center text-[13px] text-faint">No receivables — re-seed a batch.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const c = tone === 'good' ? 'text-good' : tone === 'stop' ? 'text-stop' : 'text-ink';
  return (
    <div className="card p-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`mt-1.5 text-[24px] font-semibold tracking-tight2 tabular-nums ${c}`}>{value}</div>
    </div>
  );
}
