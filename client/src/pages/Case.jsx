import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useConsole } from '../components/Console.jsx';
import { api } from '../api.js';
import { inr, ACTION_LABEL, confPct } from '../lib/format.js';

const INK = '#151512';
const MUTED = '#7a7a75';
const GREEN = '#0F6E56';

// Real → stage mapping. Every field below comes from the transaction, so re-running
// the batch with different data changes what this screen shows.
const STAGE = {
  at_risk: { i: 0, label: 'Diagnosing', bg: '#FDF3E7', fg: '#B7791F', dot: '#E9A23B', live: true },
  diagnosed: { i: 1, label: 'Decided', bg: '#EAF1FE', fg: '#3B5BDB', dot: '#3B5BDB' },
  retrying: { i: 2, label: 'Executing', bg: '#F1EBFE', fg: '#7048E8', dot: '#7048E8', live: true },
  link_sent: { i: 2, label: 'Executing', bg: '#F1EBFE', fg: '#7048E8', dot: '#7048E8', live: true },
  recovered: { i: 3, label: 'Recovered', bg: '#E7F4EF', fg: GREEN, dot: GREEN },
  stopped: { i: 1, label: 'Stopped', bg: '#FDECEC', fg: '#C62B38', dot: '#C62B38' },
};
const RETRIABLE = new Set(['smart_retry', 'delayed_retry', 'represent_mandate']);
const methodOf = (r) => (r === 'mandate_afa_required' ? 'Card mandate' : 'Card payment');
const clock = (ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const ago = (ts) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(ts)) / 1000));
  if (s < 60) return `${s} second${s === 1 ? '' : 's'} ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  return `${Math.round(m / 60)}h ago`;
};

export default function Case() {
  const { id } = useParams();
  const { refreshKey } = useConsole();
  const [data, setData] = useState(null);
  const [lang, setLang] = useState('hi');
  const [reveal, setReveal] = useState(0); // sections revealed, for the live progression feel

  useEffect(() => {
    setData(null);
    setReveal(0);
    api.payment(id).then(setData).catch(() => {});
  }, [id, refreshKey]);

  const p = data?.payment;
  const events = data?.events || [];
  const stage = p ? STAGE[p.status] || STAGE.at_risk : null;

  // ---- Recover live: create a REAL Razorpay test-mode payment link and poll it to Recovered ----
  const [live, setLive] = useState(null); // { url, status } | null
  const [linking, setLinking] = useState(false);
  const pollRef = useRef(null);
  useEffect(() => () => clearInterval(pollRef.current), []);
  const recoverLive = async () => {
    setLinking(true);
    try {
      const r = await api.callTool('create_payment_link', { paymentId: id });
      const url = r.result?.url;
      const isReal = !!url && !/\/sim\//.test(url); // a real Razorpay test link (rzp.io/rzp/...), not a /sim/ stub
      setLive({ url, status: isReal ? 'live' : 'simulated' });
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const c = await api.checkLink(id);
          if (c.paid) { clearInterval(pollRef.current); api.payment(id).then(setData); }
        } catch { /* keep polling */ }
      }, 4000);
    } catch { setLive({ url: null, status: 'error' }); }
    finally { setLinking(false); }
  };

  // which sections have real data to show
  const has = useMemo(() => {
    const executed = events.some((e) => e.step === 'execute') || ['retrying', 'link_sent', 'recovered'].includes(p?.status);
    return {
      diagnosis: !!p?.diagnosisClass,
      decision: !!p?.chosenAction && p.chosenAction !== 'none',
      action: executed,
      outcome: p?.status === 'recovered',
    };
  }, [p, events]);
  const totalSections = p ? [has.diagnosis, has.decision, has.action, has.outcome].filter(Boolean).length : 0;

  // reveal sections one-by-one so reasoning appears to happen live
  useEffect(() => {
    if (!p || reveal >= totalSections) return;
    const t = setTimeout(() => setReveal((r) => r + 1), reveal === 0 ? 350 : 700);
    return () => clearTimeout(t);
  }, [p, reveal, totalSections]);

  const at = (step, outcome) => {
    const e = events.find((x) => x.step === step && (!outcome || x.outcome === outcome));
    return e ? clock(e.ts) : '—';
  };
  const execEvent = events.find((e) => e.step === 'execute');
  const stopEvent = events.find((e) => e.step === 'stopping_check');
  const msg = p ? (lang === 'hi' ? p.recoveryMessageHinglish : p.recoveryMessage) : '';
  const liveBadge = stage?.live && reveal < totalSections;

  if (!p) {
    return (
      <div className="p-6 max-w-[860px] mx-auto">
        <div className="text-[13px]" style={{ color: MUTED }}>Loading case…</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[860px] mx-auto" style={{ color: INK }}>
      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-[12.5px] mb-4" style={{ color: MUTED }}>
        <Link to="/app/risk" className="hover:underline">Recovery queue</Link>
        <span>/</span>
        <span style={{ color: INK }} className="font-medium">{p.id.slice(0, 10)}…</span>
        <span className="ml-auto">Re-run the batch and this view updates from the transaction's real state.</span>
      </div>

      {/* CASE HEADER */}
      <div className="rounded-[14px] border border-black/[0.07] bg-white p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[22px] font-bold tracking-tight2">{p.id.slice(0, 14)}</div>
            <div className="text-[14px] mt-1" style={{ color: MUTED }}>
              <span className="font-semibold" style={{ color: INK }}>{inr(p.amountRs)}</span> · {methodOf(p.reason)}
            </div>
            {/* Razorpay error schema — code / step / reason, shown verbatim */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Kv k="code" v={p.code} tone="#C62B38" bg="#FDECEC" />
              <Kv k="step" v={p.step} />
              <Kv k="reason" v={p.reason} />
            </div>
            <div className="text-[12.5px] mt-2" style={{ color: MUTED }}>{p.customerName} · {p.customerEmail}</div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold shrink-0"
            style={{ background: stage.bg, color: stage.fg }}>
            <span className={`w-2 h-2 rounded-full ${liveBadge ? 'animate-pulse' : ''}`} style={{ background: stage.dot }} />
            {stage.label}
          </span>
        </div>

        {/* Recover LIVE — creates a real Razorpay test-mode link; pay it and this flips to Recovered for real */}
        {p.status !== 'recovered' && (
          <div className="mt-4 pt-4 border-t border-black/[0.06]">
            {!live ? (
              <button onClick={recoverLive} disabled={linking}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-[10px] text-[13px] font-semibold text-white disabled:opacity-60" style={{ background: '#0F6E56' }}>
                {linking ? 'Creating link…' : 'Recover live — real Razorpay test link'}
              </button>
            ) : (
              <div className="rounded-[10px] border border-[#0F6E56]/25 bg-[#0F6E56]/[0.06] px-3.5 py-3 text-[13px]">
                <div className="font-semibold" style={{ color: '#0F6E56' }}>
                  {live.status === 'live' ? 'Real Razorpay test link created — pay it to recover for real' : live.status === 'error' ? 'Could not create link' : 'Link created (simulated mode)'}
                </div>
                {live.url && <a href={live.url} target="_blank" rel="noreferrer" className="mt-1 inline-block font-mono text-[12.5px] underline break-all" style={{ color: '#1a73e8' }}>{live.url}</a>}
                <div className="mt-1 text-[11.5px]" style={{ color: MUTED }}>Polling Razorpay for payment… this flips to <b>Recovered</b> (real) the moment the test checkout completes.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTIONS */}
      <div className="rounded-[14px] border border-black/[0.07] bg-white mt-4 divide-y divide-black/[0.06]">
        {/* 1 · DIAGNOSIS */}
        {has.diagnosis && (
          <Section show={reveal >= 1} icon="brain" title="What Sentinel sees">
            <div className="text-[14px]">
              <span className="font-semibold">Root cause: {p.diagnosisClass}</span>
              <span className="font-semibold ml-2" style={{ color: GREEN }}>· {confPct(p.confidence)} confidence</span>
            </div>
            {p.diagnosisWhy && <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: MUTED }}>{p.diagnosisWhy}</p>}
            <div className="mt-2 text-[11.5px]" style={{ color: MUTED }}>
              Diagnosed by {p.diagnosisSource === 'gemini' ? 'Google Gemini' : 'the deterministic rules engine'}
            </div>
          </Section>
        )}

        {/* 2 · DECISION */}
        {has.decision && (
          <Section show={reveal >= (has.diagnosis ? 2 : 1)} icon="shield" title="The right move">
            <span className="inline-block px-2.5 py-1 rounded-md text-[13px] font-semibold" style={{ background: '#EAF1FE', color: '#3B5BDB' }}>
              {ACTION_LABEL[p.chosenAction] || p.chosenAction}
            </span>
            {p.status === 'stopped' && p.stopReason && (
              <div className="mt-2 rounded-md px-3 py-2 text-[12.5px] font-medium" style={{ background: '#FDECEC', color: '#C62B38' }}>
                Halted before acting: {p.stopReason}
              </div>
            )}
            <div className="mt-2.5 rounded-lg border border-black/[0.06] bg-[#fafafa] px-3 py-2.5 grid sm:grid-cols-2 gap-y-1.5 gap-x-4 text-[12.5px]">
              <Check ok={stopEvent ? stopEvent.outcome === 'passed' : true}>
                {stopEvent ? `Stopping rules ${stopEvent.outcome === 'passed' ? 'passed' : stopEvent.outcome}` : 'Stopping rules passed'}
              </Check>
              <Check ok={(p.retriesUsed || 0) < 3}>Under 3-attempt cap ({p.retriesUsed || 0}/3)</Check>
              <Check ok>{RETRIABLE.has(p.chosenAction) ? 'Retriable action per policy' : 'Non-retriable — customer contact only'}</Check>
              <Check ok>Action matches diagnosis class</Check>
            </div>
          </Section>
        )}

        {/* 3 · ACTION */}
        {has.action && (
          <Section show={reveal >= [has.diagnosis, has.decision].filter(Boolean).length + 1} icon="send" title="What Sentinel does">
            <div className="text-[13.5px]">
              {ACTION_LABEL[p.chosenAction] || 'Recovery action'} sent
              {execEvent && <span style={{ color: MUTED }}> · {ago(execEvent.ts)}</span>}
            </div>
            {msg && (
              <div className="mt-2 flex items-start gap-2">
                <div className="flex items-center gap-1 rounded-[8px] border border-black/10 p-0.5 bg-white shrink-0">
                  <Lang active={lang === 'hi'} onClick={() => setLang('hi')}>Hinglish</Lang>
                  <Lang active={lang === 'en'} onClick={() => setLang('en')}>English</Lang>
                </div>
              </div>
            )}
            {msg && (
              <div className="mt-2 max-w-[85%] rounded-xl rounded-tl-[3px] px-3.5 py-2.5 text-[13px] leading-relaxed" style={{ background: '#DCF8C6', color: '#0b3d2e' }}>
                {msg}
                {p.paymentLinkUrl && <div className="mt-1.5 underline break-all" style={{ color: '#1a73e8' }}>{p.paymentLinkUrl}</div>}
              </div>
            )}
          </Section>
        )}

        {/* 4 · OUTCOME */}
        {has.outcome && (
          <Section show={reveal >= totalSections} icon="check" title="Outcome">
            <div className="text-[15px] font-bold" style={{ color: GREEN }}>
              Payment recovered · Revenue saved: +{inr(Math.round((p.recoveredAmount || p.amount) / 100))}
            </div>
            {/* honest provenance: real Razorpay-confirmed vs modeled */}
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-0.5 rounded-full"
              style={p.recoveredVia === 'razorpay_paid' ? { background: '#E7F4EF', color: '#0F6E56' } : { background: '#F1F1EE', color: '#7a7a75' }}>
              {p.recoveredVia === 'razorpay_paid'
                ? '✓ Real — confirmed by a Razorpay test-mode payment'
                : 'Modeled outcome — scored vs the naive baseline'}
            </div>
            <p className="mt-2 font-mono text-[11.5px] leading-relaxed" style={{ color: MUTED }}>
              Detected {at('ingest')} → Diagnosed {at('diagnose')} → Decided {at('decide')} → {ACTION_LABEL[p.chosenAction] ? 'Action' : 'Sent'} {at('execute')} → Recovered {at('outcome', 'success')}
            </p>
          </Section>
        )}

        {/* nothing yet */}
        {!has.diagnosis && (
          <div className="p-6 text-[13px]" style={{ color: MUTED }}>
            Detected and queued — run the recovery batch to generate the diagnosis, decision and outcome for this case.
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ show, icon, title, children }) {
  return (
    <div className="p-5" style={{ opacity: show ? 1 : 0.25, transform: show ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity .5s ease, transform .5s ease' }}>
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-[7px] grid place-items-center shrink-0" style={{ background: '#EDEDE8', color: INK }}>
          <Glyph icon={icon} />
        </span>
        <span className="text-[15px] font-bold">{title}</span>
      </div>
      <div className="mt-2.5 pl-8">{children}</div>
    </div>
  );
}
function Kv({ k, v, tone = '#3a3a3e', bg = '#F2F2EF' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[12px]" style={{ background: bg }}>
      <span style={{ color: '#9a9a95' }}>{k}</span>
      <span style={{ color: tone }}>{v || '—'}</span>
    </span>
  );
}
function Check({ ok, children }) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ color: ok ? GREEN : '#C62B38' }} className="font-bold">{ok ? '✓' : '✗'}</span>
      <span style={{ color: '#3a3a3e' }}>{children}</span>
    </span>
  );
}
function Lang({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="h-6 px-2 rounded-[6px] text-[11.5px] font-medium transition"
      style={active ? { background: INK, color: '#fff' } : { color: MUTED }}>{children}</button>
  );
}
function Glyph({ icon }) {
  const d = {
    brain: 'M9 3a2.7 2.7 0 00-2.7 2.7A2.7 2.7 0 005 11v1.5A2.7 2.7 0 009 15M15 3a2.7 2.7 0 012.7 2.7A2.7 2.7 0 0119 11v1.5A2.7 2.7 0 0115 15M12 4v11',
    shield: 'M12 3l7 3v5c0 4.4-3 7.4-7 8.8-4-1.4-7-4.4-7-8.8V6z M9 12l2 2 4-4',
    send: 'M4 12l16-7-7 16-2-6z',
    check: 'M4 12l5 5 11-11',
  }[icon];
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {d.split(' M').map((seg, i) => <path key={i} d={(i ? 'M' : '') + seg} />)}
    </svg>
  );
}
