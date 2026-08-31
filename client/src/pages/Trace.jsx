import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useConsole } from '../components/Console.jsx';
import { inr, fmtTime } from '../lib/format.js';
import { StatusBadge } from '../components/ui.jsx';
import { IconFlow, IconRobot, IconBolt, IconCheck, IconStop, IconArrowRight } from '../components/Icons.jsx';

// Classify an audit event into a visual lane so the trace reads at a glance.
function kindOf(e) {
  const a = (e.action || '').toLowerCase();
  const s = (e.step || '').toLowerCase();
  if (s === 'intervention_skipped' || a === 'stop_recovery' || a === 'escalate_to_human') return 'stop';
  if (s === 'diagnosis' || a.includes('diagnos') || a.includes('reason')) return 'think';
  if (a === 'record_promise_to_pay') return 'control';
  if (e.outcome === 'success' || e.outcome === 'sent' || a === 'retry_payment' && e.outcome === 'success') return 'win';
  if (s === 'tool' || a) return 'act';
  return 'think';
}
const LANE = {
  think: { dot: 'bg-accent', soft: 'bg-accent-soft text-accent-ink border-accent/20', Icon: IconRobot, label: 'Reason' },
  act: { dot: 'bg-ink', soft: 'bg-surface text-ink border-hairline', Icon: IconBolt, label: 'Tool' },
  win: { dot: 'bg-good', soft: 'bg-good-soft text-good border-good/20', Icon: IconCheck, label: 'Outcome' },
  control: { dot: 'bg-[#8B5CF6]', soft: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20', Icon: IconFlow, label: 'Control' },
  stop: { dot: 'bg-stop', soft: 'bg-stop-soft text-stop border-stop/20', Icon: IconStop, label: 'Guardrail' },
};

export default function Trace() {
  const { refreshKey } = useConsole();
  const [rows, setRows] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.payments().then((r) => {
      setRows(r);
      // Default to a payment that actually has a story to tell.
      const first = r.find((p) => p.status === 'recovered') || r.find((p) => p.status !== 'at_risk') || r[0];
      if (first) setOpenId(first.id);
    });
  }, [refreshKey]);

  useEffect(() => {
    if (!openId) return;
    setLoading(true);
    setDetail(null);
    api.payment(openId).then((d) => { setDetail(d); setLoading(false); });
  }, [openId]);

  const events = detail?.events || [];
  const p = detail?.payment;

  return (
    <div className="p-6 max-w-[1180px] mx-auto space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[10px] bg-accent-soft text-accent grid place-items-center"><IconFlow size={18} /></span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">Agent Trace</h1>
          <p className="text-[13px] text-muted">Watch the agent think, choose a tool, and act — every step, auditable.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* recovery picker */}
        <div className="card p-2 h-fit max-h-[620px] overflow-y-auto">
          <div className="px-2 py-2 text-[11px] uppercase tracking-wide text-faint">Recoveries</div>
          {rows.slice(0, 40).map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenId(r.id)}
              className={`w-full text-left px-2.5 py-2 rounded-[10px] flex items-center justify-between gap-2 ${openId === r.id ? 'bg-surface' : 'hover:bg-canvas'}`}
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-medium truncate">{r.customerName}</span>
                <span className="block text-[11px] text-muted">{r.diagnosisClass || r.failureLabel}</span>
              </span>
              <span className="text-[12px] font-semibold tabular-nums shrink-0">{inr(r.amountRs)}</span>
            </button>
          ))}
        </div>

        {/* trace canvas */}
        <div className="card p-5 min-h-[420px]">
          {p && (
            <div className="flex flex-wrap items-center gap-3 pb-4 mb-4 border-b border-hairline">
              <div className="text-[15px] font-semibold">{p.customerName}</div>
              <StatusBadge status={p.status} />
              <span className="text-[13px] text-muted">{p.failureLabel}</span>
              <span className="ml-auto text-[15px] font-semibold tabular-nums">{inr(p.amountRs)}</span>
            </div>
          )}

          {loading && <div className="text-[13px] text-muted py-10 text-center">Loading trace…</div>}

          {!loading && events.length === 0 && (
            <div className="text-[13px] text-muted py-10 text-center">No trace yet — run the batch, then pick a recovery.</div>
          )}

          {!loading && events.length > 0 && (
            <ol className="relative pl-1">
              {events.map((e, i) => {
                const lane = LANE[kindOf(e)];
                const Icon = lane.Icon;
                return (
                  <li key={e.id} className="relative pl-9 pb-4 last:pb-0" style={{ animation: `cardIn .3s ease both`, animationDelay: `${i * 45}ms` }}>
                    {/* connector */}
                    {i < events.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-hairline" />}
                    {/* node dot */}
                    <span className={`absolute left-0 top-0 w-[27px] h-[27px] rounded-full grid place-items-center text-white ${lane.dot}`}>
                      <Icon size={14} />
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`chip h-5 px-2 text-[10px] ${lane.soft}`}>{lane.label}</span>
                      {e.action && <span className="text-[12px] font-mono text-muted">{e.action}</span>}
                      {e.outcome && <span className="text-[11px] text-faint">→ {e.outcome}</span>}
                      <span className="ml-auto text-[11px] text-faint tabular-nums">{fmtTime(e.ts)}</span>
                    </div>
                    <div className="mt-1 text-[13px] leading-snug">{e.decision}</div>
                  </li>
                );
              })}
              <li className="relative pl-9 pt-1">
                <span className="absolute left-0 top-0 w-[27px] h-[27px] rounded-full grid place-items-center bg-good text-white"><IconArrowRight size={14} /></span>
                <div className="text-[13px] font-medium text-good pt-0.5">
                  {p?.status === 'recovered' ? `Recovered ${inr(p.amountRs)}` : `Final state: ${p?.status}`}
                </div>
              </li>
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
