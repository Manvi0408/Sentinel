import { useState, useRef, useEffect } from 'react';
import { useConsole } from './Console.jsx';
import { IconClose } from './Icons.jsx';

// ---------------------------------------------------------------------------
// Sandbox Checkout Simulator — a dark slide-over that bridges the payment form
// directly to Razorpay's native error taxonomy (code / step / reason).
//   • past expiry            → card_expired            → 1-Click UPI Swap
//   • card starts with 4242  → payment_timed_out       → Stealth Gateway Failover → success
//   • card starts with 5555  → insufficient_funds      → No-Cost EMI / BNPL
// Any successful recovery increments the global dashboard analytics.
// ---------------------------------------------------------------------------

const AMOUNT = 18540; // ₹ — the demo ticket that flows into analytics on recovery

const TONE = {
  dim: '#64748B', info: '#94A3B8', json: '#FBBF24', fail: '#F87171', ai: '#A78BFA', ok: '#4ADE80',
};

const isExpiryPast = (mmYY) => {
  const m = String(mmYY).match(/^(\d{1,2})\s*\/\s*(\d{2})$/);
  if (!m) return false;
  const mm = +m[1], yy = 2000 + +m[2];
  if (mm < 1 || mm > 12) return false;
  const endOfMonth = new Date(yy, mm, 0, 23, 59, 59); // last day of that month
  return endOfMonth < new Date();
};
const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const cardDisplay = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 16).padEnd(16, '•');
  return d.replace(/(.{4})/g, '$1 ').trim();
};
const brandOf = (v) => {
  const d = v.replace(/\D/g, '');
  if (d.startsWith('4')) return 'visa';
  if (d.startsWith('5')) return 'mc';
  return null;
};

