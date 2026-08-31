import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConsole } from '../components/Console.jsx';
import { api } from '../api.js';
import { fmtTime } from '../lib/format.js';
import { IconDownload, IconSearch } from '../components/Icons.jsx';

const STEP_STYLE = {
  ingest: 'bg-surface text-muted border-hairline',
  diagnose: 'bg-accent-soft text-accent-ink border-accent/20',
  decide: 'bg-accent-soft text-accent-ink border-accent/20',
  stopping_check: 'bg-warn-soft text-warn border-warn/20',
  execute: 'bg-ink text-white border-ink',
  outcome: 'bg-good-soft text-good border-good/20',
};

const OUTCOME_STYLE = {
  success: 'text-good',
  failure: 'text-muted',
  stopped: 'text-stop',
  skipped: 'text-warn',
  passed: 'text-good',
  link_sent_pending: 'text-accent-ink',
};

export default function Audit() {
  const { refreshKey } = useConsole();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState('');
  const [step, setStep] = useState('all');

  useEffect(() => {
    api.audit().then(setEvents).catch(() => {});
  }, [refreshKey]);

  const steps = ['all', 'ingest', 'diagnose', 'decide', 'stopping_check', 'execute', 'outcome'];
  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (step !== 'all' && e.step !== step) return false;
        if (q && !`${e.paymentId} ${e.decision} ${e.action || ''}`.toLowerCase().includes(q.toLowerCase()))
          return false;
        return true;
      }),
    [events, q, step],
  );

  return (
    <div className="p-6 max-w-[1180px] mx-auto space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">Audit trail</h1>
          <p className="text-[13px] text-muted mt-0.5">
            Every decision and action, timestamped and immutable. {events.length} events logged.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input pl-9 w-56" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <a href="/api/audit.csv" className="btn" download>
            <IconDownload size={15} /> Export CSV
          </a>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {steps.map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`chip h-7 px-2.5 ${
              step === s ? 'bg-ink text-white border-ink' : 'bg-canvas text-muted border-hairline hover:bg-surface'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-surface/60">
                <th className="th">Time</th>
                <th className="th">Payment</th>
                <th className="th">Step</th>
                <th className="th">Decision / action</th>
                <th className="th">Outcome</th>
                <th className="th text-right">Retries</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} onClick={() => navigate(`/app/case/${e.paymentId}`)}
                  className="border-b border-hairline2 last:border-0 hover:bg-surface/70 cursor-pointer transition-colors">
                  <td className="td text-2xs text-muted tabular-nums whitespace-nowrap">{fmtTime(e.ts)}</td>
                  <td className="td font-mono text-2xs text-accent whitespace-nowrap hover:underline">{e.paymentId.slice(0, 12)}…</td>
                  <td className="td">
                    <span className={`chip ${STEP_STYLE[e.step] || 'bg-surface text-muted border-hairline'}`}>
                      {e.step.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="td max-w-[420px]">
                    <div className="text-[13px] text-ink truncate">{e.decision}</div>
                    {e.action && <div className="text-2xs text-faint">{e.action}</div>}
                  </td>
                  <td className={`td text-2xs font-medium ${OUTCOME_STYLE[e.outcome] || 'text-faint'}`}>
                    {e.outcome || '—'}
                  </td>
                  <td className="td text-right tabular-nums text-muted">{e.retriesUsed || 0}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-[13px] text-faint">
                    No events. Run the recovery batch to generate the trail.
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
