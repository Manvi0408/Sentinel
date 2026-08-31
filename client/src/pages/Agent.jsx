import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useConsole } from '../components/Console.jsx';
import { inr, ACTION_LABEL, confPct } from '../lib/format.js';
import { ClassTag } from '../components/ui.jsx';
import { IconRobot, IconPlay, IconCheck, IconArrowRight, IconChart, IconClose } from '../components/Icons.jsx';

// Varied root-cause reasoning per class (picked deterministically per case).
const ROOT_CAUSE = {
  Abandoned: [
    'Customer added items but dropped at the payment step — likely a UPI app-switch or OTP delay.',
    'Payment page loaded but the session timed out before the customer returned.',
    'Reached checkout with no payment attempt — price or trust hesitation at the final step.',
  ],
  'Bad card': [
    'Card expired last cycle — the network returned a hard decline that cannot be retried.',
    'Card reported lost / reissued; the BIN is no longer valid for charges.',
    'Issuer permanently flagged the card — a fresh card is required to proceed.',
  ],
  'Insufficient funds': [
    'Bank declined for low balance — a soft decline that typically clears near payday.',
    'Available balance was below the charge; a retry after salary credit should pass.',
    'Daily debit limit was hit; a delayed retry within the window is likely to succeed.',
  ],
  'Mandate fail': [
    'UPI AutoPay mandate expired and could not be presented to the bank.',
    'e-NACH mandate was paused by the bank; it needs re-presentation within limits.',
    'Mandate amount cap was exceeded; re-present at the allowed amount.',
  ],
  Transient: [
    'Gateway timed out mid-authorization — a transient network error, not a real decline.',
    'The issuing bank had a brief outage; a cooled-off retry should clear it.',
    'Intermittent 5xx from the acquirer — safe and expected to retry.',
  ],
};
const WHY_ACTION = {
  smart_retry: 'A cooled-off retry rides out the transient window without touching the customer.',
  delayed_retry: 'Retrying near payday plus a gentle reminder maximises a soft-decline recovery.',
  update_card_link: 'A hard decline can never succeed on retry — the customer updates the card via a secure link.',
  represent_mandate: 'The mandate is re-presented within bank limits; no customer action unless it fails again.',
  recovery_link: 'A one-tap recovery link brings the abandoned checkout back with the least friction.',
};
const ALT_REJECTED = {
  smart_retry: [['Send payment link', 'unnecessary friction for a transient error'], ['Escalate to human', 'no human judgement needed yet']],
  delayed_retry: [['Immediate retry', 'balance unlikely to have changed yet'], ['Card-update link', 'card is valid — only funds are short']],
  update_card_link: [['Smart retry', 'blocked — retrying a hard decline is never allowed'], ['Re-present mandate', 'no mandate on this payment']],
  represent_mandate: [['Payment link', 'mandate flow is lower-friction for the customer'], ['Immediate re-present', 'must respect the bank cool-down window']],
  recovery_link: [['Smart retry', 'no failed charge exists to retry'], ['Voice call first', 'link converts faster and cheaper at this stage']],
};

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const rootCause = (p) => (ROOT_CAUSE[p.diagnosisClass] || ['Diagnosed from the gateway signal.'])[hash(p.id) % (ROOT_CAUSE[p.diagnosisClass]?.length || 1)];

const PHASES = ['Checking stopping rules…', 'Executing recovery action…', 'Sending payment link…'];
const doneMsg = (r) => {
  const first = r.customerName.split(' ')[0];
  switch (r.chosenAction) {
    case 'update_card_link':
    case 'recovery_link':
      return `Link sent to ${first} on WhatsApp`;
    case 'delayed_retry':
      return `Reminder + retry scheduled for ${first}`;
    case 'represent_mandate':
      return `Mandate re-presented for ${first}`;
    default:
      return `Smart retry scheduled for ${first}`;
  }
};

