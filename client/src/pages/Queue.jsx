import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConsole } from '../components/Console.jsx';
import { api } from '../api.js';
import { inr, ACTION_LABEL } from '../lib/format.js';
import { StatusBadge, ClassTag, Confidence } from '../components/ui.jsx';
import { IconSearch } from '../components/Icons.jsx';

const FILTERS = ['all', 'recovered', 'retrying', 'link_sent', 'stopped'];

export default function Queue() {
  const { refreshKey } = useConsole();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.payments().then(setRows).catch(() => {});
  }, [refreshKey]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (q && !`${r.customerName} ${r.failureLabel} ${r.diagnosisClass || ''}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [rows, q, filter]);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="p-6 max-w-[1180px] mx-auto space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">Recovery queue</h1>
          <p className="text-[13px] text-muted mt-0.5">
            Every at-risk payment, its diagnosis, the chosen bounded action, and where it landed.
          </p>
        </div>
        <div className="relative">
          <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            className="input pl-9 w-64"
            placeholder="Search customer, reason, class…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* filter tabs */}
      <div className="flex items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`chip h-7 px-2.5 capitalize ${
              filter === f ? 'bg-ink text-white border-ink' : 'bg-canvas text-muted border-hairline hover:bg-surface'
            }`}
          >
            {f.replace('_', ' ')}
            <span className={filter === f ? 'text-white/60' : 'text-faint'}>{counts[f] || 0}</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-surface/60">
                <th className="th w-12 text-center">#</th>
                <th className="th">Amount</th>
                <th className="th">Customer</th>
                <th className="th">Failure reason</th>
                <th className="th">Diagnosis</th>
                <th className="th">Confidence</th>
                <th className="th">Chosen action</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/app/case/${r.id}`)}
                  className="border-b border-hairline2 last:border-0 hover:bg-surface/70 cursor-pointer transition-colors"
                >
                  <td className="td text-center text-faint tabular-nums">{i + 1}</td>
                  <td className="td font-medium tabular-nums">{inr(r.amountRs)}</td>
                  <td className="td">
                    <div className="font-medium">{r.customerName}</div>
                  </td>
                  <td className="td text-muted">{r.failureLabel}</td>
                  <td className="td">
                    {r.diagnosisClass ? (
                      <span className="inline-flex items-center h-6 px-2.5 rounded-full text-2xs font-medium border border-good/30 bg-good-soft/60 text-good">
                        {r.diagnosisClass}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="td"><Dots value={r.confidence} /></td>
                  <td className="td text-muted">{ACTION_LABEL[r.chosenAction] || '—'}</td>
                  <td className="td"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[13px] text-faint">
                    No payments match. Re-seed a batch or clear the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Green-dot confidence rating (like the reference's "Easy To Target").
function Dots({ value }) {
  if (value == null) return <span className="text-faint">—</span>;
  const n = Math.round(value * 5);
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((k) => (
        <span key={k} className={`w-1.5 h-1.5 rounded-full ${k < n ? 'bg-good' : 'bg-hairline'}`} />
      ))}
    </span>
  );
}
