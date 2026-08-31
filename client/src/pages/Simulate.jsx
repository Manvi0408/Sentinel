import { useState } from 'react';
import { api } from '../api.js';
import { useConsole } from '../components/Console.jsx';
import { inr } from '../lib/format.js';
import { IconPlug, IconBolt, IconCheckCircle } from '../components/Icons.jsx';

const EVENTS = [
  { type: 'payment.failed', reason: 'insufficient_funds', amount: 499900, label: 'Payment failed', sub: 'insufficient_funds' },
  { type: 'payment.failed', reason: 'payment_timed_out', amount: 129900, label: 'Payment failed', sub: 'payment_timed_out' },
  { type: 'payment.failed', reason: 'payment_risk_check_failed', amount: 899900, label: 'Payment failed', sub: 'payment_risk_check_failed' },
  { type: 'payment.failed', reason: 'card_expired', amount: 219900, label: 'Payment failed', sub: 'card_expired' },
  { type: 'subscription.halted', reason: 'mandate_afa_required', amount: 1853400, label: 'Mandate halted', sub: 'mandate_afa_required · RBI > ₹15,000' },
];

export default function Simulate() {
  const { refresh } = useConsole();
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);

  const fire = async (e) => {
    setBusy(true);
    try {
      const r = await api.simulateEvent({ type: e.type, reason: e.reason, amount: e.amount });
      const d = r.detected;
      setLog((l) => [{ id: d.id, ts: new Date(), event: e.type, label: e.label, ...d }, ...l].slice(0, 20));
      refresh(); // the new at-risk case flows into the queue + dashboard
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-[1180px] mx-auto space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[10px] bg-accent-soft text-accent grid place-items-center"><IconPlug size={18} /></span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">Webhook Simulator</h1>
          <p className="text-[13px] text-muted">Fire a real Razorpay-shaped event and watch Sentinel detect, diagnose, and queue it — no live payment needed.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* event triggers */}
        <div className="card p-5 h-fit">
          <div className="text-[13px] font-semibold mb-1">Fire an event</div>
          <p className="text-[12px] text-muted mb-4">Each button POSTs a Razorpay-shaped payload to <span className="font-mono text-[11px]">/api/webhook/razorpay</span> — the exact path a live webhook takes.</p>
          <div className="space-y-2">
            {EVENTS.map((e, i) => (
              <button key={i} onClick={() => fire(e)} disabled={busy}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-[12px] border border-hairline bg-canvas hover:bg-surface transition text-left disabled:opacity-50">
                <span className="w-8 h-8 rounded-lg bg-stop-soft text-stop grid place-items-center shrink-0"><IconBolt size={15} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">{e.label}</span>
                  <span className="block text-[11.5px] text-faint font-mono">{e.type} · {e.sub}</span>
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-ink">{inr(e.amount / 100)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* live event flow */}
        <div className="card p-5 min-h-[420px]">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full bg-good opacity-60 animate-ping" /><span className="relative inline-flex w-2 h-2 rounded-full bg-good" /></span>
            <span className="text-[13px] font-semibold">Live event flow</span>
            <span className="ml-auto text-[12px] text-faint">{log.length} events this session</span>
          </div>

          {log.length === 0 ? (
            <div className="grid place-items-center py-20 text-center">
              <div>
                <div className="text-[13px] text-muted">No events yet.</div>
                <div className="text-[12px] text-faint mt-1">Fire one on the left to watch it flow through the pipeline.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {log.map((r, i) => (
                <div key={r.id + i} className="rounded-[12px] border border-hairline bg-white p-4" style={{ animation: 'cardIn .35s ease both' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="chip h-6 px-2 text-[11px] bg-stop-soft text-stop border-stop/20 font-mono">{r.event}</span>
                    <span className="text-[13.5px] font-semibold text-ink">{r.customerName}</span>
                    <span className="text-[13px] font-semibold tabular-nums text-stop ml-auto">−{inr(r.amount / 100)}</span>
                  </div>
                  {/* pipeline steps */}
                  <div className="mt-3 flex items-center gap-2 text-[12px] flex-wrap">
                    <Step label="Detected" tone="accent" delay={0} />
                    <Arrow />
                    <Step label={`Diagnosed · ${r.diagnosisClass} (${Math.round(r.confidence * 100)}%)`} tone="accent" delay={0.25} />
                    <Arrow />
                    <Step label={`Action · ${r.action}`} tone="good" delay={0.5} />
                    <Arrow />
                    <span className="inline-flex items-center gap-1.5 text-good font-medium" style={{ animation: 'cardIn .3s ease both', animationDelay: '0.75s' }}>
                      <IconCheckCircle size={14} /> Queued for recovery
                    </span>
                  </div>
                  <div className="mt-2 text-[11.5px] text-faint">{r.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} · id {r.id.slice(-8)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ label, tone, delay }) {
  const c = tone === 'good' ? 'bg-good-soft text-good border-good/20' : 'bg-accent-soft text-accent-ink border-accent/20';
  return <span className={`chip h-6 px-2 text-[11px] border ${c}`} style={{ animation: 'cardIn .3s ease both', animationDelay: `${delay}s` }}>{label}</span>;
}
function Arrow() {
  return <span className="text-faint">→</span>;
}