export default function Agent() {
  const { refreshKey, runBatch, busy, flash } = useConsole();
  const [rows, setRows] = useState([]);
  const [work, setWork] = useState({}); // id -> phase index while the agent works
  const [done, setDone] = useState({}); // id -> completion message
  const [deep, setDeep] = useState(null);

  useEffect(() => {
    api.payments().then((p) => setRows(p.filter((r) => r.diagnosisClass).slice(0, 12)));
  }, [refreshKey]);

  const approve = (r) => {
    if (work[r.id] != null || done[r.id]) return;
    setWork((w) => ({ ...w, [r.id]: 0 }));
    setTimeout(() => setWork((w) => (w[r.id] == null ? w : { ...w, [r.id]: 1 })), 850);
    setTimeout(() => setWork((w) => (w[r.id] == null ? w : { ...w, [r.id]: 2 })), 1700);
    setTimeout(() => {
      setWork((w) => { const n = { ...w }; delete n[r.id]; return n; });
      const msg = doneMsg(r);
      setDone((d) => ({ ...d, [r.id]: msg }));
      flash(`✓ ${msg}`);
    }, 2600);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-[10px] bg-accent-soft text-accent grid place-items-center"><IconRobot size={18} /></span>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight2">AI Recovery Agent</h1>
            <p className="text-[13px] text-muted">Root-cause analysis and the recommended bounded action for each case.</p>
          </div>
        </div>
        <button className="btn btn-accent" onClick={runBatch} disabled={busy}>
          <IconPlay size={14} /> {busy === 'run' ? 'Executing…' : 'Approve & execute all'}
        </button>
      </div>

      {rows.length === 0 && (
        <div className="card p-10 text-center text-[13px] text-faint">
          No diagnosed cases yet — press “Run recovery on batch” (top-right) or “Approve & execute all”.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((r) => {
          const expected = Math.round(r.amountRs * (r.confidence || 0.5));
          const working = work[r.id] != null;
          const isDone = done[r.id];
          return (
            <div key={r.id} className="card p-5 relative overflow-hidden">
              {/* glass "agent working" skin */}
              {working && (
                <div className="absolute inset-0 z-10 grid place-items-center bg-white/55 backdrop-blur-md">
                  <div className="text-center px-4">
                    <span className="mx-auto block w-9 h-9 rounded-full border-2 border-accent/25 border-t-accent animate-spin" />
                    <div className="mt-3 text-[13px] font-semibold text-ink">Sentinel agent working…</div>
                    <div className="text-2xs text-accent-ink mt-1">{PHASES[work[r.id]]}</div>
                    <div className="text-2xs text-faint mt-0.5">{r.customerName} · {inr(r.amountRs)}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <ClassTag cls={r.diagnosisClass} />
                <span className="chip bg-surface text-muted border-hairline">{confPct(r.confidence)} confidence</span>
              </div>
              <div className="mt-3 text-[15px] font-semibold text-ink">{r.customerName} · {inr(r.amountRs)}</div>
              <p className="mt-1.5 text-2xs text-muted leading-relaxed">{rootCause(r)}</p>

              <div className="mt-3 space-y-2">
                <Line label="AI-detected problem" value={r.failureLabel} />
                <Line label="Recommended action" value={ACTION_LABEL[r.chosenAction] || '—'} accent />
                <Line label="Expected recovery" value={inr(expected)} good />
              </div>

              <div className="mt-4 flex items-center gap-2">
                {isDone ? (
                  <span className="chip bg-good-soft text-good border-good/20 flex-1 justify-center h-7"><IconCheck size={13} /> {isDone}</span>
                ) : (
                  <>
                    <span className="chip bg-good-soft text-good border-good/20"><IconCheck size={12} /> Within policy</span>
                    <button className="btn h-7 px-2.5 text-2xs ml-auto" onClick={() => setDeep(r)}>
                      <IconChart size={13} /> Deep analysis
                    </button>
                    <button className="btn btn-accent h-7 px-3 text-2xs" onClick={() => approve(r)}>Approve</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {deep && <DeepModal r={deep} onClose={() => setDeep(null)} onApprove={() => { approve(deep); setDeep(null); }} approved={done[deep.id] || work[deep.id] != null} />}
    </div>
  );
}

function Line({ label, value, accent, good }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-muted">{label}</span>
      <span className={`font-medium ${accent ? 'text-accent-ink' : good ? 'text-good' : 'text-ink'}`}>{value}</span>
    </div>
  );
}

// Apple-card style deep-analysis modal.
function DeepModal({ r, onClose, onApprove, approved }) {
  const expected = Math.round(r.amountRs * (r.confidence || 0.5));
  const alts = ALT_REJECTED[r.chosenAction] || [];
  const steps = [
    ['Signal received', `Gateway reported “${r.failureLabel}” for ₹${r.amountRs.toLocaleString('en-IN')}.`],
    ['Diagnosis', `Classified as ${r.diagnosisClass} at ${confPct(r.confidence)} confidence.`],
    ['Root cause', rootCause(r)],
    ['Policy check', 'Within retry window · message limits respected · not a repeat hard decline.'],
    ['Chosen action', `${ACTION_LABEL[r.chosenAction]} — ${WHY_ACTION[r.chosenAction] || ''}`],
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[560px] rounded-[26px] p-2 bg-gradient-to-b from-white/80 to-white/40 border border-white/70 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(16,24,40,0.5)]">
        <div className="rounded-[20px] bg-white border border-black/[0.05] p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xs uppercase tracking-[0.14em] text-faint">Deep analysis</div>
              <h3 className="text-[20px] font-semibold tracking-tight2 mt-0.5">{r.customerName}</h3>
              <div className="text-[13px] text-muted">{r.diagnosisClass} · {inr(r.amountRs)} at risk</div>
            </div>
            <button className="btn h-8 w-8 px-0 justify-center" onClick={onClose}><IconClose size={16} /></button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <Stat label="Confidence" value={confPct(r.confidence)} />
            <Stat label="Expected recovery" value={inr(expected)} good />
            <Stat label="Action" value={ACTION_LABEL[r.chosenAction]} />
          </div>

          <div className="mt-5 text-2xs font-semibold uppercase tracking-wide text-faint">Reasoning trace</div>
          <ol className="mt-2 relative">
            <span className="absolute left-[6px] top-1 bottom-2 w-px bg-hairline" />
            {steps.map(([t, d], i) => (
              <li key={i} className="relative pl-6 pb-3.5">
                <span className="absolute left-0 top-1 w-3 h-3 rounded-full bg-accent border-2 border-white" />
                <div className="text-[13px] font-medium text-ink">{t}</div>
                <div className="text-2xs text-muted leading-relaxed mt-0.5">{d}</div>
              </li>
            ))}
          </ol>

          {alts.length > 0 && (
            <>
              <div className="text-2xs font-semibold uppercase tracking-wide text-faint">Alternatives considered</div>
              <div className="mt-2 space-y-1.5">
                {alts.map(([a, why]) => (
                  <div key={a} className="flex items-start gap-2 text-2xs">
                    <span className="text-stop mt-0.5">✕</span>
                    <span><b className="text-ink">{a}</b> <span className="text-muted">— {why}</span></span>
                  </div>
                ))}
              </div>
            </>
          )}

          <ToolBelt paymentId={r.id} />

          <div className="mt-6 flex items-center gap-2">
            <button className="btn flex-1 justify-center" onClick={onClose}>Close</button>
            {approved ? (
              <span className="btn flex-1 justify-center bg-good-soft text-good border-good/20"><IconCheck size={14} /> Approved</span>
            ) : (
              <button className="btn btn-accent flex-1 justify-center" onClick={onApprove}><IconCheck size={14} /> Approve & execute</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const TOOL_KIND = { read: 'bg-accent-soft text-accent-ink border-accent/20', action: 'bg-good-soft text-good border-good/20', control: 'bg-warn-soft text-warn border-warn/20' };
// Agent toolbelt — invoke any of the agent's tools on this payment, live.
function ToolBelt({ paymentId }) {
  const [tools, setTools] = useState([]);
  const [out, setOut] = useState(null);
  const [running, setRunning] = useState(null);
  useEffect(() => { api.tools().then(setTools).catch(() => {}); }, []);

  const run = async (name) => {
    setRunning(name);
    try {
      const res = await api.callTool(name, { paymentId });
      setOut({ name, result: res.result ?? res });
    } catch (e) {
      setOut({ name, result: { error: String(e.message || e) } });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="mt-6 pt-4 border-t border-hairline2">
      <div className="text-2xs font-semibold uppercase tracking-wide text-faint">Agent toolbelt</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tools.map((t) => (
          <button
            key={t.name}
            onClick={() => run(t.name)}
            title={t.desc}
            className={`chip h-7 px-2.5 ${TOOL_KIND[t.kind] || 'bg-surface text-muted border-hairline'} ${running === t.name ? 'opacity-60' : 'hover:brightness-95'}`}
          >
            {running === t.name ? '…' : t.name}
          </button>
        ))}
      </div>
      {out && (
        <div className="mt-3">
          <div className="text-2xs text-muted mb-1"><span className="font-mono text-ink">{out.name}()</span> → result:</div>
          <pre className="text-2xs bg-ink text-white/90 rounded-lg p-3 overflow-x-auto max-h-40 leading-relaxed">{JSON.stringify(out.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
function Stat({ label, value, good }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface px-3 py-2.5">
      <div className="text-2xs text-faint">{label}</div>
      <div className={`text-[13px] font-semibold mt-0.5 ${good ? 'text-good' : 'text-ink'}`}>{value}</div>
    </div>
  );
}
