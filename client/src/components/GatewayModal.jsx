import { useEffect } from 'react';
import { IconClose } from './Icons.jsx';

// Gateway Route & AI Agent Pipeline — a centered modal that visualises how a
// failed payment flows from telemetry → AI decision → policy guardrail → execution.

const STAGES = [
  {
    n: '01', title: 'Payment failure telemetry', dot: '#F87171',
    body: 'A failed charge or abandoned checkout in the sandbox emits Razorpay-shaped telemetry — code, step, reason — straight into the pipeline.',
  },
  {
    n: '02', title: 'AI Decision Layer', dot: '#A78BFA',
    body: 'The agent reads the failure reason alongside mock customer history and risk profile, and proposes a move: instant retry, an alternate gateway route, or a controlled reminder.',
  },
  {
    n: '03', title: 'Deterministic Policy Engine', dot: '#3B82F6', badge: 'Guardrail',
    body: 'The AI only diagnoses — it has no autonomous execution power. A code-defined policy engine enforces the boundaries: max-retry caps, RBI/compliance checks, fraud blocks, and no spamming the customer.',
  },
  {
    n: '04', title: 'Execution & Verification Route', dot: '#4ADE80',
    body: 'If the action clears policy, the recovery tool fires — a tailored payment link via Razorpay Route / test APIs — and the outcome is verified. If it is too risky, the case is escalated instead.',
  },
];

export default function GatewayModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`fixed inset-0 z-[60] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(2px)' }} onClick={onClose} />

      <div className="fixed inset-0 z-[61] grid place-items-center p-4" style={{ pointerEvents: open ? 'auto' : 'none' }} onClick={onClose}>
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[560px] max-h-[88vh] flex flex-col text-slate-200 rounded-2xl border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300"
          style={{ background: '#0B1220', transform: open ? 'scale(1)' : 'scale(0.96)', opacity: open ? 1 : 0 }}
        >
          {/* header */}
          <div className="flex items-start gap-2.5 px-5 h-16 border-b border-white/10 shrink-0 items-center">
            <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="2.4" /><circle cx="18" cy="5" r="2.4" /><path d="M6 16.5V11a4 4 0 0 1 4-4h5.5" /></svg>
            </span>
            <div className="leading-tight">
              <div className="text-[14px] font-semibold text-white">Gateway Route & AI Agent Pipeline</div>
              <div className="text-[11px] text-slate-400">How a failed payment is diagnosed, bounded, and recovered</div>
            </div>
            <button onClick={onClose} className="ml-auto w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:bg-white/10"><IconClose size={16} /></button>
          </div>

          <div className="overflow-y-auto px-5 py-4">
            {/* live routing chip row */}
            <div className="flex flex-wrap gap-2 mb-4 text-[11.5px]">
              <Chip label="Primary" value="ICICI node" tone="#4ADE80" />
              <Chip label="Failover" value="HDFC node" tone="#FBBF24" />
              <Chip label="Smart routing" value="ON" tone="#60A5FA" />
            </div>

            {/* pipeline stages */}
            <ol className="relative border-l border-white/10 ml-2">
              {STAGES.map((s) => (
                <li key={s.n} className="relative pl-5 pb-4 last:pb-0">
                  <span className="absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-2 border-[#0B1220]" style={{ background: s.dot }} />
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-500">{s.n}</span>
                    <span className="text-[13.5px] font-semibold text-white">{s.title}</span>
                    {s.badge && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.16)', color: '#93C5FD' }}>{s.badge}</span>}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">{s.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-4 rounded-xl border border-white/10 px-3.5 py-3 text-[12px] text-slate-400" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-slate-300 font-medium">Try it: </span>
              open <span className="text-white">Sandbox Checkout Simulator</span> and fail a payment — the telemetry runs this exact pipeline live.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Chip({ label, value, tone }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone }} />
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </span>
  );
}
