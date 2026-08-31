import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useConsole } from '../components/Console.jsx';
import { inr, ACTION_LABEL } from '../lib/format.js';
import { StatusBadge } from '../components/ui.jsx';
import { IconCheckCircle, IconShield } from '../components/Icons.jsx';

const TABS = [
  { key: 'recovered', label: 'Successful' },
  { key: 'retrying', label: 'Active' },
  { key: 'stopped', label: 'Failed / stopped' },
];
const CHANNEL = {
  smart_retry: 'Auto retry',
  delayed_retry: 'Retry + reminder',
  update_card_link: 'Payment link',
  represent_mandate: 'Mandate re-present',
  recovery_link: 'Payment link',
};

export default function Recoveries() {
  const { refreshKey } = useConsole();
  const [rows, setRows] = useState([]);
  const [audit, setAudit] = useState([]);
  const [tab, setTab] = useState('recovered');

  useEffect(() => {
    api.payments().then(setRows);
    api.audit().then(setAudit).catch(() => {});
  }, [refreshKey]);

  // Graceful-fallback saves: a provider dropped a request (Twilio) OR a first
  // attempt failed, and Sentinel fell back to another tool/retry instead of giving up.
  const fallbackSaves = useMemo(() => {
    const providerDrops = audit.filter((e) => ['send_failed', 'call_failed', 'live-failed'].includes(e.outcome)).length;
    const retrySaves = rows.filter((r) => r.status === 'recovered' && r.retriesUsed >= 2).length;
    return providerDrops + retrySaves;
  }, [audit, rows]);

  const recoveredTotal = useMemo(() => rows.filter((r) => r.status === 'recovered').reduce((s, r) => s + r.recoveredAmount / 100, 0), [rows]);
  const counts = useMemo(() => rows.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {}), [rows]);
  const shown = rows.filter((r) => r.status === tab || (tab === 'stopped' && r.status === 'stopped') || (tab === 'retrying' && r.status === 'link_sent'));

  return (
    <div className="p-6 max-w-[1180px] mx-auto space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[10px] bg-good-soft text-good grid place-items-center"><IconCheckCircle size={18} /></span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">Recoveries</h1>
          <p className="text-[13px] text-muted">Every recovery attempt, its channel, and the money won back.</p>
        </div>
        {/* graceful-fallback resilience badge (addresses the Failure-Recovery pillar) */}
        <div className="ml-auto relative group">
          <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-accent-soft text-accent-ink border border-accent/20 text-[13px] font-semibold cursor-help">
            <IconShield size={15} /> {fallbackSaves} fallback saves
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-0 top-full mt-2 w-64 rounded-[10px] bg-ink text-white text-[11px] leading-relaxed p-3 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.6)] z-30 pointer-events-none">
            Times the agent recovered <b>gracefully</b> — a provider (e.g. Twilio) dropped a request, or a first attempt failed, and Sentinel fell back to another tool or a safe retry instead of giving up.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="₹ recovered" value={inr(recoveredTotal)} tone="good" />
        <Kpi label="Successful" value={counts.recovered || 0} />
        <Kpi label="Active" value={(counts.retrying || 0) + (counts.link_sent || 0)} />
        <Kpi label="Stopped" value={counts.stopped || 0} tone="stop" />
      </div>

      <div className="flex items-center gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`chip h-7 px-3 ${tab === t.key ? 'bg-ink text-white border-ink' : 'bg-canvas text-muted border-hairline hover:bg-surface'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-surface/60">
                <th className="th">Customer</th>
                <th className="th">Channel</th>
                <th className="th">Action</th>
                <th className="th">Retries</th>
                <th className="th text-right">Amount</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-hairline2 last:border-0 hover:bg-surface/60">
                  <td className="td font-medium">{r.customerName}</td>
                  <td className="td text-muted">{CHANNEL[r.chosenAction] || '—'}</td>
                  <td className="td text-muted">{ACTION_LABEL[r.chosenAction] || '—'}</td>
                  <td className="td tabular-nums text-muted">{r.retriesUsed}</td>
                  <td className="td text-right tabular-nums font-medium">{inr(r.amountRs)}</td>
                  <td className="td"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={6} className="py-14 text-center text-[13px] text-faint">Nothing here yet — run a recovery batch.</td></tr>
              )}
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