export default function SandboxDrawer({ open, onClose }) {
  const { addSandboxWin } = useConsole();
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [log, setLog] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | processing | failed | recovered
  const [err, setErr] = useState(null); // { code, step, reason }
  const [recovery, setRecovery] = useState(null); // 'upi' | 'emi' | null
  const termRef = useRef(null);

  useEffect(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, [log]);
  // lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const push = (line, tone = 'info') => setLog((l) => [...l, { line, tone, ts: clock() }]);
  const reset = () => { setStatus('idle'); setErr(null); setRecovery(null); };

  const runPayment = () => {
    reset();
    setLog([]);
    const digits = card.replace(/\D/g, '');
    push(`POST /v1/payments · amount=₹${AMOUNT.toLocaleString('en-IN')} · card=${digits.slice(0, 4) || '····'}••••`, 'dim');

    if (isExpiryPast(expiry)) {
      const e = { code: 'BAD_REQUEST_ERROR', step: 'payment_authentication', reason: 'card_expired' };
      setErr(e); setStatus('failed'); push(JSON.stringify(e), 'json');
      push('✗ authentication failed — card expiry is in the past', 'fail');
      push('AI · recoverable via alternate rail — offering 1-Click UPI Swap', 'ai');
      setRecovery('upi');
      return;
    }
    if (digits.startsWith('4242')) {
      const e = { code: 'GATEWAY_ERROR', step: 'payment_initiation', reason: 'payment_timed_out' };
      setErr(e); setStatus('processing'); push(JSON.stringify(e), 'json');
      push('✗ gateway timed out during initiation', 'fail');
      setTimeout(() => push('AI · Executing Stealth Gateway Failover to active ICICI Node', 'ai'), 650);
      setTimeout(() => {
        push('↻ re-routed via ICICI node · authorization captured', 'ok');
        push(`✓ payment.captured · ₹${AMOUNT.toLocaleString('en-IN')}`, 'ok');
        setStatus('recovered'); addSandboxWin(AMOUNT);
      }, 1850);
      return;
    }
    if (digits.startsWith('5555')) {
      const e = { code: 'BAD_REQUEST_ERROR', step: 'payment_authorization', reason: 'insufficient_funds' };
      setErr(e); setStatus('failed'); push(JSON.stringify(e), 'json');
      push('✗ authorization declined — insufficient balance', 'fail');
      push('AI · affordability block — offering No-Cost EMI / BNPL conversion', 'ai');
      setRecovery('emi');
      return;
    }
    // any other valid-looking card → straight capture
    if (digits.length >= 12) {
      push('✓ authorization captured · payment.captured', 'ok');
      setStatus('recovered'); addSandboxWin(AMOUNT);
    } else {
      push('… enter a full card number to run the checkout', 'dim');
      setStatus('idle');
    }
  };

  const acceptUpi = () => {
    push('→ customer switched to UPI · collect request approved', 'ok');
    push(`✓ payment.captured via UPI · ₹${AMOUNT.toLocaleString('en-IN')}`, 'ok');
    setStatus('recovered'); setRecovery(null); addSandboxWin(AMOUNT);
  };
  const acceptEmi = () => {
    push('→ converted to No-Cost EMI (3 mo) · mandate authorized', 'ok');
    push(`✓ payment.captured via EMI · ₹${AMOUNT.toLocaleString('en-IN')}`, 'ok');
    setStatus('recovered'); setRecovery(null); addSandboxWin(AMOUNT);
  };

  const brand = brandOf(card);
  const processing = status === 'processing';

  return (
    <>
      {/* dim backdrop */}
      <div className={`fixed inset-0 z-[60] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(2px)' }} onClick={onClose} />

      {/* centered modal */}
      <div className="fixed inset-0 z-[61] grid place-items-center p-4" style={{ pointerEvents: open ? 'auto' : 'none' }} onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] h-[600px] max-h-[86vh] flex flex-col text-slate-200 rounded-2xl border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300"
        style={{ background: '#0B1220', transform: open ? 'scale(1)' : 'scale(0.96)', opacity: open ? 1 : 0 }}
      >
        {/* header */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-white/10 shrink-0">
          <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: 'rgba(167,139,250,0.15)' }}>
            <TerminalGlyph />
          </span>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-white">Sandbox Checkout Simulator</div>
            <div className="text-[11px] text-slate-400">Razorpay error taxonomy · live telemetry</div>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:bg-white/10"><IconClose size={16} /></button>
        </div>

        {/* ── TOP HALF: payment form ── */}
        <div className="px-5 pt-5 pb-4 overflow-y-auto" style={{ flex: '1 1 0' }}>
          {/* realistic card */}
          <div className="relative h-[188px] rounded-2xl p-5 overflow-hidden border border-white/10"
            style={{ background: 'linear-gradient(135deg,#243044 0%,#141b2b 55%,#0d1220 100%)', boxShadow: '0 20px 45px -18px rgba(0,0,0,0.7)' }}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(130% 90% at 100% 0%, rgba(99,102,241,0.38), transparent 52%)' }} />
            <div className="absolute -right-8 -bottom-10 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.20), transparent 65%)' }} />
            <div className="relative flex items-start justify-between">
              <span className="text-[10.5px] tracking-[0.22em] text-slate-300 font-semibold">SENTINEL · SANDBOX</span>
              <BrandMark brand={brand} />
            </div>
            {/* chip */}
            <div className="relative mt-6 w-11 h-8 rounded-[7px] overflow-hidden" style={{ background: 'linear-gradient(135deg,#f2d488,#c9a13c)' }}>
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(0deg, rgba(0,0,0,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.25) 1px, transparent 1px)', backgroundSize: '6px 6px' }} />
            </div>
            <div className="relative mt-4 font-mono text-[19px] tracking-[0.16em] text-white/95">{cardDisplay(card)}</div>
            <div className="relative mt-4 flex items-center gap-7">
              <div><div className="text-[8px] tracking-wider text-slate-400">VALID THRU</div><div className="font-mono text-[13px] text-white/90">{expiry || 'MM/YY'}</div></div>
              <div><div className="text-[8px] tracking-wider text-slate-400">CVV</div><div className="font-mono text-[13px] text-white/90">{cvv ? '•••' : '•••'}</div></div>
            </div>
          </div>

          {/* inputs */}
          <div className="mt-4 space-y-3">
            <Field label="Card Number">
              <input value={card} onChange={(e) => setCard(formatCard(e.target.value))} inputMode="numeric" placeholder="4242 4242 4242 4242"
                className="sandbox-input font-mono" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expiry (MM/YY)">
                <input value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} inputMode="numeric" placeholder="08/24"
                  className="sandbox-input font-mono" />
              </Field>
              <Field label="CVV">
                <input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="123"
                  className="sandbox-input font-mono" />
              </Field>
            </div>

            {/* error taxonomy banner */}
            {err && (
              <div className="rounded-xl border p-3" style={{ borderColor: status === 'recovered' ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)', background: status === 'recovered' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)' }}>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  <Tag k="code" v={err.code} />
                  <Tag k="step" v={err.step} />
                  <Tag k="reason" v={err.reason} />
                </div>
              </div>
            )}

            {/* inline recovery actions */}
            {recovery === 'upi' && status !== 'recovered' && (
              <button onClick={acceptUpi} className="w-full h-11 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 text-white transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(90deg,#7C3AED,#4F46E5)' }}>
                <BoltGlyph /> 1-Click UPI Swap · recover ₹{AMOUNT.toLocaleString('en-IN')}
              </button>
            )}
            {recovery === 'emi' && status !== 'recovered' && (
              <button onClick={acceptEmi} className="w-full h-11 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 text-white transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(90deg,#0EA5E9,#2563EB)' }}>
                Convert to No-Cost EMI / Buy Now Pay Later →
              </button>
            )}

            {status === 'recovered' ? (
              <div className="w-full h-11 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2" style={{ background: 'rgba(74,222,128,0.14)', color: '#86EFAC', border: '1px solid rgba(74,222,128,0.3)' }}>
                ✓ Payment recovered · ₹{AMOUNT.toLocaleString('en-IN')} added to analytics
              </div>
            ) : (
              <button onClick={runPayment} disabled={processing}
                className="w-full h-11 rounded-xl font-semibold text-[13px] text-slate-900 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: '#E2E8F0' }}>
                {processing ? <><Spinner /> Processing…</> : `Run Sandbox Payment · ₹${AMOUNT.toLocaleString('en-IN')}`}
              </button>
            )}
            <p className="text-[10.5px] text-slate-500 leading-snug">
              Try <b className="text-slate-300">4242…</b> (gateway failover), <b className="text-slate-300">5555…</b> (insufficient funds), or a <b className="text-slate-300">past expiry</b> (expired card).
            </p>
          </div>
        </div>

        {/* ── BOTTOM HALF: telemetry terminal ── */}
        <div className="shrink-0 border-t border-white/10 flex flex-col" style={{ height: '38%', background: '#05070D' }}>
          <div className="flex items-center gap-2 px-4 h-9 border-b border-white/5">
            <span className="relative flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" /><span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" /></span>
            <span className="text-[11.5px] font-semibold text-slate-300">Live Telemetry Stream</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">razorpay · sandbox</span>
          </div>
          <div ref={termRef} className="flex-1 overflow-y-auto px-4 py-2.5 space-y-1" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '11.5px' }}>
            {log.length === 0 && <div className="text-slate-600">$ awaiting checkout attempt…</div>}
            {log.map((l, i) => (
              <div key={i} className="flex items-start gap-2 leading-relaxed" style={{ animation: 'trace-line .2s ease both' }}>
                <span className="text-slate-600 shrink-0">{l.ts}</span>
                <span style={{ color: TONE[l.tone] || TONE.info }} className="break-all">{l.line}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
      </div>

      <style>{`.sandbox-input{width:100%;height:42px;border-radius:12px;background:#0F1729;border:1px solid rgba(255,255,255,0.10);padding:0 12px;color:#E2E8F0;font-size:14px;outline:none;transition:border-color .15s, box-shadow .15s}.sandbox-input:focus{border-color:#6366F1;box-shadow:0 0 0 3px rgba(99,102,241,0.25)}.sandbox-input::placeholder{color:#475569}`}</style>
    </>
  );
}

/* ---------- little pieces ---------- */
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-slate-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
function Tag({ k, v }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <span className="text-slate-500">{k}</span>
      <span className="text-amber-300">"{v}"</span>
    </span>
  );
}
function BrandMark({ brand }) {
  if (brand === 'visa') return <span className="italic font-black text-[16px] tracking-tight text-white/95">VISA</span>;
  if (brand === 'mc') return (
    <span className="flex items-center"><span className="w-5 h-5 rounded-full" style={{ background: '#EB001B' }} /><span className="w-5 h-5 rounded-full -ml-2.5" style={{ background: '#F79E1B', mixBlendMode: 'screen' }} /></span>
  );
  return <span className="w-8 h-5 rounded bg-white/15" />;
}
function TerminalGlyph() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></svg>);
}
function BoltGlyph() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12z" /></svg>);
}
function Spinner() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="9" fill="none" stroke="rgba(15,23,42,0.25)" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" /></svg>);
}
const clock = () => new Date().toLocaleTimeString('en-IN', { hour12: false });
const formatExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : d.slice(0, 2) + '/' + d.slice(2);
};
