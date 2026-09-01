import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconChevron, IconActivity, IconMinus, IconPlus, IconShield, IconMic, IconPlay } from '../components/Icons.jsx';
import Logo from '../components/Logo.jsx';
import SentinelLogo from '../components/SentinelLogo.jsx';

// Paddle-style marketing landing page for Sentinel:
//   • a soft pastel-gradient hero, and
//   • a floating collage of product cards revealed on scroll.
// The console (everything behind "Open console") keeps the clean white theme.

export default function Landing() {
  return (
    <div className="min-h-screen text-ink bg-[#F3EDF3]">
      {/* soft blue→cream gradient wallpaper behind hero + showcase */}
      <div className="relative overflow-hidden" style={{ backgroundImage: 'url(/hero-gradient.png)', backgroundSize: 'cover', backgroundPosition: 'top center' }}>
        {/* soft white wash so the blue & yellow are gentle, not saturated */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] via-white/[0.34] to-white/[0.5]" />
        {/* a bright white bloom in the middle for a premium, airy feel */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 50% 38%, rgba(255,255,255,0.45), transparent 72%)' }} />
        {/* fade the gradient into white toward the bottom so the showcase blends out */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-white to-transparent" />
        {/* furnished bluish-white wash at the very top, behind the glass nav */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44" style={{ background: 'linear-gradient(180deg, rgba(176,203,247,0.42) 0%, rgba(214,228,250,0.16) 45%, transparent 100%)' }} />
        <NavBar />
        <Hero />
        <Showcase />
      </div>
      <SolvedDemo />
      <WhyItMatters />
      <ProblemNoOneTalks />
      <RevenueSlips />
      <RecoveryLoop />
      <MeasuredResults />
      <RecoveryEngineDiagram />
      <VoiceAgentSection />
      <WhyItsSafe />
      <NightShift />
      <FAQ />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ Nav */
const NAV = [
  { label: 'Platform', to: 'top' },
  { label: 'Actual Case', to: 'actual-case' },
  { label: 'Problem', to: 'the-problem' },
  { label: 'How it works', to: 'how-it-works' },
  { label: 'Agentic Recovery', to: 'agentic-recovery' },
  { label: "Why it's safe", to: 'why-its-safe' },
  { label: 'API docs', to: '/docs' },
];
function scrollToId(id) {
  if (id === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function NavBar() {
  return (
    <header className="relative z-20">
      <div className="h-[76px] pl-3 pr-5 lg:pl-5 lg:pr-8 flex items-center justify-between relative">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <SentinelLogo size={38} radius={10} />
          <Logo size={22} />
        </Link>
        {/* nav links floating in an apple-glass bar — centered in the header */}
        <nav
          className="hidden lg:flex items-center gap-0.5 px-1.5 h-11 rounded-full absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          style={{
            background: 'rgba(255,255,255,0.42)',
            backdropFilter: 'blur(18px) saturate(170%)',
            WebkitBackdropFilter: 'blur(18px) saturate(170%)',
            border: '1px solid rgba(255,255,255,0.65)',
            boxShadow: '0 8px 24px -10px rgba(40,72,140,0.28), inset 0 1px 0 rgba(255,255,255,0.75)',
          }}
        >
          {NAV.map((n) => (
            n.to.startsWith('/') ? (
              <Link
                key={n.label}
                to={n.to}
                className="flex items-center gap-1 px-3 h-8 rounded-full text-[13.5px] font-medium text-ink/75 hover:text-ink hover:bg-white/60 cursor-pointer transition-colors"
              >
                {n.label}
              </Link>
            ) : (
              <button
                key={n.label}
                onClick={() => scrollToId(n.to)}
                className="flex items-center gap-1 px-3 h-8 rounded-full text-[13.5px] font-medium text-ink/75 hover:text-ink hover:bg-white/60 cursor-pointer transition-colors"
              >
                {n.label}
              </button>
            )
          ))}
        </nav>
      <div className="flex items-center gap-2.5">
        <Link
          to="/app/overview"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] bg-accent text-white text-[14px] font-semibold hover:brightness-95 transition shadow-sm"
        >
          Open console
        </Link>
      </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------- Real-data results card */
function ResultsModal({ onClose }) {
  const [m, setM] = useState(null);
  const [pays, setPays] = useState([]);
  const [audit, setAudit] = useState([]);
  const [p, setP] = useState(0);
  useEffect(() => {
    fetch('/api/metrics').then((r) => r.json()).then(setM).catch(() => {});
    fetch('/api/payments').then((r) => r.json()).then(setPays).catch(() => {});
    fetch('/api/audit').then((r) => r.json()).then(setAudit).catch(() => {});
  }, []);
  useEffect(() => {
    if (!m) return;
    const t0 = Date.now();
    const id = setInterval(() => { const pr = Math.min(1, (Date.now() - t0) / 1000); setP(1 - Math.pow(1 - pr, 3)); if (pr >= 1) clearInterval(id); }, 30);
    return () => clearInterval(id);
  }, [m]);

  const d = m || { sentinel: {}, baseline: {}, batch: {}, comparison: {} };
  const rupee = (n) => '₹' + Math.round((n || 0) * p).toLocaleString('en-IN');
  const cnt = (n) => Math.round((n || 0) * p);
  const rate = (d.sentinel.recoveryRatePct || 0) * p;
  const lift = m ? (m.sentinel.recoveryRatePct - m.baseline.recoveryRatePct) * p : 0;
  const fallback = audit.filter((e) => ['send_failed', 'call_failed', 'live-failed'].includes(e.outcome)).length
    + pays.filter((x) => x.status === 'recovered' && x.retriesUsed >= 2).length;

  const Stat = ({ label, value, tone }) => (
    <div className="rounded-[12px] border border-hairline bg-white px-3.5 py-3">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className={`mt-0.5 text-[19px] font-semibold tracking-tight2 tabular-nums ${tone === 'good' ? 'text-good' : tone === 'stop' ? 'text-stop' : 'text-ink'}`}>{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 text-left">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[560px] rounded-[22px] bg-white border border-hairline shadow-[0_50px_120px_-30px_rgba(0,0,0,0.55)] overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-hairline flex items-center gap-2.5">
          <span className="relative flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full bg-good opacity-60 animate-ping" /><span className="relative inline-flex w-2 h-2 rounded-full bg-good" /></span>
          <span className="text-[13px] font-semibold text-ink">Live batch results</span>
          <span className="text-[12px] text-faint">· real data, no mock-ups</span>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full grid place-items-center text-muted hover:bg-surface"><IconClose size={14} /></button>
        </div>
        <div className="p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[12.5px] text-muted">Recovery rate</div>
              <div className="text-[46px] font-semibold tracking-tight2 tabular-nums text-ink leading-none">{rate.toFixed(1)}%</div>
              <div className="mt-1 text-[13px] text-good font-medium">↑ +{lift.toFixed(1)} pts vs naive baseline</div>
            </div>
            <div className="text-right">
              <div className="text-[12.5px] text-muted">Money recovered</div>
              <div className="text-[26px] font-semibold tracking-tight2 tabular-nums text-good">{rupee(d.sentinel.moneyRecovered)}</div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Recovered" value={`${cnt(d.batch.recoveredCount)} of ${d.batch.total ?? 0}`} tone="good" />
            <Stat label="Amount at risk" value={rupee(d.batch.amountAtRisk)} />
            <Stat label="Naive baseline" value={`${((d.baseline.recoveryRatePct || 0) * p).toFixed(1)}%`} />
            <Stat label="Extra recovered" value={rupee(d.comparison.extraRecovered)} tone="good" />
            <Stat label="Net benefit" value={'+' + rupee(d.comparison.netBenefit)} tone="good" />
            <Stat label="Fallback saves" value={cnt(fallback)} />
          </div>
          <Link to="/app/overview" className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">Open the full dashboard <IconArrowRight size={14} /></Link>
        </div>
      </div>
    </div>
  );
}
function IconClose(p) { return (<svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>); }

/* ------------------------------------------------------------------ Hero */
function Hero() {
  const [resultsOpen, setResultsOpen] = useState(false);
  return (
    <section className="relative z-10 max-w-[1000px] mx-auto px-6 pt-16 pb-10 lg:pt-24 text-center">
      <h1 className="text-[46px] sm:text-[64px] lg:text-[76px] leading-[0.98] font-bold tracking-tight2 text-ink">
        <span className="font-display-serif italic font-medium text-white">Catch revenue</span> before
        <br className="hidden sm:block" /> it’s gone. Win it back
        <br className="hidden sm:block" /> automatically.
      </h1>
      <p className="mt-6 text-[17px] lg:text-[19px] text-ink/70 max-w-[640px] mx-auto leading-relaxed">
        An AI agent that detects failed payments, diagnoses the real reason, and recovers the
        money — safely, with every decision logged.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          to="/app/overview"
          className="inline-flex items-center gap-2 h-12 px-6 rounded-[12px] bg-ink text-white text-[15px] font-semibold hover:bg-black transition shadow-sm"
        >
          Open console <IconArrowRight size={17} />
        </Link>
        <button onClick={() => setResultsOpen(true)} className="text-[13px] font-medium text-accent hover:underline inline-flex items-center gap-1">See the real-data results <IconArrowRight size={14} /></button>
        <span className="text-black/15">·</span>
        <Link to="/docs" className="text-[13px] font-medium text-accent hover:underline inline-flex items-center gap-1">See API docs <IconArrowRight size={14} /></Link>
      </div>
      {resultsOpen && <ResultsModal onClose={() => setResultsOpen(false)} />}
    </section>
  );
}

/* ------------------------------------------------------------------ Showcase collage */
function Showcase() {
  return (
    <section className="relative z-10 pt-8 lg:pb-0">
      {/* Fixed-height stage: every card is taller than its slot, so they all clip
          at the SAME bottom line (bottom-anchored, bleeding off).
          Tops form a symmetric pyramid: Case peaks, Live & Recovery one step down,
          Revenue & Activity lowest. A soft fade dissolves the card bottoms. */}
      <div className="relative lg:h-[590px] lg:overflow-hidden">
        {/* Overlapping z-fan (no gaps): Case/Invoice is in FRONT; each neighbour
            tucks behind the more-central card, so the grey glass-frame edge peeks
            where one card slides under the next. */}
        <div className="px-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-center lg:gap-0 lg:w-max lg:mx-auto lg:scale-[0.86] lg:origin-top">
          {/* 1 · Revenue at Risk — lowest level, behind col 2 (enters last) */}
          <div className="w-full lg:w-[312px] lg:mt-[236px] lg:h-[440px] lg:overflow-hidden relative z-10 card-in" style={{ animationDelay: '420ms' }}>
            <RevenueAtRisk />
          </div>
          {/* 2 · Live Recovery Impact + Set up an alert — behind Case (enters 2nd) */}
          <div className="w-full lg:w-[300px] lg:-ml-10 lg:mt-[100px] lg:h-[576px] lg:overflow-hidden flex flex-col gap-3 relative z-20 card-in" style={{ animationDelay: '220ms' }}>
            <LiveRecoveryImpact />
            <SetUpAlert />
          </div>
          {/* 3 · Case / Invoice — the peak: highest, biggest, FRONT-most (enters 1st) */}
          <div className="w-full lg:w-[500px] lg:-ml-10 lg:mt-[40px] lg:h-[636px] lg:overflow-hidden relative z-40 card-in" style={{ animationDelay: '40ms' }}>
            <CaseInvoice />
          </div>
          {/* 4 · Recovery Credits + Plan settings — behind Case (enters 2nd) */}
          <div className="w-full lg:w-[330px] lg:-ml-10 lg:mt-[100px] lg:h-[576px] lg:overflow-hidden flex flex-col gap-3 relative z-20 card-in" style={{ animationDelay: '220ms' }}>
            <RecoveryCredits />
            <PlanSettings />
          </div>
          {/* 5 · Activity feed — lowest level, behind col 4 (enters last) */}
          <div className="w-full lg:w-[252px] lg:-ml-10 lg:mt-[196px] lg:h-[480px] lg:overflow-hidden relative z-10 card-in" style={{ animationDelay: '420ms' }}>
            <ActivityFeed />
          </div>
        </div>
        {/* barely-there fade so the hard clip edge isn't a harsh pixel line */}
        <div className="hidden lg:block pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-b from-transparent to-[#F4E7EB]" />
      </div>
    </section>
  );
}

/* -------- card shell -------- */
function Card({ children, className = '', bring }) {
  // Liquid-glass frame: a translucent frosted-white rim (backdrop-blurred so the
  // pastel gradient shows through the corners) wrapping an opaque white card.
  return (
    <div
      className={`rounded-[30px] p-[18px] border border-white/70 backdrop-blur-xl bg-gradient-to-b from-white/70 to-white/25 ${
        bring
          ? 'shadow-[0_20px_55px_-16px_rgba(16,24,40,0.30)]'
          : 'shadow-[0_12px_36px_-14px_rgba(16,24,40,0.22)]'
      }`}
    >
      {/* subtle top sheen highlight for the glass */}
      <div
        className={`bg-white rounded-[17px] border border-black/[0.07] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-white/60 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
const H = ({ children }) => <div className="text-[15px] font-semibold text-ink mb-3">{children}</div>;

/* -------- Revenue at Risk -------- */
function RevenueAtRisk() {
  const rows = [
    ['Failed payments', 'failed_payments'],
    ['Checkout abandonment', 'abandoned_checkouts'],
    ['Overdue invoices', 'overdue_invoices'],
    ['Subscription failures', 'subscription_failures'],
    ['Payment retries', 'payment_retries'],
    ['Promise to pay', 'promise_to_pay'],
  ];
  return (
    <Card className="lg:p-6">
      <H>Revenue at Risk</H>
      <div className="space-y-7 mt-2">
        {rows.map(([t, code]) => (
          <div key={code} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-[#F4F1FB] text-accent grid place-items-center shrink-0">
              <IconActivity size={17} />
            </span>
            <div className="leading-tight">
              <div className="text-[14px] font-medium text-ink">{t}</div>
              <div className="text-[12px] text-ink/40 font-mono">{code}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* -------- Live Recovery Impact -------- */
function LiveRecoveryImpact() {
  const [recovered, setRecovered] = useState(null);
  useEffect(() => { fetch('/api/metrics').then((r) => r.json()).then((m) => setRecovered(m?.sentinel?.moneyRecovered)).catch(() => {}); }, []);
  const val = recovered != null ? '₹' + recovered.toLocaleString('en-IN') + '.00' : '—';
  return (
    <Card>
      <div className="flex items-center">
        <H>Live Recovery Impact</H>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-good -mt-2">
          <span className="relative flex w-1.5 h-1.5"><span className="absolute inline-flex w-full h-full rounded-full bg-good opacity-60 animate-ping" /><span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-good" /></span>
          Live
        </span>
      </div>
      <div className="text-[30px] font-bold tracking-tight2 text-ink tabular-nums">{val}</div>
      <ImpactChart />
    </Card>
  );
}
function ImpactChart() {
  // Four series that rise left→right, drawing in live with a pulsing lead dot.
  const series = [
    { c: '#4B63E6', d: 'M60,96 L95,101 L120,86 L150,84 L185,66 L215,60 L245,44 L290,34', end: [290, 34] },
    { c: '#8B5CF6', d: 'M60,103 L95,107 L120,95 L150,92 L185,78 L215,72 L245,58 L290,50' },
    { c: '#22C08A', d: 'M60,110 L95,113 L120,105 L150,103 L185,92 L215,88 L245,76 L290,68' },
    { c: '#F0B429', d: 'M60,117 L95,120 L120,116 L150,114 L185,106 L215,103 L245,94 L290,88' },
  ];
  return (
    <svg viewBox="0 0 300 140" className="w-full h-[232px] mt-4" preserveAspectRatio="none">
      <defs>
        <linearGradient id="liv-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4B63E6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4B63E6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* soft area under the top line, fading in after it draws */}
      <path d="M60,96 L95,101 L120,86 L150,84 L185,66 L215,60 L245,44 L290,34 L290,140 L60,140 Z" fill="url(#liv-fill)" opacity="0" style={{ animation: 'ov-fill-in .6s ease 1.1s both' }} />
      {series.map((s, i) => (
        <path key={s.c} d={s.d} fill="none" stroke={s.c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `ov-draw 1.25s ease-out ${0.15 + i * 0.12}s forwards` }} />
      ))}
      {/* traveling dot along the top line, then a pulsing lead dot */}
      <circle r="3.2" fill="#4B63E6" style={{ offsetPath: "path('M60,96 L95,101 L120,86 L150,84 L185,66 L215,60 L245,44 L290,34')", animation: 'ov-travel 1.25s ease-out .15s forwards' }} />
      <circle cx="290" cy="34" r="4" fill="#4B63E6" className="animate-pulse" style={{ opacity: 0, animation: 'ov-fill-in .3s ease 1.4s forwards' }} />
    </svg>
  );
}

/* -------- Set up an alert -------- */
function SetUpAlert() {
  const rows = [
    ['If', '₹ 10.00', 'tier_1'],
    ['Then', '₹ 50.00', 'tier_2'],
    ['If', '₹ 100.00', 'tier_3'],
    ['Then', '₹ 250.00', 'tier_4'],
  ];
  return (
    <Card>
      <H>Set up an alert</H>
      <div className="rounded-xl border border-black/[0.06] overflow-hidden">
        {rows.map(([k, v, tier], i) => (
          <div
            key={tier}
            className={`grid grid-cols-[52px_1fr_auto] items-center text-[13px] ${
              i > 0 ? 'border-t border-black/[0.05]' : ''
            }`}
          >
            <div className="px-3 py-2.5 text-ink/60 font-medium">{k}</div>
            <div className="px-3 py-2.5 tabular-nums text-ink border-l border-black/[0.05]">{v}</div>
            <div className="px-3 py-2.5 text-ink/40 font-mono border-l border-black/[0.05]">{tier}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* -------- Case / Invoice (hero card) -------- */
function CaseInvoice() {
  const [atRisk, setAtRisk] = useState(null);
  useEffect(() => { fetch('/api/metrics').then((r) => r.json()).then((m) => setAtRisk(m?.batch?.amountAtRisk)).catch(() => {}); }, []);
  const asOf = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const atRiskStr = atRisk != null ? '₹' + atRisk.toLocaleString('en-IN') + '.00' : '—';
  const actions = [
    ['Smart retry', '3', '₹500.00', '68%', '₹1,500.00'],
    ['Update-card link', '2', '₹500.00', '34%', '₹1,000.00'],
    ['WhatsApp reminder', '5', '₹100.00', '44%', '₹500.00'],
  ];
  return (
    <Card bring>
      <div className="flex items-start justify-between">
        <div className="text-[15px] font-semibold">Case / Invoice</div>
        <span className="w-8 h-8 rounded-lg bg-ink grid place-items-center">
          <IconActivity size={15} className="text-white" />
        </span>
      </div>

      <div className="mt-4 space-y-1.5 text-[13px]">
        <Row label="Case ID" value="SEN-23RF-020-003" />
        <Row label="Detected on" value="26 Aug, 2026" />
        <Row label="Risk window" value="30 days" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-[12.5px] leading-relaxed">
        <div>
          <div className="text-ink/45 mb-0.5">From</div>
          <div className="text-ink font-medium">Sentinel Systems Pvt Ltd</div>
          <div className="text-ink/55">4th Floor, Prestige Tech Park</div>
          <div className="text-ink/55">Marathahalli, Bengaluru 560103, India</div>
          <div className="text-ink/45 mt-1">GSTIN: 29ABCDE1234F1Z5</div>
        </div>
        <div>
          <div className="text-ink/45 mb-0.5">Customer</div>
          <div className="text-ink font-medium">VantagePoint Retail Pvt Ltd</div>
          <div className="text-ink/55">12 MG Road, Connaught Place</div>
          <div className="text-ink/55">New Delhi 110001, India</div>
          <div className="text-ink/45 mt-1">GSTIN: 07AABCV1234E1Z5</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[24px] font-bold tracking-tight2">{atRiskStr}</div>
        <div className="text-[12px] text-ink/50">At Risk as of {asOf}</div>
      </div>

      <table className="mt-4 w-full text-[12.5px]">
        <thead>
          <tr className="text-ink/45 text-left">
            <th className="font-medium py-1.5">Recovery actions</th>
            <th className="font-medium py-1.5 text-right">Units</th>
            <th className="font-medium py-1.5 text-right">Unit cost</th>
            <th className="font-medium py-1.5 text-right">Success %</th>
            <th className="font-medium py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => (
            <tr key={a[0]} className="border-t border-black/[0.05]">
              <td className="py-2 text-ink font-medium">{a[0]}</td>
              <td className="py-2 text-right tabular-nums text-ink/70">{a[1]}</td>
              <td className="py-2 text-right tabular-nums text-ink/70">{a[2]}</td>
              <td className="py-2 text-right tabular-nums text-ink/70">{a[3]}</td>
              <td className="py-2 text-right tabular-nums text-ink">{a[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 pt-3 border-t border-black/[0.06] space-y-1.5 text-[12.5px]">
        <Row label="Subtotal (excl. GST)" value="₹3,000.00" />
        <Row label="CGST (9%)" value="₹270.00" />
        <Row label="SGST (9%)" value="₹270.00" />
        <div className="flex items-center justify-between pt-1.5 border-t border-black/[0.06] font-semibold text-ink">
          <span>Total (incl. GST)</span>
          <span className="tabular-nums">₹3,540.00</span>
        </div>
      </div>
    </Card>
  );
}
function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink/50">{label}</span>
      <span className="text-ink font-medium tabular-nums">{value}</span>
    </div>
  );
}

/* -------- Recovery Credits -------- */
function RecoveryCredits() {
  const [m, setM] = useState(null);
  useEffect(() => { fetch('/api/metrics').then((r) => r.json()).then(setM).catch(() => {}); }, []);
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const interventions = m?.sentinel?.interventions ?? 0;
  const contacts = m?.sentinel?.contacts ?? 0;
  const rows = [
    { t: 'Interventions run', d: today, c: `-${interventions} credits`, amt: `₹${interventions}.00`, sign: 'minus' },
    { t: 'Customer contacts', d: today, c: `-${contacts} credits`, amt: `₹${contacts}.00`, sign: 'minus' },
    { t: 'Monthly allotment', d: monthStart, c: '+100 credits', amt: '₹100.00', sign: 'plus' },
  ];
  return (
    <Card>
      <H>Recovery Credits</H>
      <div className="space-y-6">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#F4F4F6] grid place-items-center shrink-0 text-ink/60">
              {r.sign === 'plus' ? <IconPlus size={15} /> : <IconMinus size={15} />}
            </span>
            <div className="flex-1 leading-tight">
              <div className="text-[13.5px] font-medium text-ink">{r.t}</div>
              <div className="text-[12px] text-ink/40">{r.d}</div>
            </div>
            <div className="text-right leading-tight">
              <div className={`text-[13px] font-semibold ${r.sign === 'plus' ? 'text-good' : 'text-ink'}`}>{r.c}</div>
              <div className="text-[12px] text-ink/40 tabular-nums">{r.amt}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* -------- Plan settings -------- */
function PlanSettings() {
  return (
    <Card>
      <H>Plan settings</H>
      <label className="block text-[12.5px] text-ink/55 mb-1.5">Plan name</label>
      <div className="h-10 px-3 flex items-center rounded-[10px] border border-black/[0.08] text-[13.5px] text-ink">
        Starter
      </div>
      <label className="block text-[12.5px] text-ink/55 mb-1.5 mt-3">Plan interval</label>
      <div className="h-10 px-3 flex items-center justify-between rounded-[10px] border border-black/[0.08] text-[13.5px] text-ink">
        Monthly <IconChevron size={15} className="text-ink/40" />
      </div>
      <label className="block text-[12.5px] text-ink/55 mb-1.5 mt-3">Billing currency</label>
      <div className="h-10 px-3 flex items-center justify-between rounded-[10px] border border-black/[0.08] text-[13.5px] text-ink">
        INR (₹) <IconChevron size={15} className="text-ink/40" />
      </div>
    </Card>
  );
}

/* -------- Activity feed -------- */
function ActivityFeed() {
  const [audit, setAudit] = useState([]);
  useEffect(() => { fetch('/api/audit').then((r) => r.json()).then(setAudit).catch(() => {}); }, []);
  const fmt = (ts) => new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  const items = audit.slice(0, 10);
  return (
    <Card>
      <H>Activity feed</H>
      <div>
        {(items.length ? items : Array.from({ length: 10 })).map((e, i) => (
          <div key={i} className={`py-2.5 ${i > 0 ? 'border-t border-black/[0.05]' : ''}`}>
            {e ? (
              <div className="flex items-center gap-2 text-[12.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-ink/45 tabular-nums shrink-0">{fmt(e.ts)}</span>
                <span className="text-ink/70 truncate">{(e.decision || e.action || '').replace(/^Tool:\s*/, '').slice(0, 30)}</span>
              </div>
            ) : (
              <div className="h-4 rounded bg-black/[0.04]" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ The problem (dark) */
const PROBLEMS = [
  { k: 'degradation', t: 'Payment degradation', d: 'Success rates slip as retries, timeouts and gateway errors quietly pile up.' },
  { k: 'checkout', t: 'Checkout drop-off', d: 'Customers reach the payment step and leave without ever completing.' },
  { k: 'subscription', t: 'Failed subscription', d: 'Renewals decline and active plans silently lapse to churn.' },
  { k: 'invoice', t: 'Overdue invoice', d: 'B2B invoices age past due while no one follows up.' },
  { k: 'mandate', t: 'Mandate failure', d: 'AutoPay mandates expire or can’t be charged on time.' },
  { k: 'promise', t: 'Broken promise to pay', d: 'A payment is promised, then never actually lands.' },
];

function TheProblem() {
  return (
    <section className="bg-black text-white">
      <div className="max-w-[1200px] mx-auto px-6 py-24 lg:py-28">
        <span className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full text-[12px] font-semibold tracking-[0.14em] uppercase bg-green-500/15 border border-green-500/35 text-green-300">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> The problem
        </span>
        <h2 className="text-3d mt-5 text-[34px] sm:text-[48px] lg:text-[56px] leading-[1.06] font-semibold tracking-tight2 max-w-[900px]">
          Revenue rarely disappears all at once.
        </h2>
        <p className="mt-5 text-[16px] lg:text-[18px] text-white/55 leading-relaxed max-w-[720px]">
          A payment fails. A customer leaves checkout. A subscription doesn’t renew. An invoice goes
          unpaid. Small signals quietly turn into lost revenue.
        </p>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROBLEMS.map((p) => (
            <div key={p.t} className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5">
              <span className="w-11 h-11 rounded-xl bg-accent-soft border border-accent/15 grid place-items-center text-accent">
                <ProblemIcon k={p.k} />
              </span>
              <div className="mt-4 text-[16px] font-semibold text-ink">{p.t}</div>
              <p className="mt-1.5 text-[13.5px] text-muted leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-[13px] text-white/40">
          This section answers — <span className="text-white/75 font-medium">what is going wrong?</span>
        </div>
      </div>
    </section>
  );
}

function ProblemIcon({ k }) {
  const p = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (k === 'degradation') return (<svg {...p}><polyline points="3 12 7 12 10 5 14 19 17 12 21 12" /></svg>);
  if (k === 'checkout') return (<svg {...p}><circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /><path d="M2 3h2l2.5 12.5a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8L20 7H6" /></svg>);
  if (k === 'subscription') return (<svg {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>);
  if (k === 'invoice') return (<svg {...p}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><line x1="9" y1="13" x2="16" y2="13" /><line x1="9" y1="17" x2="14" y2="17" /></svg>);
  if (k === 'mandate') return (<svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /><path d="M10 14l4 4M14 14l-4 4" /></svg>);
  return (<svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>);
}

/* -------------------------------------------------- Living full-page cover */
const COVER_PETALS = [
  { l: '52%', t: '82%', s: 7, d: 0, dur: 11, c: '#F7B8D4' },
  { l: '68%', t: '72%', s: 6, d: 2.5, dur: 13, c: '#F9C9DE' },
  { l: '80%', t: '88%', s: 8, d: 4, dur: 10, c: '#F7B8D4' },
  { l: '90%', t: '64%', s: 6, d: 1.2, dur: 12, c: '#FBD5E6' },
  { l: '61%', t: '92%', s: 7, d: 5.5, dur: 14, c: '#F7B8D4' },
  { l: '74%', t: '58%', s: 5, d: 3.2, dur: 12, c: '#F9C9DE' },
];
function CoverImage() {
  return (
    <section className="relative w-full h-screen min-h-[560px] overflow-hidden bg-[#0a3a52]">
      {/* base scene, slowly drifting (ken burns) */}
      <img src="/cover-cliff.png" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ animation: 'cover-kenburns 28s ease-in-out infinite alternate' }} />

      {/* water glimmer — a soft, lineless light drifting over the sea */}
      <div className="absolute inset-y-0 left-0 w-[47%] pointer-events-none overflow-hidden" style={{ mixBlendMode: 'screen' }}>
        <div className="absolute -inset-1/3" style={{ background: 'radial-gradient(40% 30% at 40% 45%, rgba(255,255,255,0.16), transparent 70%)', animation: 'cover-sweep 12s ease-in-out infinite' }} />
      </div>

      {/* drifting flower petals over the meadow */}
      {COVER_PETALS.map((p, i) => (
        <span key={i} className="absolute rounded-full pointer-events-none" style={{ left: p.l, top: p.t, width: p.s, height: p.s, background: p.c, filter: 'blur(0.5px)', boxShadow: `0 0 6px ${p.c}`, animation: `cover-petal ${p.dur}s ease-in-out ${p.d}s infinite` }} />
      ))}

      {/* faint grass-tip glimmer breathing */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 80% at 78% 60%, rgba(255,255,255,0.10), transparent 55%)', mixBlendMode: 'soft-light', animation: 'cover-sweep 14s ease-in-out infinite' }} />

      {/* live dashboard floating over the scene — smaller than the image, fully interactive */}
      <div className="absolute z-20 inset-x-0 top-1/2 -translate-y-1/2 flex justify-center px-4">
        <div className="w-[820px] max-w-full rounded-[16px] overflow-hidden bg-white shadow-[0_60px_140px_-30px_rgba(0,0,0,0.65)] ring-1 ring-black/10">
          {/* browser chrome */}
          <div className="flex items-center gap-2 h-9 px-4 bg-[#F3F4F8] border-b border-black/[0.06]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            <span className="ml-3 text-[11px] text-ink/50 tracking-tight">sentinel · overview</span>
            <Link to="/app/overview" className="ml-auto text-[11px] font-semibold text-accent hover:underline">Open full ↗</Link>
          </div>
          {/* the real dashboard, live and scaled down */}
          <div className="relative w-full overflow-hidden bg-white" style={{ height: 500 }}>
            <iframe src="/app/overview" title="Live dashboard" loading="lazy" className="border-0" style={{ width: 1520, height: 950, transform: 'scale(0.5395)', transformOrigin: 'top left' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- Solved demo (interactive scenarios) */
const SOLVE_SCENARIOS = [
  {
    key: 'bank', label: 'Bank downtime', at: '₹4,999',
    steps: [
      ['Issue detected', 'Payment failed — gateway timeout'],
      ['Root cause', 'Issuing bank temporarily unavailable · transient'],
      ['Best intervention', 'Smart retry after a short cool-down'],
      ['Policy check', 'Within retry window · ≤ 3 attempts ✓'],
      ['Action executed', 'Silent auto-retry #2'],
    ],
    outcome: ['Payment received', '+₹4,999'],
  },
  {
    key: 'funds', label: 'Insufficient funds', at: '₹2,199',
    steps: [
      ['Issue detected', 'Card declined — insufficient funds'],
      ['Root cause', 'Temporary balance shortage'],
      ['Best intervention', 'Delayed retry near payday + gentle reminder'],
      ['Policy check', 'Contact cap respected · no spam ✓'],
      ['Action executed', 'WhatsApp reminder, then a timed retry'],
    ],
    outcome: ['Payment received', '+₹2,199'],
  },
  {
    key: 'rbi', label: 'RBI mandate breach', at: '₹18,500',
    steps: [
      ['Issue detected', 'AutoPay mandate could not be charged (> ₹15,000)'],
      ['Root cause', 'RBI e-mandate additional-authentication block'],
      ['Best intervention', 'Send a re-authorization link — not a blind retry'],
      ['Policy check', 'Within notice period · customer opted in ✓'],
      ['Action executed', 'Re-auth link sent via WhatsApp'],
    ],
    outcome: ['Payment re-authorized', '+₹18,500'],
  },
];
const _dg = (inner) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const DOCK_ICONS = [
  { bg: 'linear-gradient(180deg,#BCE2FF,#2C82E6)', svg: _dg('<circle cx="9" cy="11" r="0.95" fill="#fff" stroke="none"/><circle cx="15" cy="11" r="0.95" fill="#fff" stroke="none"/><path d="M8.4 14.8c1.3 1.2 5.9 1.2 7.2 0"/>') }, // Finder
  { bg: 'linear-gradient(180deg,#5AB4FF,#0A5BD6)', svg: _dg('<circle cx="12" cy="12" r="8.4"/><path d="M15.2 8.8l-2.4 5.6L8.8 15.2l2.4-5.6z" fill="#fff" stroke="none"/>') }, // Safari
  { bg: 'linear-gradient(180deg,#5CD07A,#1FA24E)', svg: _dg('<path d="M4 6.6h16v8.4H11l-3.8 3.4v-3.4H4z" fill="#fff" stroke="none"/>') }, // Messages
  { bg: 'linear-gradient(180deg,#6BB6FF,#1E6FD8)', svg: _dg('<rect x="3.5" y="6.5" width="17" height="11" rx="2.2"/><path d="M4.6 8.2l7.4 5.4 7.4-5.4"/>') }, // Mail
  { bg: 'linear-gradient(180deg,#86E7A2,#2FA24E)', svg: _dg('<path d="M12 21s6.4-5.7 6.4-11a6.4 6.4 0 10-12.8 0c0 5.3 6.4 11 6.4 11z"/><circle cx="12" cy="10" r="2.1" fill="#fff" stroke="none"/>') }, // Maps
  { bg: 'conic-gradient(from 218deg,#ff5f6d,#ffc371,#47e0a0,#4a9bff,#c46bff,#ff5f6d)', svg: '' }, // Photos
  { bg: 'linear-gradient(180deg,#FF7C95,#E93A57)', svg: _dg('<path d="M9.5 17.5V7l7-1.4v9.9"/><circle cx="7.5" cy="17.5" r="1.9" fill="#fff" stroke="none"/><circle cx="15" cy="15.5" r="1.9" fill="#fff" stroke="none"/>') }, // Music
  { bg: '#fff', svg: `<span style="font-weight:800;font-size:15px;color:#E93A57;line-height:1">13</span>` }, // Calendar
  { bg: 'linear-gradient(180deg,#3AA4FF,#0A6CE0)', svg: `<span style="font-weight:800;font-size:16px;color:#fff;line-height:1">A</span>` }, // App Store
  { bg: 'linear-gradient(180deg,#C8C9CF,#6E6F77)', svg: _dg('<circle cx="12" cy="12" r="2.8"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>') }, // Settings
];

function SolvedDemo() {
  return (
    <section id="actual-case" className="bg-white border-t border-black/[0.05] scroll-mt-20">
      <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-24">
        <h2 className="text-center text-[28px] lg:text-[34px] leading-[1.1] font-bold tracking-tight2 text-ink max-w-[760px] mx-auto">
          See the problem solved — before you open the console.
        </h2>
        <p className="text-center text-[22px] lg:text-[28px] leading-[1.1] font-bold tracking-tight2 mt-2" style={{ color: '#9a9a95' }}>
          RBI's ₹15,000 blind spot
        </p>
        <p className="mt-5 text-center text-[15px] lg:text-[16px] leading-relaxed max-w-[720px] mx-auto" style={{ color: '#7a7a75' }}>
          Real-world proof, not a hypothetical. Indian merchants have{' '}
          <a href="https://community.shopify.com/t/invoice-payment-issue-for-indian-merchants-due-to-rbi-mandate-change-greater-than-inr-15000/325868" target="_blank" rel="noreferrer" className="underline hover:opacity-80" style={{ color: '#7a7a75' }}>publicly reported</a>{' '}
          recurring mandate payments failing silently once they cross RBI's ₹15,000 authentication threshold — and unlike insurance, mutual funds, or credit card bills, which the RBI moved to a ₹1 lakh exemption in December 2023, standard business invoices like SaaS subscriptions and platform bills still sit under that original ₹15,000 ceiling. Sentinel reads the Merchant Category Code before it reacts, so it catches this exact pattern without ever flagging a legitimate high-value payment: it diagnoses the failure as a compliance block, not a technical fault, sends a proper re-authorization link, and recovers the payment instead of retrying blindly forever.{' '}
          <a href="https://community.shopify.com/t/invoice-payment-issue-for-indian-merchants-due-to-rbi-mandate-change-greater-than-inr-15000/325868" target="_blank" rel="noreferrer" className="text-accent underline font-medium hover:opacity-80">— link</a>
        </p>

        {/* desktop monitor — black bezel around the screen, with a neck + base */}
        <div className="mt-12 w-full max-w-[1300px] mx-auto flex flex-col items-center">
          <div className="w-full rounded-[22px] lg:rounded-[28px] p-[1.1%] shadow-[0_50px_130px_-36px_rgba(16,24,40,0.58)]"
            style={{ background: 'linear-gradient(180deg,#2c2c2c 0%,#141414 55%,#050505 100%)' }}>
            <div
              className="relative w-full rounded-[10px] lg:rounded-[13px] overflow-hidden aspect-video ring-1 ring-black/50"
              style={{ background: 'linear-gradient(165deg,#7FB2E6 0%,#AEC6DF 22%,#DCD3B6 52%,#E7DAB6 66%,#9FB9D9 100%)' }}
            >
          {/* deep-blue mountain glow bottom-left, like the macOS wallpaper */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 72% at 12% 112%, rgba(20,74,150,0.9), transparent 55%)' }} />
          {/* macOS menu bar */}
          <div className="absolute top-0 inset-x-0 h-7 flex items-center gap-4 px-4 text-white text-[12px] font-medium select-none" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.15)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.27 3.15-2.53.99-1.45 1.4-2.85 1.42-2.93-.03-.01-2.72-1.04-2.75-4.12M14.62 4.44c.71-.86 1.19-2.05 1.06-3.24-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.45" /></svg>
            <span className="font-semibold">Finder</span><span>File</span><span>Edit</span><span>View</span><span>Go</span><span className="hidden sm:inline">Window</span><span className="hidden sm:inline">Help</span>
            <span className="ml-auto text-[11.5px] tabular-nums hidden sm:inline">Tue 28 Aug · 4:52 PM</span>
          </div>

          {/* the app window — floats within the wallpaper, empty white content */}
          <div className="absolute left-[12%] top-[15%] right-[5%] bottom-[18%] bg-white rounded-[13px] shadow-[0_34px_90px_-24px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
            <div className="h-9 flex items-center gap-2 px-4 shrink-0">
              <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
              <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
              <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
            </div>
            <MacFileScene />
          </div>

          {/* macOS dock — app-style gradient tiles */}
          <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 z-20 flex items-end gap-1.5 lg:gap-2 px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-[16px] lg:rounded-[20px] border border-white/45" style={{ background: 'rgba(228,231,238,0.42)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', boxShadow: '0 8px 30px -8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.5)' }}>
            {DOCK_ICONS.map((d, i) => (
              <span key={i} className="w-8 h-8 lg:w-11 lg:h-11 rounded-[26%] grid place-items-center text-white hover:-translate-y-2 transition-transform duration-200 cursor-default shrink-0"
                style={{ background: d.bg, boxShadow: '0 3px 7px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.35)' }}
                dangerouslySetInnerHTML={{ __html: d.svg }} />
            ))}
          </div>
            </div>
            {/* chin with Apple logo */}
            <div className="h-[20px] lg:h-[30px] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#8f8f8f"><path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.27 3.15-2.53.99-1.45 1.4-2.85 1.42-2.93-.03-.01-2.72-1.04-2.75-4.12M14.62 4.44c.71-.86 1.19-2.05 1.06-3.24-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.45" /></svg>
            </div>
          </div>
          {/* neck */}
          <div style={{ width: '9%', height: '40px', background: 'linear-gradient(90deg,#454545,#101010 18%,#2c2c2c 50%,#101010 82%,#454545)', clipPath: 'polygon(20% 0,80% 0,92% 100%,8% 100%)' }} />
          {/* base foot */}
          <div className="rounded-[50%]" style={{ width: '24%', height: '14px', background: 'linear-gradient(180deg,#3c3c3c,#0c0c0c)', boxShadow: '0 16px 28px -8px rgba(0,0,0,0.45)' }} />
        </div>
      </div>
    </section>
  );
}
function IconCheckCircleTiny() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>);
}

/* Two documents opening on a Mac desktop — a cursor moves, clicks, and each file
   opens smoothly (bill first, the Shopify mandate post ~2s later). Loops. */
function MacFileScene() {
  // 0 intro card · 1 bill · 2 shopify · 3 Diagnosing · 4 Decided · 5 Executing(WhatsApp) ·
  // 6 customer taps link→Razorpay · 7 pays·success · 8 Recovered · 9 Audit log · 10 Dashboard
  const rootRef = useRef(null);
  const [step, setStep] = useState(1);
  const [paused, setPaused] = useState(false);
  const [interacted, setInteracted] = useState(false);

  // restart from the very beginning whenever the frame scrolls into view
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStep(1); setPaused(false); } }, { threshold: 0.55 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused) return;
    const hold = [0, 3400, 3400, 2600, 2600, 3200, 2800, 2700, 2600, 3400, 3200][step];
    const t = setTimeout(() => setStep((s) => (s >= 10 ? 1 : s + 1)), hold);
    return () => clearTimeout(t);
  }, [step, paused]);

  const toggle = () => { setInteracted(true); setPaused((p) => !p); };

  const caps = [
    { label: 'A payment just failed — watch Sentinel recover it', dot: '#9aa0a6' },
    { label: 'The problem — this ₹17,720 bill keeps failing', dot: '#E23744' },
    { label: 'The problem — blocked by the RBI ₹15,000 mandate', dot: '#E23744' },
    { label: 'Diagnosing', dot: '#E9A23B', pulse: true },
    { label: 'Decided', dot: '#3B5BDB' },
    { label: 'Executing — re-auth link sent on WhatsApp', dot: '#7048E8', pulse: true },
    { label: 'Customer taps the link — secure Razorpay checkout opens', dot: '#3395FF', pulse: true },
    { label: 'Customer pays — payment successful on Razorpay', dot: '#0F6E56', pulse: true },
    { label: 'Recovered', dot: '#0F6E56' },
    { label: 'Every step logged in the immutable audit trail', dot: '#151512' },
    { label: 'Logged in your Sentinel dashboard', dot: '#0F6E56' },
  ];
  const cap = caps[step];
  const cursor = [
    { l: 82, t: 92 }, { l: 16, t: 32 }, { l: 52, t: 62 }, { l: 48, t: 24 }, { l: 44, t: 42 },
    { l: 78, t: 46 }, { l: 74, t: 66 }, { l: 55, t: 70 }, { l: 50, t: 34 }, { l: 40, t: 40 }, { l: 46, t: 40 },
  ][step];
  const open = (on, origin, sh) => ({
    opacity: on ? 1 : 0,
    transform: on ? 'scale(1)' : 'scale(0.64)',
    transformOrigin: origin,
    transition: 'opacity .45s ease, transform .5s cubic-bezier(.2,.9,.3,1.25)',
    pointerEvents: 'none',
    boxShadow: sh,
  });
  const phase = step >= 8 ? 3 : Math.min(2, Math.max(0, step - 3));

  return (
    <div ref={rootRef} onClick={toggle} className="relative flex-1 min-h-0 overflow-hidden cursor-pointer" style={{ background: '#ECECEE' }}>
      {/* narration caption — apple glass, tells you which phase is running */}
      {step > 0 && (
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full max-w-[92%]"
          style={{ background: 'rgba(255,255,255,0.66)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 5px 18px -6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.75)' }}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cap.pulse ? 'animate-pulse' : ''}`} style={{ background: cap.dot }} />
          <span className="text-[7px] lg:text-[9px] font-semibold whitespace-nowrap" style={{ color: '#151512' }}>{cap.label}</span>
        </div>
      )}

      {/* desktop files (problem phase) */}
      <div style={{ opacity: step < 3 ? 1 : 0, transition: 'opacity .4s ease' }}>
        <DeskFile className="left-[9%] top-[16%]" label="Bill_373789981.pdf" tint="#E23744" />
        <DeskFile className="left-[46%] top-[54%]" label="Shopify_mandate.png" tint="#5E8E3E" />
      </div>

      {/* PROBLEM — the bill */}
      <div className="absolute left-[3%] top-[13%] w-[62%] rounded-[10px] bg-white overflow-hidden ring-1 ring-black/[0.07]"
        style={open(step === 1 || step === 2, '18% 20%', '0 22px 55px -18px rgba(0,0,0,0.45)')}>
        <WinBar /><DocBill />
      </div>
      {/* PROBLEM — the Shopify post */}
      <div className="absolute right-[2.5%] bottom-[5%] w-[60%] z-10 rounded-[10px] bg-white overflow-hidden ring-1 ring-black/[0.07]"
        style={open(step === 2, '55% 55%', '0 22px 55px -18px rgba(0,0,0,0.5)')}>
        <WinBar /><DocShopify />
      </div>

      {/* SOLUTION — Sentinel Case Detail, reasoning live */}
      <div className="absolute left-[5%] top-[13%] right-[5%] bottom-[5%] z-20 rounded-[10px] bg-white overflow-hidden ring-1 ring-black/[0.08] flex flex-col"
        style={open(step >= 3 && step <= 8, '50% 22%', '0 26px 60px -18px rgba(0,0,0,0.5)')}>
        <WinTitle label="Sentinel · Case Detail" />
        <CaseDetail phase={phase} />
      </div>

      {/* EXECUTING — WhatsApp send screen; link is tapped here */}
      <div className="absolute right-[6%] top-[16%] w-[42%] bottom-[9%] z-30 rounded-[11px] overflow-hidden ring-1 ring-black/10 flex flex-col"
        style={open(step === 5 || step === 6, '82% 50%', '0 24px 55px -16px rgba(0,0,0,0.55)')}>
        <WhatsAppScreen linkHot={step === 6} />
      </div>

      {/* CUSTOMER PAYS — real Razorpay checkout → success */}
      <div className="absolute left-[10%] top-[15%] right-[10%] bottom-[8%] z-30 rounded-[10px] overflow-hidden ring-1 ring-black/10 flex flex-col"
        style={open(step === 6 || step === 7, '50% 40%', '0 26px 60px -18px rgba(0,0,0,0.55)')}>
        <RazorpayScreen paid={step === 7} />
      </div>

      {/* AUDIT — everything logged */}
      <div className="absolute left-[5%] top-[13%] right-[5%] bottom-[5%] z-20 rounded-[10px] bg-white overflow-hidden ring-1 ring-black/[0.08] flex flex-col"
        style={open(step === 9, '50% 26%', '0 26px 60px -18px rgba(0,0,0,0.5)')}>
        <WinTitle label="Sentinel · Audit Trail" />
        <AuditLog />
      </div>

      {/* DASHBOARD — logged in Sentinel */}
      <div className="absolute left-[5%] top-[13%] right-[5%] bottom-[5%] z-20 rounded-[10px] bg-white overflow-hidden ring-1 ring-black/[0.08] flex flex-col"
        style={open(step === 10, '50% 28%', '0 26px 60px -18px rgba(0,0,0,0.5)')}>
        <WinTitle label="Sentinel · Dashboard" />
        <DashRecap />
      </div>

      {/* cursor */}
      <div className="absolute z-40 pointer-events-none" style={{ left: cursor.l + '%', top: cursor.t + '%', transition: 'left .7s ease, top .7s ease', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' }}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 2l0 16.5 4.2-4 2.6 5.8 2.9-1.25-2.55-5.7 5.75.05z" fill="#111" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" /></svg>
      </div>

      {/* little pause/play control — only appears once the user clicks the screen */}
      {interacted && (
        <button onClick={(e) => { e.stopPropagation(); toggle(); }}
          className="absolute bottom-2 right-2 z-50 w-6 h-6 lg:w-7 lg:h-7 rounded-full grid place-items-center transition-transform hover:scale-110"
          style={{ background: 'rgba(21,21,18,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#fff', boxShadow: '0 3px 10px -3px rgba(0,0,0,0.5)' }}
          aria-label={paused ? 'Play' : 'Pause'}>
          {paused
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>}
        </button>
      )}
    </div>
  );
}
function WinTitle({ label }) {
  return (
    <div className="h-4 lg:h-5 flex items-center gap-1 px-2 border-b border-black/[0.05] bg-[#f6f6f7] shrink-0">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF5F57' }} />
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FEBC2E' }} />
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#28C840' }} />
      <span className="mx-auto text-[6.5px] lg:text-[8px] text-[#8a8a8e] font-medium">{label}</span>
    </div>
  );
}
function DeskFile({ className, label, tint }) {
  return (
    <div className={`absolute ${className} w-[16%] flex flex-col items-center gap-1 select-none`}>
      <span className="w-[62%] aspect-[4/5] rounded-[4px] bg-white ring-1 ring-black/10 shadow-sm grid place-items-center" style={{ color: tint }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v4h4" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="15" y2="16" /></svg>
      </span>
      <span className="text-[6px] lg:text-[7px] text-[#3a3a3a] text-center leading-tight px-0.5 rounded bg-white/70">{label}</span>
    </div>
  );
}
function WinBar() {
  return (
    <div className="h-4 lg:h-5 flex items-center gap-1 px-2 border-b border-black/[0.05] bg-[#f6f6f7]">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF5F57' }} />
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FEBC2E' }} />
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#28C840' }} />
    </div>
  );
}
function DocBill() {
  const rows = [
    ['Payment processing: Visa ending 4018', '30 Jun 2025', '#9aa0a6'],
    ['Payment failed: Mastercard ending 3599', '28 Jun 2025', '#E23744'],
    ['Payment failed: Mastercard ending 3599', '25 Jun 2025', '#E23744'],
    ['Payment failed: Mastercard ending 3599', '22 Jun 2025', '#E23744'],
    ['Payment failed: Mastercard ending 3599', '18 Jun 2025', '#E23744'],
    ['Payment failed: Mastercard ending 7435', '15 Jun 2025', '#E23744'],
    ['Bill created', '2 Jun 2025', '#9aa0a6'],
  ];
  return (
    <div className="text-[7px] lg:text-[8.5px] leading-tight text-[#1c1c1e]">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-black/[0.05] text-[#6b6b6f]">
        <span className="font-medium text-[#1c1c1e]">Bill #373789981</span>
        <span className="px-1 py-[1px] rounded bg-[#e7ecfe] text-[#3b5bdb] font-medium">Processing</span>
        <span className="ml-auto px-1.5 py-[1px] rounded border border-black/10 text-[#444]">Export bill</span>
      </div>
      <div className="p-2.5">
        <div className="rounded-md border border-black/[0.06] p-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-[#111]">Billing cycle</div>
              <div className="text-[#8a8a8e]">Issued 2 Jun 2025</div>
            </div>
            <div className="text-right">
              <div className="text-[#8a8a8e]">Bill total</div>
              <div className="font-bold text-[#111] text-[9px] lg:text-[11px]">₹17,720.71 INR</div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 rounded border border-black/[0.06] px-1.5 py-1">
            <span className="relative w-3 h-2 shrink-0"><span className="absolute left-0 w-2 h-2 rounded-full bg-[#EB001B]" /><span className="absolute right-0 w-2 h-2 rounded-full bg-[#F79E1B] opacity-90" /></span>
            <span className="font-medium">Mastercard</span><span className="text-[#8a8a8e]">ending 3599</span>
          </div>
        </div>
        <div className="mt-2 font-semibold text-[#111]">Payment timeline</div>
        <div className="mt-1 space-y-[3px]">
          {rows.map(([t, d, c], i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="mt-[3px] w-1 h-1 rounded-full shrink-0" style={{ background: c }} />
              <span className="flex-1"><span className="text-[#2b2b2e]" style={c === '#E23744' ? { color: '#c62b38', fontWeight: 500 } : undefined}>{t}</span><span className="block text-[#9aa0a6]">{d}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function DocShopify() {
  return (
    <div className="text-[7px] lg:text-[8.5px] leading-snug text-[#242426]">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-black/[0.05]">
        <span className="w-3.5 h-3.5 rounded-[4px] grid place-items-center text-white text-[7px] font-bold shrink-0" style={{ background: '#5E8E3E' }}>S</span>
        <span className="font-semibold text-[#111] text-[8px] lg:text-[9.5px] leading-tight">UNABLE to Pay Shopify bill due to MANDATE LIMIT (above 15,000 INR)</span>
      </div>
      <div className="px-2.5 pt-1 flex gap-1.5 text-[#3b5bdb]"><span>troubleshooting</span><span>billing-plans</span></div>
      <div className="p-2.5 flex gap-1.5">
        <span className="w-4 h-4 rounded-full grid place-items-center text-white text-[7px] font-bold shrink-0" style={{ background: '#E2603A' }}>3</span>
        <div className="min-w-0">
          <div><span className="font-semibold text-[#111]">3sierra</span> <span className="text-[#8a8a8e]">Merchant · Jul 2025</span></div>
          <p className="mt-1 text-[#3a3a3e]">My current month Shopify bill is ₹17,720 but the allowed mandate is only ₹15,000. My bank approved a higher mandate, yet Shopify still caps it at ₹15,000.</p>
          <p className="mt-1 text-[#3a3a3e]">Tried multiple cards and many attempts — the payment never goes through. If I don't pay, my store freezes in 2 days. Please help!</p>
          <div className="mt-1.5 rounded border border-[#cfe0f2] bg-[#eef4fb] px-1.5 py-1 text-[#2a5b8a]">You'll be redirected to Razorpay for a one-time ₹15,000 mandate to auto-charge future bills below that amount.</div>
        </div>
      </div>
    </div>
  );
}

/* A single case's full reasoning trace — reusable: pass a real transaction as `c`,
   and `phase` (0 Diagnosing · 1 Decided · 2 Executing · 3 Recovered). */
function CaseDetail({ phase, c = DEMO_CASE }) {
  const badges = [
    { t: 'Diagnosing', bg: '#FDF3E7', fg: '#B7791F', dot: '#E9A23B' },
    { t: 'Decided', bg: '#EAF1FE', fg: '#3B5BDB', dot: '#3B5BDB' },
    { t: 'Executing', bg: '#F1EBFE', fg: '#7048E8', dot: '#7048E8' },
    { t: 'Recovered', bg: '#E7F4EF', fg: '#0F6E56', dot: '#0F6E56' },
  ];
  const b = badges[phase];
  return (
    <div className="flex-1 min-h-0 overflow-hidden text-[7px] lg:text-[9px] leading-snug" style={{ color: '#151512' }}>
      {/* case header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-black/[0.05] flex-wrap">
        <span className="font-bold text-[8px] lg:text-[10px]">{c.id}</span>
        <span style={{ color: '#7a7a75' }}>{inrFull(c.amount)} · {c.method}</span>
        <span className="px-1 py-[1px] rounded bg-[#fdeceb] text-[#c62b38] font-mono text-[6px] lg:text-[7.5px]">{c.signal}</span>
        <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-[1.5px] rounded-full font-semibold" style={{ background: b.bg, color: b.fg }}>
          <span className={`w-1.5 h-1.5 rounded-full ${phase < 3 ? 'animate-pulse' : ''}`} style={{ background: b.dot }} />{b.t}
        </span>
      </div>

      <div className="px-3 py-1.5 space-y-1.5">
        <Sec show={phase >= 0} title="What Sentinel sees" icon="brain">
          <div><span className="font-semibold">Root cause: {c.rootCause}</span> <span className="font-semibold" style={{ color: '#0F6E56' }}>· {c.confidence}% confidence</span></div>
          <p style={{ color: '#7a7a75' }} className="mt-0.5">{c.reasoning}</p>
        </Sec>

        <Sec show={phase >= 1} title="The right move" icon="shield">
          <span className="inline-block px-1.5 py-[1.5px] rounded bg-[#EAF1FE] text-[#3B5BDB] font-semibold">{c.action}</span>
          <div className="mt-1 rounded border border-black/[0.06] bg-[#fafafa] px-1.5 py-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
            {c.guardrails.map((g) => (<span key={g}><span style={{ color: '#0F6E56' }}>✓</span> <span style={{ color: '#3a3a3e' }}>{g}</span></span>))}
          </div>
        </Sec>

        <Sec show={phase >= 2} title="What Sentinel does" icon="send">
          <div>{c.channelLine} · <span style={{ color: '#7a7a75' }}>{c.sentAgo}</span></div>
          <div className="mt-1 w-fit max-w-[86%] rounded-md rounded-tl-[2px] px-1.5 py-1 leading-tight" style={{ background: '#DCF8C6', color: '#0b3d2e' }}>{c.message}</div>
        </Sec>

        <Sec show={phase >= 3} title="Outcome" icon="check">
          <div className="font-bold" style={{ color: '#0F6E56' }}>Payment recovered · Revenue saved: +{inrFull(c.amount)}</div>
          <p className="mt-0.5 font-mono text-[6px] lg:text-[7.5px]" style={{ color: '#7a7a75' }}>{c.audit}</p>
        </Sec>
      </div>
    </div>
  );
}
function Sec({ show, title, icon, children }) {
  const glyph = {
    brain: '<path d="M9 3a2.7 2.7 0 00-2.7 2.7A2.7 2.7 0 005 11v1.5A2.7 2.7 0 009 15M15 3a2.7 2.7 0 012.7 2.7A2.7 2.7 0 0119 11v1.5A2.7 2.7 0 0115 15M12 4v11" />',
    shield: '<path d="M12 3l7 3v5c0 4.4-3 7.4-7 8.8-4-1.4-7-4.4-7-8.8V6z" /><path d="M9 12l2 2 4-4" />',
    send: '<path d="M4 12l16-7-7 16-2-6z" />',
    check: '<path d="M4 12l5 5 11-11" />',
  }[icon];
  return (
    <div style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(5px)', transition: 'opacity .5s ease, transform .5s ease' }}>
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 lg:w-4 lg:h-4 rounded grid place-items-center shrink-0" style={{ background: '#EDEDE8', color: '#151512' }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: glyph }} />
        </span>
        <span className="font-bold">{title}</span>
      </div>
      <div className="mt-0.5 pl-5">{children}</div>
    </div>
  );
}
const inrFull = (n) => '₹' + Number(n).toLocaleString('en-IN');
const DEMO_CASE = {
  id: 'SEN-8391', amount: 18534, method: 'Card mandate', signal: 'MANDATE_DEBIT_FAILED',
  rootCause: 'RBI AFA threshold breach', confidence: 87,
  reasoning: '₹18,534 exceeds the ₹15,000 additional-authentication threshold required by RBI for card mandates — this is a compliance block, not a technical fault.',
  action: 'Send re-authorization link',
  guardrails: ['Non-retriable per policy', 'Within RBI notice window', 'Customer opted in', 'Under 3-attempt cap'],
  channelLine: 'Re-authorization link sent via WhatsApp', sentAgo: '2 seconds ago',
  message: 'Namaste! Aapka ₹18,534 ka payment RBI rules ke hisaab se ek extra confirmation maangta hai. Yeh link se turant approve kar dijiye: pay.sentinel.in/r/8391',
  audit: 'Detected 14:02:01 → Diagnosed 14:02:02 → Decided 14:02:02 → Re-auth sent 14:02:03 → Recovered 14:04:18',
};

/* WhatsApp send screen shown during the Executing phase */
function WhatsAppScreen({ linkHot }) {
  return (
    <div className="h-full flex flex-col text-[6.5px] lg:text-[8.5px]" style={{ background: '#E7DED3' }}>
      {/* header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 text-white shrink-0" style={{ background: '#0B5C43' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        <span className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-white grid place-items-center text-[#0B5C43] font-extrabold text-[7px] lg:text-[9px] shrink-0">S</span>
        <div className="leading-tight min-w-0">
          <div className="font-semibold flex items-center gap-0.5">Sentinel <span style={{ color: '#4FC3F7' }}>✔</span></div>
          <div className="opacity-80 text-[6px] lg:text-[7px]">Business Account</div>
        </div>
        <div className="ml-auto flex items-center gap-2 opacity-90">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><path d="M15 10l5-3v10l-5-3z" /><rect x="3" y="6.5" width="12" height="11" rx="2" /></svg>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.24 11 11 0 003.4.55 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.3a1 1 0 011 1 11 11 0 00.55 3.4 1 1 0 01-.24 1z" /></svg>
          <span className="font-bold tracking-tight">⋮</span>
        </div>
      </div>
      {/* body */}
      <div className="flex-1 min-h-0 overflow-hidden px-2 py-1.5">
        <div className="text-center"><span className="px-1.5 py-0.5 rounded bg-white/70 text-[#555] text-[6px]">Today</span></div>
        <div className="mt-1.5 max-w-[94%] rounded-md rounded-tl-[2px] bg-white px-2 py-1.5 shadow-sm text-[#1c1c1e] leading-snug">
          <div>Hello Sir,</div>
          <div className="mt-0.5">Your card mandate payment needs one RBI confirmation.</div>
          <div className="mt-1">Invoice: <b>SEN-8391</b></div>
          <div>Amount Due: <b>₹18,534.00</b></div>
          <div className="mt-1">Approve securely to avoid service interruption.</div>
          <div className="mt-1">Thank you,<br /><b>Sentinel</b></div>
          <div className="mt-1 pt-1 border-t border-black/[0.06]">Click the link to approve:</div>
          <div className={`underline break-all rounded px-0.5 transition-all ${linkHot ? 'ring-2 ring-[#3395FF] bg-[#eaf3ff]' : ''}`} style={{ color: '#1a73e8' }}>https://sentinel.pay/recover/SEN-8391</div>
          <div className="text-right text-[#8a8a8e] text-[6px] mt-0.5">2:01 AM · <span style={{ color: '#4FC3F7' }}>✓✓</span></div>
        </div>
      </div>
      {/* input */}
      <div className="flex items-center gap-1.5 px-2 py-1 shrink-0">
        <div className="flex-1 rounded-full bg-white px-2 py-1 text-[#8a8a8e]">Type a message</div>
        <span className="w-4 h-4 lg:w-5 lg:h-5 rounded-full grid place-items-center shrink-0" style={{ background: '#0B5C43' }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff"><path d="M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3z" /><path d="M19 11a7 7 0 01-14 0" stroke="#fff" strokeWidth="1.6" fill="none" /></svg>
        </span>
      </div>
    </div>
  );
}

/* Sentinel dashboard recap shown at the end — the case logged as recovered */
function DashRecap() {
  const kpis = [['Revenue recovered', '₹4,86,120', '#0F6E56'], ['At-risk revenue', '₹1,23,400', '#151512'], ['Success rate', '92%', '#0F6E56']];
  return (
    <div className="flex-1 min-h-0 overflow-hidden text-[7px] lg:text-[9px]" style={{ color: '#151512' }}>
      <div className="px-3 py-1.5 border-b border-black/[0.05] flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded bg-[#151512] text-white grid place-items-center text-[6px] lg:text-[8px] font-extrabold">S</span>
        <span className="font-bold">Overview</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[#0F6E56] font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] animate-pulse" />Live</span>
      </div>
      <div className="p-2.5 grid grid-cols-3 gap-1.5">
        {kpis.map(([l, v, c]) => (
          <div key={l} className="rounded-md border border-black/[0.06] bg-[#fafafa] px-2 py-1.5">
            <div className="text-[6px] lg:text-[7.5px]" style={{ color: '#7a7a75' }}>{l}</div>
            <div className="font-bold text-[9px] lg:text-[12px] mt-0.5" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div className="px-2.5 space-y-1">
        <div className="text-[6px] lg:text-[7.5px] font-semibold" style={{ color: '#7a7a75' }}>Recent recovery</div>
        <div className="rounded-md border border-black/[0.06] bg-[#f5faf8] px-2 py-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] shrink-0" />
          <span className="font-semibold">SEN-8391</span>
          <span style={{ color: '#7a7a75' }}>₹18,534 · Card mandate</span>
          <span className="ml-auto px-1.5 py-[1px] rounded-full bg-[#E7F4EF] text-[#0F6E56] font-semibold">Recovered</span>
        </div>
      </div>
    </div>
  );
}

/* Razorpay logo mark */
function RzpMark({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#3395FF" aria-hidden="true">
      <path d="M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902z" />
    </svg>
  );
}

/* Razorpay checkout the customer sees after tapping the link → pays → success */
function RazorpayScreen({ paid }) {
  return (
    <div className="h-full flex flex-col bg-white text-[7px] lg:text-[9px]">
      {/* browser chrome */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#f1f3f4] shrink-0 border-b border-black/[0.06]">
        <span className="flex gap-1"><i className="w-1.5 h-1.5 rounded-full bg-[#FF5F57] block" /><i className="w-1.5 h-1.5 rounded-full bg-[#FEBC2E] block" /><i className="w-1.5 h-1.5 rounded-full bg-[#28C840] block" /></span>
        <div className="flex-1 rounded-full bg-white px-2 py-0.5 text-[#5f6368] text-[6px] lg:text-[7.5px] flex items-center gap-1">
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.4"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
          api.razorpay.com/checkout
        </div>
      </div>
      <div className="flex-1 min-h-0 grid place-items-center p-2" style={{ background: '#eef2f8' }}>
        {!paid ? (
          <div className="w-[74%] max-w-[240px] rounded-lg bg-white shadow-[0_14px_40px_-12px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="px-3 py-2 text-white" style={{ background: '#02042B' }}>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 bg-white rounded px-1 py-0.5">
                  <RzpMark size={9} /><span className="text-[#0C2451] font-bold text-[6px] lg:text-[7.5px]">Razorpay</span>
                </span>
                <span className="ml-auto font-bold text-[10px] lg:text-[12px]">₹18,534</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-3 h-3 rounded bg-[#151512] grid place-items-center text-[6px] font-black">S</span>
                <span className="font-semibold text-[7px] lg:text-[8.5px]">Sentinel</span>
                <span className="opacity-70 text-[6px] lg:text-[7px]">· Card mandate re-authorization</span>
              </div>
            </div>
            <div className="p-2.5 space-y-1.5">
              <div className="text-[#8a8a8e]">Pay using</div>
              <div className="rounded border-2 border-[#3395FF] bg-[#eef6ff] px-2 py-1.5 flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3395FF" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                <span className="font-medium">Card •••• 3599</span><span className="ml-auto text-[#3395FF]">●</span>
              </div>
              <div className="rounded border border-black/[0.1] px-2 py-1.5 flex items-center gap-1.5 text-[#8a8a8e]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3l10 9-10 9" /></svg> UPI · Netbanking
              </div>
              <button className="w-full rounded py-1.5 text-white font-bold" style={{ background: '#3395FF' }}>Pay ₹18,534.00</button>
              <div className="text-center text-[#9aa0a6] text-[6px] flex items-center justify-center gap-1">
                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
                Secured by <RzpMark size={7} /><span className="text-[#0C2451] font-semibold">Razorpay</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-[68%] max-w-[220px] rounded-lg bg-white shadow-[0_14px_40px_-12px_rgba(0,0,0,0.4)] p-4 text-center" style={{ animation: 'cardIn .4s ease both' }}>
            <div className="mx-auto w-9 h-9 rounded-full grid place-items-center" style={{ background: '#E7F4EF' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div className="mt-2 font-bold text-[11px] lg:text-[13px]" style={{ color: '#0F6E56' }}>Payment Successful</div>
            <div className="text-[#5f6368] mt-0.5">₹18,534.00 paid via Card mandate</div>
            <div className="mt-1.5 text-[6px] lg:text-[7.5px] text-[#9aa0a6] font-mono">Payment ID: pay_SEN8391QkR</div>
            <div className="mt-1 flex items-center justify-center gap-1 text-[6px] lg:text-[7px] text-[#9aa0a6]">
              <RzpMark size={7} /><span className="text-[#0C2451] font-semibold">Razorpay</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Immutable audit trail — everything that happened, timestamped */
function AuditLog() {
  const rows = [
    ['14:02:01', 'Detected', 'payment.failed · MANDATE_DEBIT_FAILED', '#9aa0a6'],
    ['14:02:02', 'Diagnosed', 'RBI AFA threshold breach · 87% confidence', '#3B5BDB'],
    ['14:02:02', 'Decided', 'Send re-authorization link · guardrails passed', '#3B5BDB'],
    ['14:02:03', 'Executed', 'Re-auth link sent via WhatsApp', '#151512'],
    ['14:03:55', 'Customer paid', 'Razorpay pay_SEN8391QkR · ₹18,534', '#3395FF'],
    ['14:04:18', 'Recovered', 'Revenue saved +₹18,534', '#0F6E56'],
  ];
  return (
    <div className="flex-1 min-h-0 overflow-hidden text-[7px] lg:text-[9px]" style={{ color: '#151512' }}>
      <div className="px-3 py-1.5 border-b border-black/[0.05] flex items-center gap-1.5">
        <span className="font-bold">Audit Trail</span>
        <span style={{ color: '#7a7a75' }}>· every decision & action, timestamped and immutable</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[#0F6E56] font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] animate-pulse" />Recording</span>
      </div>
      <div className="p-2 space-y-1">
        {rows.map(([t, step, detail, c], i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border border-black/[0.05] bg-[#fafafa] px-2 py-1" style={{ animation: `cardIn .35s ease both`, animationDelay: `${i * 0.12}s` }}>
            <span className="font-mono text-[6px] lg:text-[8px] tabular-nums shrink-0" style={{ color: '#9aa0a6' }}>{t}</span>
            <span className="px-1.5 py-[1px] rounded-full font-semibold shrink-0 text-white text-[6px] lg:text-[7.5px]" style={{ background: c }}>{step}</span>
            <span className="truncate" style={{ color: '#3a3a3e' }}>{detail}</span>
            <svg className="ml-auto shrink-0" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Why it matters */
function WhyItMatters() {
  return (
    <section className="bg-[#F7F7F8] border-t border-black/[0.05]">
      <div className="max-w-[1200px] mx-auto px-6 py-20 lg:py-24">
        {/* eyebrow */}
        <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-good-soft text-good border border-good/20 text-[13px] font-semibold">
          ₹ Why this matters
        </span>

        <h2 className="mt-6 text-[34px] lg:text-[44px] leading-[1.05] font-bold tracking-tight2 text-ink max-w-[720px]">
          Failed payments and regulatory friction are killing your MRR
        </h2>
        <p className="mt-5 text-[16px] lg:text-[17px] text-muted leading-relaxed max-w-[620px]">
          Most Indian founders rely on their processor’s basic retry logic that struggles with the
          complexities of RBI’s e-mandate rules and diverse payment methods (like UPI and local
          wallets). Meanwhile,{' '}
          <span className="font-semibold text-ink px-1 -mx-0.5 rounded-[2px]" style={{ background: 'linear-gradient(180deg, transparent 14%, #FFE873 14%, #FFE873 90%, transparent 90%)', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>revenue disappears and customers who wanted to stay are locked out permanently</span>.
        </p>

        {/* stat cards */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* 01 — big card: text on the left, illustration on the right (no overlap) */}
          <div className="bg-white rounded-2xl border border-[#E6E6EA] shadow-[0_2px_10px_-6px_rgba(16,24,40,0.10)] overflow-hidden grid sm:grid-cols-[38%_1fr] min-h-[470px]">
            <div className="p-7 flex flex-col">
              <NumBadge n="01" />
              <h3 className="mt-5 text-[21px] leading-snug font-bold tracking-tight2 text-ink">
                5–28% of SaaS payments fail every month. Revenue silently walking out the door.
              </h3>
              <p className="mt-4 text-[15px] text-muted leading-relaxed">
                Growth is meaningless if revenue silently walks out the back door due to poor
                post-sales visibility.
              </p>
            </div>
            {/* photo has a white background — white container makes it fully seamless */}
            <div className="relative min-h-[320px] sm:min-h-full bg-white">
              <FounderImage />
            </div>
          </div>

          {/* right column: 02 + 03 */}
          <div className="flex flex-col gap-5">
            <StatCard
              n="02"
              stat="20–40% of all SaaS churn is involuntary — caused by UPI server timeouts, mandate failures, and expired cards."
              source="Source: ProfitWell & PayPro Global"
            />
            <StatCard
              n="03"
              stat="5X higher cost to acquire a new customer than to retain an existing one."
              source="Source: Indian SaaS Retention Study"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function NumBadge({ n }) {
  return (
    <span className="inline-grid place-items-center w-9 h-9 rounded-[10px] bg-accent-soft text-accent-ink text-[14px] font-semibold">
      {n}
    </span>
  );
}

/* -------------------------------------------------- The problem no one talks about */
const LEAKS = [
  { n: '01', t: 'A payment quietly degrades', d: 'Success rates dip on a card or gateway before anything visibly breaks.' },
  { n: '02', t: 'A checkout is abandoned', d: 'The customer wanted to pay, but drop-off ends the session with no retry.' },
  { n: '03', t: 'A subscription fails silently', d: 'An expired card or failed mandate stops renewal — no alert, no recovery.' },
  { n: '04', t: 'An invoice goes quiet', d: 'A B2B receivable slips past due and simply stops being chased.' },
];
function ProblemNoOneTalks() {
  return (
    <section id="the-problem" className="bg-white border-t border-black/[0.05] scroll-mt-20">
      <div className="max-w-[1200px] mx-auto px-6 py-20 lg:py-24">
        <h2 className="leading-[1.02] tracking-tight2 text-ink max-w-[820px]">
          <span className="font-display-serif italic font-medium text-[54px] lg:text-[76px]">The problem</span>
          <span className="block mt-1 text-[26px] lg:text-[34px] font-bold text-ink/75">no one talks about.</span>
        </h2>
        <p className="mt-5 text-[17px] lg:text-[19px] text-muted leading-relaxed max-w-[620px]">
          Revenue doesn’t disappear in one step. It leaks.
        </p>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {LEAKS.map((c) => (
            <div
              key={c.n}
              className="bg-[#FCFCFD] rounded-[22px] border border-[#E6E6EA] p-9 lg:p-10 min-h-[240px] flex flex-col shadow-[0_2px_12px_-6px_rgba(16,24,40,0.10)] transition-transform hover:-translate-y-0.5"
            >
              <div className="font-display-serif italic text-[68px] leading-[0.8] text-ink/15 select-none">{c.n}</div>
              <h3 className="mt-6 text-[24px] lg:text-[26px] leading-snug font-bold tracking-tight2 text-ink">{c.t}</h3>
              <p className="mt-3 text-[16px] text-muted leading-relaxed max-w-[440px]">{c.d}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-[16px] lg:text-[18px] font-medium text-ink/80">
          None of it looks urgent — <span className="text-ink">until you add it up.</span>
        </p>
      </div>
    </section>
  );
}

function StatCard({ n, stat, source }) {
  return (
    <div className="flex-1 bg-white rounded-2xl border border-[#E6E6EA] shadow-[0_2px_10px_-6px_rgba(16,24,40,0.10)] p-7">
      <div className="flex gap-4">
        <NumBadge n={n} />
        <div>
          <h3 className="text-[20px] leading-snug font-bold tracking-tight2 text-ink">{stat}</h3>
          <p className="mt-4 text-[13px] text-faint">{source}</p>
        </div>
      </div>
    </div>
  );
}

// Uses the real photo at /founder.jpg when present; otherwise falls back to a
// stylised silhouette so the card is never broken.
function FounderImage() {
  const [failed, setFailed] = useState(false);
  if (failed) return <SilhouetteArt />;
  return (
    <img
      src="/founder.jpg"
      alt="Founder at a laptop watching revenue slip away"
      onError={() => setFailed(true)}
      className="absolute inset-0 w-full h-full object-contain object-bottom"
    />
  );
}

// Stylised "founder at a laptop, from behind" — self-contained SVG fallback:
// dark figure on the left with a bun, a purple laptop screen on the right.
function SilhouetteArt() {
  return (
    <svg viewBox="0 0 480 480" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="silbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3F3F6" />
          <stop offset="1" stopColor="#E7E7EC" />
        </linearGradient>
        <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B79EC" />
          <stop offset="1" stopColor="#2C2355" />
        </linearGradient>
      </defs>
      <rect width="480" height="480" fill="url(#silbg)" />
      {/* desk (diagonal, taupe) */}
      <path d="M150 480 L480 372 L480 480 Z" fill="#CFC6BE" />
      {/* laptop, slightly tilted, purple screen */}
      <g transform="translate(258 300) rotate(-8)">
        <rect x="0" y="0" width="176" height="116" rx="9" fill="#141418" />
        <rect x="11" y="9" width="154" height="98" rx="4" fill="url(#scr)" />
      </g>
      {/* person from behind, on the left */}
      <g fill="#0E0E12">
        {/* hoodie / shoulders */}
        <path d="M-30 480 C-30 344 55 300 150 300 C214 300 258 344 258 480 Z" />
        {/* head */}
        <circle cx="120" cy="250" r="53" />
        {/* messy bun */}
        <circle cx="92" cy="198" r="27" />
        {/* arm reaching toward the laptop */}
        <path d="M205 470 C238 424 282 402 332 398 L352 434 C308 462 254 480 212 480 Z" />
      </g>
      {/* hair-clip hint on the bun */}
      <path d="M74 192 l30 12 M76 204 l28 -14" stroke="#5F5F66" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ------------------------------------------------------------------ Revenue slips (closing) */
function RevenueSlips() {
  return (
    <section className="bg-[#F7F7F8] border-t border-black/[0.05]">
      <div className="max-w-[1120px] mx-auto px-6 py-20 lg:py-24">
        {/* heading + subheading on the gray background */}
        <div className="text-center max-w-[880px] mx-auto">
          <h2 className="text-[36px] sm:text-[52px] lg:text-[60px] leading-[1.02] font-bold tracking-tight2 text-ink">
            One failed payment shouldn’t become lost revenue.
          </h2>
          <p className="mt-6 text-[17px] lg:text-[19px] text-muted leading-relaxed max-w-[680px] mx-auto">
            Sentinel detects why the payment failed, chooses the right moment to retry, and brings
            the revenue back automatically.
          </p>
        </div>

        {/* big soft-white box AFTER the heading + subheading — the recovery line */}
        <div className="mt-12 bg-[#FCFCFD] border border-[#E6E6EA] rounded-[24px] shadow-[0_2px_16px_-8px_rgba(16,24,40,0.10)] overflow-hidden">
          <RecoveryLine />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Recovery line */
// Uses the real card artwork; my own status badge overlays the baked-in one so it
// can flip red(failed) → green(recovered) as the card crosses the AI gate.
const FLOW_CARDS = [
  { img: '/card-navy.jpg', failText: 'Mandate expired', failAmt: '−₹12,499', okText: 'Recovered', okAmt: '+₹3,900', delay: '0s' },
  { img: '/card-grey.jpg', failText: 'Card declined', failAmt: '−₹4,000', okText: 'Safe delayed retry', okAmt: '+₹2,938', delay: '-5.25s' },
  { img: '/card-glass.jpg', failText: 'Checkout abandoned', failAmt: '−₹10,000', okText: 'Recovered', okAmt: '+₹7,400', delay: '-10.5s' },
  { img: '/card-red.jpg', failText: 'UPI Autopay failed', failAmt: '−₹2,999', okText: 'Retried OK', okAmt: '+₹2,999', delay: '-15.75s' },
];

function RecoveryLine() {
  const [failed, setFailed] = useState(48383);
  const [recovered, setRecovered] = useState(39120);
  useEffect(() => {
    const id = setInterval(() => {
      setFailed((f) => f + Math.floor(Math.random() * 380 + 120));
      setRecovered((r) => r + Math.floor(Math.random() * 240 + 70));
    }, 95);
    return () => clearInterval(id);
  }, []);
  const inr = (n) => '₹' + n.toLocaleString('en-IN');

  return (
    <div className="px-5 sm:px-8 pt-8 pb-7">
      <div className="text-center text-[11px] font-semibold tracking-[0.18em] text-good/80 uppercase">
        The recovery line
      </div>

      {/* the flowing track */}
      <div className="relative h-[220px] mt-4 overflow-hidden">
        {/* connecting line: red on the left half, green on the right */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] flex">
          <div className="flex-1 bg-gradient-to-r from-red-400/10 to-red-400/70" />
          <div className="flex-1 bg-gradient-to-r from-green-400/70 to-green-400/10" />
        </div>

        {/* flowing cards (pass BEHIND the gate at centre) */}
        <div className="absolute inset-0 z-10">
          {FLOW_CARDS.map((c) => (
            <FlowCard key={c.holder} {...c} />
          ))}
        </div>

        {/* AI agent gate at the centre */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <span className="absolute left-1/2 top-1/2 w-16 h-16 rounded-full bg-good/40 gate-pulse" />
          <span className="relative w-14 h-14 rounded-full bg-good grid place-items-center shadow-[0_8px_30px_rgba(18,122,75,0.45)]">
            <IconShield size={22} className="text-white" />
          </span>
        </div>
      </div>

      {/* labels + live counters */}
      <div className="grid grid-cols-3 items-start mt-3 gap-2">
        <div className="text-left">
          <div className="text-[10px] font-semibold tracking-[0.14em] text-stop uppercase">Failed payments</div>
          <div className="mt-1 text-[22px] sm:text-[26px] font-bold tabular-nums text-stop leading-none">−{inr(failed)}</div>
          <div className="text-[11px] text-faint mt-1">lost & at risk</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">Recovery flow</div>
          <div className="mt-1 text-[12px] text-faint">Sentinel AI agent</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold tracking-[0.14em] text-good uppercase">Recovered</div>
          <div className="mt-1 text-[22px] sm:text-[26px] font-bold tabular-nums text-good leading-none">+{inr(recovered)}</div>
          <div className="text-[11px] text-faint mt-1">won back this run</div>
        </div>
      </div>

      {/* without vs with */}
      <div className="mt-7 pt-6 border-t border-black/[0.07] flex items-center justify-center gap-8 sm:gap-14">
        <div className="text-center">
          <div className="text-[10px] font-semibold tracking-[0.12em] text-faint uppercase">Without Sentinel</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums text-stop">−₹2,496</div>
          <div className="text-[11px] text-faint">lost · last month</div>
        </div>
        <span className="w-8 h-8 rounded-full border border-hairline grid place-items-center text-[11px] font-semibold text-faint">vs</span>
        <div className="text-center">
          <div className="text-[10px] font-semibold tracking-[0.12em] text-faint uppercase">With Sentinel</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums text-good">+₹2,496</div>
          <div className="text-[11px] text-faint">recovered · last month</div>
        </div>
      </div>
    </div>
  );
}

function FlowCard({ img, failText, failAmt, okText, okAmt, delay }) {
  const d = { animationDelay: delay };
  return (
    <div className="flow-card absolute left-1/2 top-1/2 w-[300px]" style={d}>
      <div className="relative w-full aspect-[1.57] rounded-[14px] overflow-hidden shadow-[0_20px_46px_-14px_rgba(16,24,40,0.5)]">
        {/* real card artwork */}
        <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
        {/* my status badge overlays (and hides) the baked-in badge, and flips */}
        <div className="absolute top-[8%] left-[4.5%]">
          <FlowBadge ok={false} text={failText} amt={failAmt} style={d} />
          <FlowBadge ok text={okText} amt={okAmt} style={d} />
        </div>
      </div>
    </div>
  );
}

function FlowBadge({ ok, text, amt, style }) {
  return (
    <div
      className={`${ok ? 'badge-ok border-green-400/60 text-green-300' : 'badge-fail border-red-400/60 text-red-300'} absolute top-0 left-0 inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full border text-[10.5px] font-semibold whitespace-nowrap bg-[#0a0d16]/90 backdrop-blur-[4px]`}
      style={style}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
      {text}
      <span className="opacity-30">|</span>
      <span>{amt}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ Sees & Does */
const SIGNALS = [
  { icon: 'card', title: 'PAYMENT FAILED', sub: 'Card declined · Insufficient funds', amt: '4,999', time: '2m ago' },
  { icon: 'cart', title: 'CHECKOUT ABANDONED', sub: 'Customer dropped off at payment', amt: '2,199', time: '7m ago' },
  { icon: 'mandate', title: 'MANDATE EXPIRED', sub: 'AutoPay mandate could not be charged', amt: '12,490', time: '15m ago' },
  { icon: 'invoice', title: 'INVOICE OVERDUE', sub: 'Invoice #INV-9281 is 12 days overdue', amt: '48,000', time: '1h ago' },
];

const CASE_STEPS = [
  { label: 'Issue detected', value: 'Mandate expired', color: 'text-red-400' },
  { label: 'Root cause', value: 'AutoPay mandate could not be charged', color: 'text-amber-400' },
  { label: 'Best intervention', value: 'Switch to UPI recovery via payment link', color: 'text-green-400' },
  { label: 'Policy check', value: 'Within retry window · Customer opted in ✓', color: 'text-sky-300' },
  { label: 'Action executed', value: 'Payment link sent via WhatsApp', color: 'text-green-400', badge: 'SENT ✓' },
  { label: 'Outcome', value: 'Payment received', color: 'text-green-400', badge: '+ ₹12,490' },
];

const ACTIONS = [
  { t: 'SMART RETRY', c: 'bg-green-500' },
  { t: 'WHATSAPP', c: 'bg-green-500' },
  { t: 'PAYMENT LINK', c: 'bg-green-500' },
  { t: 'VOICE', c: 'bg-sky-500' },
  { t: 'ESCALATE', c: 'bg-amber-500' },
  { t: 'STOP', c: 'bg-red-500' },
];

/* -------------------------------------------------- Recovery loop (scroll stepper) */
const LOOP_STEPS = [
  { n: '01', k: 'Detect', img: '/loop-detect.jpg', head: 'Notice the money at risk.', sub: 'A failed payment, an abandoned checkout, an overdue invoice — flagged the moment it happens, with the amount attached.' },
  { n: '02', k: 'Diagnose', img: '/loop-diagnose.jpg', head: 'Find the real reason.', sub: 'Sentinel classifies each failure — gateway timeout, expired card, failed mandate, or abandoned intent — not just that it failed.' },
  { n: '03', k: 'Decide', img: '/loop-decide.jpg', head: 'Choose the right move.', sub: 'It picks the action and the moment: a smart retry, an update-card link, a mandate re-presentation, or a gentle reminder.' },
  { n: '04', k: 'Recover', img: '/loop-recover.jpg', head: 'Bring the revenue back.', sub: 'Sentinel executes, tracks the promise-to-pay, and books the money back — with every decision logged.' },
];

function RecoveryLoop() {
  const [active, setActive] = useState(0);
  const [errored, setErrored] = useState({});
  const itemRefs = useRef([]);
  const stepRefs = useRef([]);
  const [bar, setBar] = useState({ top: 0, height: 0 });

  // scrollspy — the active step follows whichever block is nearest the viewport
  // centre, while the left tabs stay pinned (sticky). Nothing swaps; scroll freely.
  useEffect(() => {
    const onScroll = () => {
      const mid = (window.innerHeight || 1) / 2;
      let best = 0, bestDist = Infinity;
      stepRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setActive(best);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // slide the blue indicator to the active step
  useLayoutEffect(() => {
    const el = itemRefs.current[active];
    if (el) setBar({ top: el.offsetTop, height: el.offsetHeight });
  }, [active]);

  const goTo = (i) => stepRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <section id="how-it-works" className="bg-white border-t border-black/[0.05] scroll-mt-20">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-24 lg:pt-28">
        {/* section intro */}
        <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] leading-[1.1] tracking-tight2 font-bold text-ink max-w-[760px]">
          From failed payment to recovered revenue.
        </h2>
        <p className="mt-4 text-[16px] lg:text-[18px] text-muted leading-relaxed max-w-[620px]">
          <span className="font-semibold text-ink px-1 -mx-0.5 rounded-[2px]" style={{ background: 'linear-gradient(180deg, transparent 14%, #FFE873 14%, #FFE873 90%, transparent 90%)', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>Four steps.</span> One intelligent recovery loop. No manual chasing. No blind retries.
        </p>
      </div>

      <div className="mt-12 pb-16 lg:pb-24">
        <div className="border-y border-hairline bg-white grid grid-cols-1 lg:grid-cols-[300px_1fr]">
          {/* LEFT — sticky tab list; stays put while the right scrolls */}
          <div className="lg:border-r border-hairline">
            <div className="lg:sticky lg:top-24 relative px-8 py-12 flex flex-col gap-1">
              <span className="absolute left-8 top-12 bottom-12 w-[2px] bg-hairline rounded-full" />
              <span className="absolute left-8 w-[2px] bg-accent rounded-full transition-all duration-400 ease-out" style={{ top: bar.top, height: bar.height }} />
              {LOOP_STEPS.map((s, i) => {
                const on = i === active;
                return (
                  <button
                    key={s.k}
                    ref={(el) => (itemRefs.current[i] = el)}
                    onClick={() => goTo(i)}
                    className={`block w-full text-left pl-5 pr-2 py-3 text-[24px] lg:text-[27px] font-semibold tracking-tight2 transition-colors ${on ? 'text-ink' : 'text-ink/25 hover:text-ink/50'}`}
                  >
                    {s.k}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT — every step stacked; scroll through them, the bar follows */}
          <div>
            {LOOP_STEPS.map((s, i) => (
              <div key={s.k} data-idx={i} ref={(el) => (stepRefs.current[i] = el)} className={i > 0 ? 'border-t border-hairline' : ''}>
                {/* quote */}
                <div className="bg-white px-8 lg:px-14 pt-14 pb-8">
                  <h3 className="text-[26px] lg:text-[36px] leading-[1.2] tracking-tight2 font-semibold max-w-[1000px]">
                    <span className="text-ink">{s.head}</span>{' '}
                    <span className="text-ink/40">{s.sub}</span>
                  </h3>
                </div>
                {/* visual */}
                <div className="bg-[#F7F7F8] border-t border-hairline relative min-h-[360px] flex">
                  {i === 0 ? (
                    <DetectVisual />
                  ) : i === 1 ? (
                    <DiagnoseVisual play={active === 1} />
                  ) : i === 2 ? (
                    <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 p-6 lg:p-8">
                      <img src="/loop-decide.jpg" alt="Decide step" className="flex-1 min-w-0 object-contain" />
                      <DecideEmail play={active === 2} />
                    </div>
                  ) : i === 3 ? (
                    <RecoverVisual play={active === 3} />
                  ) : !errored[i] ? (
                    <img
                      src={s.img}
                      alt={`${s.k} step`}
                      className="w-full object-cover"
                      onError={() => setErrored((e) => ({ ...e, [i]: true }))}
                    />
                  ) : (
                    <div className="w-full grid place-items-center py-24">
                      <div className="text-center px-6">
                        <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-accent/60">Step {s.n} · {s.k}</div>
                        <div className="mt-2 text-[13px] text-faint">Screenshot goes here</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- Declined card (3D on scroll + glass) */
function PremiumCard() {
  return (
    <div
      className="relative w-full max-w-[420px] aspect-[1.586/1] rounded-[20px] overflow-hidden text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)]"
      style={{ background: 'linear-gradient(145deg,#141416 0%,#0a0a0b 55%,#000 100%)' }}
    >
      {/* world-map dot texture (denser toward the right, like the reference) + sheen */}
      <div className="absolute inset-0 opacity-[0.55]" style={{ backgroundImage: 'radial-gradient(rgba(210,210,215,0.16) 1.1px, transparent 1.5px)', backgroundSize: '8px 8px', maskImage: 'radial-gradient(120% 90% at 70% 45%, black 30%, transparent 78%)', WebkitMaskImage: 'radial-gradient(120% 90% at 70% 45%, black 30%, transparent 78%)' }} />
      <div className="absolute -top-1/3 -left-1/4 w-2/3 h-2/3 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)' }} />
      <div className="absolute inset-0 rounded-[20px] ring-1 ring-white/10" />

      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full grid place-items-center" style={{ background: 'radial-gradient(circle at 30% 30%,#F4D98B,#B8860B)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 17l6-9 4 6 2-3 4 6z" fill="#3a2c05" /></svg>
            </span>
            <div className="leading-none">
              <div className="text-[17px] font-bold tracking-wide" style={{ color: '#E7C983' }}>PIM</div>
              <div className="text-[5px] tracking-[0.18em] mt-0.5" style={{ color: '#C9A86A' }}>PREMIUMMETALS INTERNATIONAL MARKET</div>
            </div>
          </div>
          <div className="font-display-serif italic text-[18px]" style={{ color: '#E7C983' }}>Premium</div>
        </div>

        {/* chip */}
        <div className="w-12 h-9 rounded-[7px] -mt-2" style={{ background: 'linear-gradient(135deg,#E9CE8C,#C09A46)' }}>
          <div className="w-full h-full rounded-[7px] grid grid-cols-3 grid-rows-3 gap-[1px] p-[3px] opacity-60">
            {Array.from({ length: 9 }).map((_, i) => <span key={i} className="bg-[#8a6d24]/60 rounded-[1px]" />)}
          </div>
        </div>

        {/* number */}
        <div>
          <div className="text-[19px] sm:text-[21px] font-medium tracking-[0.12em] tabular-nums">4000&nbsp; 0012&nbsp; 3456&nbsp; 7890</div>
          <div className="flex gap-6 mt-1.5 text-[8px] tracking-wide" style={{ color: '#B7B3AE' }}>
            <span>5422</span>
            <span>MONTH / YEAR <span className="text-white/90 ml-1">09/27</span></span>
            <span>EXPIRES END <span className="text-white/90 ml-1">09/27</span></span>
          </div>
        </div>

        {/* holder + mastercard */}
        <div className="flex items-end justify-between">
          <div className="text-[15px] font-semibold tracking-wide">ARJUN MEHTA</div>
          <div className="flex flex-col items-center">
            <div className="relative w-11 h-7">
              <span className="absolute left-0 top-0 w-7 h-7 rounded-full" style={{ background: '#EB001B' }} />
              <span className="absolute right-0 top-0 w-7 h-7 rounded-full" style={{ background: '#F79E1B', mixBlendMode: 'screen' }} />
            </div>
            <span className="text-[7px] tracking-wide text-white/80 mt-0.5">mastercard</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// The Detect step's visual: the premium card + an Apple-glass declined panel,
// side by side on the loop's grey stage. Card tilts in 3D as you scroll.
function DetectVisual() {
  const [errored, setErrored] = useState(false);
  const [tf, setTf] = useState('rotateY(0deg) rotateX(0deg)');
  // the card follows the mouse — tilt toward the cursor, ease back when it leaves
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTf(`rotateY(${(x * 28).toFixed(1)}deg) rotateX(${(-y * 20).toFixed(1)}deg)`);
  };
  const reset = () => setTf('rotateY(0deg) rotateX(0deg)');

  return (
    <div className="w-full">
      <div className="max-w-[900px] mx-auto px-6 lg:px-8 pt-6 lg:pt-8">
        {/* ABOVE box — the full failed-checkout screenshot (where the card used to be) */}
        <div className="rounded-[14px] border border-hairline overflow-hidden bg-white shadow-[0_12px_34px_-18px_rgba(16,24,40,0.35)]">
          <img src="/checkout-failed.png" alt="Failed checkout" className="block w-full" />
        </div>
      </div>

      {/* full-width divider between the checkout image and the card/invoice row */}
      <div className="border-t border-[#C9C9CF] mt-6" />

      <div className="max-w-[900px] mx-auto px-6 lg:px-8 pb-6 lg:pb-8 pt-4">
        {/* card + overdue invoice, side by side on the grey stage — light divider between, equal heights */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-stretch">
          {/* card side */}
          <div className="flex flex-col gap-4 px-2 py-6 md:pr-8 md:border-r border-[#C9C9CF]">
            <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-stop">
              <span className="w-2 h-2 rounded-full bg-stop" /> Card declined — insufficient funds
            </div>
            <p className="text-[17px] lg:text-[21px] font-semibold tracking-tight2 leading-snug text-ink/80 max-w-[420px]">
              The bank declined the charge due to a temporary balance shortage.
            </p>
            <div className="flex-1 grid place-items-center" style={{ perspective: '1000px' }}>
              <div
                onMouseMove={onMove}
                onMouseLeave={reset}
                className="cursor-pointer"
                style={{ transform: tf, transformStyle: 'preserve-3d', transition: 'transform .16s ease-out', willChange: 'transform' }}
              >
                {!errored ? (
                  <div className="relative w-[300px] max-w-full rounded-[18px] overflow-hidden shadow-[0_28px_56px_-22px_rgba(0,0,0,0.6)]">
                    <img src="/card.jpg" alt="Declined card" onError={() => setErrored(true)} className="block w-full" />
                    <div className="absolute flex items-center" style={{ left: '9.5%', top: '83.5%', width: '42%', height: '8.5%', background: '#000' }}>
                      <span className="text-white font-semibold" style={{ fontSize: 'clamp(9px,3vw,13px)', letterSpacing: '0.04em' }}>ARJUN MEHTA</span>
                    </div>
                  </div>
                ) : (
                  <PremiumCard />
                )}
              </div>
            </div>
          </div>

          {/* overdue invoice side */}
          <div className="flex flex-col gap-4 px-2 py-6 md:pl-8">
            <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-warn">
              <span className="w-2 h-2 rounded-full bg-warn" /> Invoice overdue — INV-2026-0420
            </div>
            <p className="text-[17px] lg:text-[21px] font-semibold tracking-tight2 leading-snug text-ink/80 max-w-[420px]">
              The due date has passed, but the balance is still recoverable.
            </p>
            <div className="flex-1 grid place-items-center">
              <img
                src="/invoice-overdue.png"
                alt="Overdue invoice INV-2026-0420"
                className="max-h-[420px] w-auto rounded-[6px] shadow-[0_20px_46px_-18px_rgba(16,24,40,0.4)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Recover step: the recovery dashboard with interactive markers over the purple
// bars and the trend line — hover a dot to reveal the real number.
// An invisible hover zone over a bar / graph area — reveals the real number on hover.
function RecoverHot({ left, top, width, height, label, sub }) {
  return (
    <div className="absolute group" style={{ left, top, width, height }}>
      <div className="w-full h-full cursor-pointer rounded-md transition-colors group-hover:bg-[#8B5CF6]/15" />
      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap rounded-[10px] px-3 py-2 text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] pointer-events-none z-20"
        style={{ background: 'rgba(20,21,26,0.92)', backdropFilter: 'blur(10px)' }}
      >
        <div className="text-[13px] font-semibold tabular-nums">{label}</div>
        {sub && <div className="text-[11px] text-white/60">{sub}</div>}
      </div>
    </div>
  );
}

// Decide step's email card — recreated live: the body types out fast, then the
// pay link + sign-off fade in. Types when scrolled into view.
function DecideEmail({ play }) {
  const BODY = 'Hi Aarav,\n\nJust a gentle reminder that invoice #INV-1042 for ₹1,20,000 is now 7 days overdue. You can pay securely using the link below — it takes less than a minute.';
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!play) { setN(0); return; }
    let i = 0;
    const id = setInterval(() => { i += 2; setN(i); if (i >= BODY.length) { setN(BODY.length); clearInterval(id); } }, 16);
    return () => clearInterval(id);
  }, [play]);
  const typing = play && n < BODY.length;
  const done = n >= BODY.length;

  return (
    <div className="w-[300px] lg:w-[336px] shrink-0 rounded-[16px] bg-white border border-hairline shadow-[0_24px_54px_-22px_rgba(16,24,40,0.4)] overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <div className="text-[12px] text-muted">Send email</div>
        <div className="mt-1 text-[16px] font-bold text-ink leading-snug tracking-tight2">Send gentle email reminder to Aarav Sharma</div>
        <div className="mt-1 text-[12.5px] text-muted leading-snug">Personalized email nudges the customer with a payment reminder.</div>
      </div>
      <div className="border-t border-hairline px-5 py-2.5 flex items-center gap-2 text-[13px]">
        <span className="text-muted text-[12px]">To</span>
        <span className="w-6 h-6 rounded-full bg-good text-white grid place-items-center text-[11px] font-semibold">A</span>
        <span className="font-medium text-ink">Aarav Sharma</span>
        <span className="ml-auto text-[11px] text-faint">CC / BCC</span>
      </div>
      <div className="border-t border-hairline px-5 py-2.5 text-[13px] font-medium text-ink">Friendly reminder — payment for invoice #INV-1042</div>
      <div className="border-t border-hairline px-5 py-4 text-[13px] text-ink/85 leading-relaxed min-h-[220px]">
        <span className="whitespace-pre-line">{BODY.slice(0, n)}</span>
        {typing && <span className="inline-block w-[2px] h-[15px] align-[-2px] bg-accent ml-0.5 animate-pulse" />}
        {done && (
          <div style={{ animation: 'ov-fill-in .4s ease both' }}>
            <div className="my-3 rounded-[10px] bg-accent-soft px-3 py-2.5 flex items-center gap-2.5">
              <span className="text-accent">🔗</span>
              <div className="leading-tight">
                <div className="text-[13px] font-semibold text-accent-ink">Pay securely now →</div>
                <div className="text-[12.5px] text-accent">pay.sentinel.com/inv/INV-1042</div>
              </div>
            </div>
            <span className="whitespace-pre-line">Need help? Just reply to this email.{'\n\n'}Best,{'\n'}Sentinel Team</span>
          </div>
        )}
      </div>
      <div className="border-t border-hairline px-5 py-3 flex items-center gap-3">
        <span className="inline-flex items-center h-8 px-4 rounded-[9px] bg-[#2563EB] text-white text-[13px] font-semibold">Send email</span>
        <span className="text-[13px] text-muted">Discard</span>
        <span className="ml-auto inline-flex items-center h-8 px-4 rounded-[9px] border border-hairline text-[13px] font-medium text-ink">Save draft</span>
      </div>
    </div>
  );
}

// Diagnose step: a clean 3-column live flow — signals feed the failed payment,
// which resolves to a root cause. Nodes pop in one by one; connectors flow.
const DIAG_SIGNALS = [
  { t: 'Bank response', v: 'Insufficient funds', tone: 'bg-stop', d: 0.3 },
  { t: 'Card status', v: 'Active', tone: 'bg-good', d: 1.0 },
  { t: 'Previous attempts', v: '2 failed', tone: 'bg-warn', d: 1.7 },
  { t: 'Customer history', v: 'Active subscriber', tone: 'bg-good', d: 2.4 },
];
function DiagnoseVisual({ play }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  // replays every time this step becomes the active one in view
  useEffect(() => { setShown(!!play); }, [play]);
  const pop = (d) => ({ animation: shown ? 'diag-pop .55s cubic-bezier(.22,1,.36,1) both' : 'none', animationDelay: `${d}s`, opacity: shown ? undefined : 0 });
  const conn = (d, on) => ({
    strokeDasharray: '2.5 2.5',
    animation: shown ? `ov-fill-in .5s ease both${on ? ', diag-flow 1s linear infinite' : ''}` : 'none',
    animationDelay: `${d}s${on ? `, ${d}s` : ''}`,
    opacity: shown ? undefined : 0,
  });

  return (
    <div ref={ref} className="w-full px-6 py-10 lg:px-12 lg:py-14">
      <div className="relative max-w-[980px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-y-6 gap-x-2">
        {/* flowing connectors (desktop) */}
        <svg className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke="#CBCBD3" strokeWidth="0.35">
          <path d="M27,18 C40,18 40,50 46,50" style={conn(3.2, true)} />
          <path d="M27,39 C40,39 41,50 46,50" style={conn(3.25, true)} />
          <path d="M27,61 C40,61 41,50 46,50" style={conn(3.3, true)} />
          <path d="M27,82 C40,82 40,50 46,50" style={conn(3.35, true)} />
          <path d="M56,50 L72,50" stroke="#7Fc79A" strokeWidth="0.5" style={conn(4.3, true)} />
        </svg>

        {/* LEFT — signals */}
        <div className="flex flex-col gap-3 lg:items-end relative z-10">
          {DIAG_SIGNALS.map((s) => (
            <div key={s.t} style={pop(s.d)} className="w-full lg:w-[216px] rounded-[12px] bg-white border border-hairline shadow-[0_8px_22px_-14px_rgba(16,24,40,0.3)] px-3.5 py-2.5 flex items-center gap-2.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.tone}`} />
              <div className="min-w-0">
                <div className="text-[11px] text-muted leading-tight">{s.t}</div>
                <div className="text-[13.5px] font-semibold text-ink leading-tight">{s.v}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CENTER — failed payment (after the 4 signal cards) */}
        <div style={pop(3.2)} className="justify-self-center relative z-10">
          <div className="relative rounded-[18px] bg-white border border-hairline shadow-[0_16px_38px_-14px_rgba(16,24,40,0.4)] px-8 py-5 text-center">
            <div className="text-[11px] uppercase tracking-[0.16em] text-faint">Analysing</div>
            <div className="mt-0.5 text-[30px] lg:text-[34px] font-bold tracking-tight2 text-ink tabular-nums leading-none">₹12,499</div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-stop"><span className="w-1.5 h-1.5 rounded-full bg-stop" /> Payment failed</div>
          </div>
        </div>

        {/* RIGHT — root cause (last) */}
        <div style={pop(4.0)} className="lg:justify-self-start w-full lg:w-[260px] relative z-10">
          <div className="rounded-[18px] bg-white border border-hairline shadow-[0_18px_44px_-16px_rgba(16,24,40,0.45)] p-5">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-good">
              <span className="w-2 h-2 rounded-full bg-good animate-pulse" /> Root cause identified
            </div>
            <div className="mt-2 text-[19px] lg:text-[21px] font-bold tracking-tight2 text-ink leading-tight">Temporary insufficient balance</div>
            <div className="mt-4 pt-4 border-t border-hairline flex items-end gap-2">
              <span className="text-[34px] font-bold tracking-tight2 text-good tabular-nums leading-none">87%</span>
              <span className="text-[12px] text-muted mb-1">recovery likelihood</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Live batch metrics — fetches the real numbers and counts them up on load.
function LiveMetrics({ play }) {
  const [m, setM] = useState(null);
  const [pr, setPr] = useState(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    fetch('/api/metrics').then((r) => r.json()).then(setM).catch(() => {});
    fetch('/api/promises')
      .then((r) => r.json())
      .then((rows) => {
        const s = { kept: 0, pending: 0, overdue: 0, total: 0 };
        rows.forEach((x) => { s[x.status] = (s[x.status] || 0) + 1; s.total += x.amountRs; });
        setPr(s);
      })
      .catch(() => {});
  }, []);
  // recount from 0 → real value every time this step is scrolled into view
  useEffect(() => {
    if (!play) { setP(0); return; }
    const t0 = Date.now();
    const dur = 1100;
    const id = setInterval(() => {
      const pr = Math.min(1, (Date.now() - t0) / dur);
      setP(1 - Math.pow(1 - pr, 3));
      if (pr >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [play, m]);

  const d = m
    ? {
        rate: m.sentinel.recoveryRatePct,
        recovered: m.sentinel.moneyRecovered,
        rc: m.batch.recoveredCount,
        total: m.batch.total,
        atRisk: m.batch.amountAtRisk,
        baseline: m.baseline.recoveryRatePct,
        net: m.comparison.netBenefit,
        fp: m.sentinel.falsePositiveCost,
      }
    : { rate: 73.7, recovered: 17642, rc: 8, total: 10, atRisk: 23940, baseline: 62.8, net: 2506, fp: 90 };
  const dec = m
    ? { interventions: m.sentinel.interventions, retries: m.sentinel.retries, contacts: m.sentinel.contacts ?? m.sentinel.messages, skipped: m.sentinel.interventionsSkipped }
    : { interventions: 23, retries: 10, contacts: 13, skipped: 2 };
  const pp = pr || { kept: 3, pending: 1, overdue: 1, total: 21295 };
  const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const Row = ({ label, value, tone }) => (
    <div className="flex items-center justify-between py-1.5 border-t border-hairline2 first:border-0">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-warn' : 'text-ink'}`}>{value}</span>
    </div>
  );
  const Head = ({ children }) => <div className="mt-5 mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{children}</div>;

  return (
    <div className="w-full lg:w-[320px] shrink-0 rounded-[16px] border border-hairline bg-white p-6 shadow-[0_10px_30px_-16px_rgba(16,24,40,0.15)] self-start">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-good animate-pulse" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-good">Live</span>
        <span className="ml-auto text-[11px] text-faint">Batch metrics</span>
      </div>
      <div className="mt-4 text-[12.5px] text-muted">Recovery rate</div>
      <div className="text-[40px] font-semibold tracking-tight2 tabular-nums text-ink leading-none">{(d.rate * p).toFixed(1)}%</div>
      <div className="mt-5">
        <Row label="Money recovered" value={inr(d.recovered * p)} tone="good" />
        <Row label="Recovered" value={`${Math.round(d.rc * p)} of ${d.total}`} />
        <Row label="Amount at risk" value={inr(d.atRisk * p)} />
        <Row label="Naive baseline" value={`${(d.baseline * p).toFixed(1)}%`} />
        <Row label="Net benefit" value={'+' + inr(d.net * p)} tone="good" />
        <Row label="False-positive cost" value={inr(d.fp * p)} />
      </div>

      <Head>Decision logic</Head>
      <Row label="Interventions run" value={Math.round(dec.interventions * p)} />
      <Row label="Silent auto-retries" value={Math.round(dec.retries * p)} />
      <Row label="Customer contacts" value={Math.round(dec.contacts * p)} />
      <Row label="Refusals logged" value={Math.round(dec.skipped * p)} />

      <Head>Promise-to-pay</Head>
      <Row label="Kept" value={Math.round(pp.kept * p)} tone="good" />
      <Row label="Pending" value={Math.round(pp.pending * p)} />
      <Row label="Overdue" value={Math.round(pp.overdue * p)} tone="warn" />
      <Row label="₹ promised" value={inr(pp.total * p)} />
    </div>
  );
}

function RecoverVisual({ play }) {
  return (
    <div className="w-full">
      <div className="max-w-[1120px] mx-auto px-6 lg:px-8 pt-6 lg:pt-8">
        <p className="text-[13px] lg:text-[15px] font-medium text-muted text-center tracking-tight2">
          Recovery rate up. Payments recovered. Results that speak.
        </p>
        <div className="mt-5 flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
          {/* dashboard image with hover zones */}
          <div className="relative flex-1 min-w-0 self-start">
            <img src="/loop-recover.png" alt="Recover step" className="block w-full rounded-[14px] shadow-[0_22px_50px_-20px_rgba(16,24,40,0.35)]" />
            <RecoverHot left="24.5%" top="34%" width="6%" height="16%" label="89.2%" sub="Recovery · Aug 25–27" />
            <RecoverHot left="34.5%" top="31.5%" width="7%" height="18.5%" label="92.4%" sub="Recovery · Aug 28–30" />
            <RecoverHot left="14%" top="71%" width="45%" height="20%" label="₹3,120 / day" sub="Aug 25–28 · recovering" />
            <RecoverHot left="60%" top="78%" width="30%" height="16%" label="₹4,999" sub="Aug 29 · recovered" />
          </div>
          {/* live metrics panel */}
          <LiveMetrics play={play} />
        </div>
      </div>

      {/* full-width divider between the dashboard and the two boxes */}
      <div className="border-t border-[#C9C9CF] mt-6" />

      <div className="max-w-[900px] mx-auto px-6 lg:px-8 pb-6 lg:pb-8 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 items-stretch">
          {/* Decision logged */}
          <div className="flex flex-col gap-4 px-2 py-6 md:pr-8 md:border-r border-[#C9C9CF]">
            <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-good">
              <span className="w-2 h-2 rounded-full bg-good" /> Decision logged
            </div>
            <p className="text-[17px] lg:text-[21px] font-semibold tracking-tight2 leading-snug text-ink/80 max-w-[420px]">
              Smart retry executed at 9:00 AM — ₹4,999 booked back, fully auditable.
            </p>
            {/* mini audit trail */}
            <div className="space-y-2">
              {[
                'Diagnosed — Transient (82%)',
                'Decided — Smart retry, 9:00 AM',
                'Executed — silent retry #2',
                'Recovered — ₹4,999',
              ].map((s) => (
                <div key={s} className="flex items-center gap-2 text-[12.5px] text-ink/70">
                  <span className="w-4 h-4 rounded-full bg-good-soft text-good grid place-items-center shrink-0"><IconArrowRight size={10} /></span>
                  {s}
                </div>
              ))}
            </div>
            <div className="mt-auto pt-1 text-[13px] text-muted">8 steps logged · retry #2 succeeded</div>
          </div>

          {/* Promise-to-pay kept */}
          <div className="flex flex-col gap-4 px-2 py-6 md:pl-8">
            <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-good">
              <span className="w-2 h-2 rounded-full bg-good" /> Promise-to-pay kept
            </div>
            <p className="text-[17px] lg:text-[21px] font-semibold tracking-tight2 leading-snug text-ink/80 max-w-[420px]">
              Customer promised to pay by 23 Aug — settled on time, no chasing needed.
            </p>
            {/* mini promise list */}
            <div className="space-y-1.5">
              {[
                { n: 'Isha Verma', a: '₹4,999', s: 'Kept', c: 'bg-good-soft text-good border-good/20' },
                { n: 'Reyansh Sharma', a: '₹4,999', s: 'Kept', c: 'bg-good-soft text-good border-good/20' },
                { n: 'Arjun Chopra', a: '₹4,999', s: 'Overdue', c: 'bg-warn-soft text-warn border-warn/20' },
              ].map((r) => (
                <div key={r.n} className="flex items-center gap-2 text-[12.5px]">
                  <span className="text-ink/80 font-medium">{r.n}</span>
                  <span className="text-faint tabular-nums">{r.a}</span>
                  <span className={`ml-auto chip h-5 px-2 text-[10.5px] border ${r.c}`}>{r.s}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-1 text-[13px] text-muted">5 promises tracked · 3 kept</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- Why it's safe (live guardrails) */
function WhyItsSafe() {
  const [m, setM] = useState(null);
  const [audit, setAudit] = useState([]);
  const [pays, setPays] = useState([]);
  const [openCard, setOpenCard] = useState(null);
  useEffect(() => {
    const load = () => {
      fetch('/api/metrics').then((r) => r.json()).then(setM).catch(() => {});
      fetch('/api/audit').then((r) => r.json()).then(setAudit).catch(() => {});
      fetch('/api/payments').then((r) => r.json()).then(setPays).catch(() => {});
    };
    load();
    const id = setInterval(load, 8000); // keep the live numbers fresh if the batch is re-run
    return () => clearInterval(id);
  }, []);

  // all four numbers computed from real batch data
  const retriesBlocked = m?.sentinel?.interventionsSkipped ?? 0;              // refusals due to stopping rules
  const escalated = pays.filter((p) => p.status === 'stopped').length;        // cases handed to a human
  const lastTs = audit[0]?.ts;                                               // most recent logged decision
  const lastLogged = lastTs ? new Date(lastTs).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  const lift = m ? +(m.sentinel.recoveryRatePct - m.baseline.recoveryRatePct).toFixed(1) : 0; // vs naive baseline

  const tfmt = (ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const rupee = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  const CARDS = [
    {
      badge: 'Stopping rules', h: 'It knows when to stop.', s: 'Never more than 3 retries. Never a second attempt on a fraud block. Hard limits, enforced in code — not a suggestion to an AI.', live: `${retriesBlocked} retries blocked this run`,
      title: 'Stopping rules — refusals logged this run',
      lines: [
        'Policy · max 3 retries · no retry on fraud block · drop if no longer failed',
        `Refusals logged: ${retriesBlocked}`,
        '—',
        ...audit.filter((e) => e.step === 'intervention_skipped').slice(0, 8).map((e) => `REFUSED · ${(e.decision || 'stopping rule enforced').slice(0, 70)}`),
      ],
    },
    {
      badge: 'Compliant escalation', h: 'Escalation follows the rules.', s: "Mandate retries respect RBI's notice-period requirements. Anything outside policy goes to a human, not around one.", live: `${escalated} cases escalated to a human this run`,
      title: 'Compliant escalation — human review queue',
      lines: [
        `Cases handed to a human: ${escalated}`,
        '—',
        ...pays.filter((p) => p.status === 'stopped').slice(0, 8).map((p) => `ESCALATED · ${p.customerName} · ${rupee(p.amountRs)} · ${p.failureLabel}`),
      ],
    },
    {
      badge: 'Audit trail', h: 'Every decision is on record.', s: 'Detected, diagnosed, decided, acted — each step timestamped and traceable, for any transaction, at any time.', live: `Last logged: ${lastLogged}`,
      title: `Audit trail — ${audit.length} events logged`,
      lines: audit.slice(0, 10).map((e) => `${tfmt(e.ts)} · ${(e.decision || e.action || '').slice(0, 74)}`),
    },
    {
      badge: 'Measured, not assumed', h: 'Proven against a baseline.', s: 'Every batch run is compared against a naive retry-everything baseline, so the numbers show real improvement — not a guess.', live: `+${lift} pts recovery rate vs baseline`,
      title: 'Measured vs naive retry-everything baseline',
      lines: m ? [
        `Sentinel recovered · ${rupee(m.sentinel.moneyRecovered)}  (${m.sentinel.recoveryRatePct}%)`,
        `Naive baseline   · ${rupee(m.baseline.moneyRecovered)}  (${m.baseline.recoveryRatePct}%)`,
        '—',
        `Recovery-rate lift · +${lift} pts`,
        `Extra recovered   · ${rupee(m.comparison.extraRecovered)}`,
        `Retries saved     · ${m.comparison.retriesSaved}`,
        `Net benefit       · ${rupee(m.comparison.netBenefit)}`,
      ] : ['Loading…'],
    },
  ];

  return (
    <section id="why-its-safe" className="bg-white border-t border-black/[0.05] scroll-mt-20">
      <div className="max-w-[1200px] mx-auto px-6 py-20 lg:py-24">
        <div className="text-center max-w-[680px] mx-auto">
          <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full border text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#0F6E56', background: 'rgba(15,110,86,0.08)', borderColor: 'rgba(15,110,86,0.2)' }}>Why it's safe</span>
          <h2 className="mt-5 text-[34px] lg:text-[46px] leading-[1.05] font-bold tracking-tight2" style={{ color: '#151512' }}>Bounded by design.</h2>
          <p className="mt-4 text-[16px] lg:text-[18px] leading-relaxed" style={{ color: '#7a7a75' }}>
            Every action is explainable, every retry is limited, and every decision is logged. The agent never acts beyond what it is allowed to.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {CARDS.map((c, i) => (
            <div key={c.badge} className="rounded-[16px] bg-white p-6 flex flex-col shadow-[0_2px_12px_-6px_rgba(16,24,40,0.10)]" style={{ border: '1px solid #EDEDE8' }}>
              <span className="self-start inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#7a7a75', background: '#F6F6F2', border: '1px solid #EDEDE8' }}>{c.badge}</span>
              <h3 className="mt-4 text-[18px] font-bold tracking-tight2 leading-snug" style={{ color: '#151512' }}>{c.h}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: '#7a7a75' }}>{c.s}</p>
              <div className="mt-auto pt-5 flex items-center gap-2">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping" style={{ background: '#0F6E56' }} />
                  <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: '#0F6E56' }} />
                </span>
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: '#0F6E56' }}>{c.live}</span>
              </div>
              <button onClick={() => setOpenCard(i)} className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold hover:gap-2.5 transition-all" style={{ color: '#0F6E56' }}>
                Check the real data <IconArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
      {openCard != null && <SafeDataModal title={CARDS[openCard].title} lines={CARDS[openCard].lines} onClose={() => setOpenCard(null)} />}
    </section>
  );
}

// Apple-glass panel that types the real data out live.
function SafeDataModal({ title, lines, onClose }) {
  const full = (lines && lines.length ? lines : ['No data yet.']).join('\n');
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => { i += 2; setN(i); if (i >= full.length) clearInterval(id); }, 14);
    return () => clearInterval(id);
  }, [full]);
  const typing = n < full.length;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-[540px] rounded-[22px] border p-6 text-white shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]"
        style={{ background: 'rgba(16,22,26,0.66)', borderColor: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(26px) saturate(170%)', WebkitBackdropFilter: 'blur(26px) saturate(170%)' }}
      >
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(15,110,86,0.35)' }} />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full opacity-70 animate-ping" style={{ background: '#34D399' }} /><span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: '#34D399' }} /></span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#6EE7B7' }}>Live data</span>
            <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full grid place-items-center text-white/70 hover:bg-white/10">✕</button>
          </div>
          <div className="mt-3 text-[16px] font-semibold text-white">{title}</div>
          <pre className="mt-3 text-[12.5px] leading-[1.7] whitespace-pre-wrap break-words max-h-[320px] overflow-y-auto" style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            {full.slice(0, n)}
            {typing && <span className="inline-block w-[7px] h-[14px] align-[-2px] ml-0.5 animate-pulse" style={{ background: '#6EE7B7' }} />}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- Hinglish Voice Agent */
/* ----- Measured, not marketed: real recovery outcomes (live from /api/metrics) ----- */
function CountUp({ to, prefix = '', suffix = '', dec = 0, play }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!play) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(to); return; }
    let raf, start;
    const dur = 1150;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const safety = setTimeout(() => setV(to), 1400); // guarantee final value even if rAF is throttled
    return () => { cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [play, to]);
  return <span>{prefix}{v.toFixed(dec)}{suffix}</span>;
}
function MeasuredResults() {
  const [m, setM] = useState(null);
  const [play, setPlay] = useState(false);
  const ref = useRef(null);
  useEffect(() => { fetch('/api/metrics').then((r) => r.json()).then(setM).catch(() => {}); }, []);
  // count up when the section scrolls into view (rAF-safe fallback below)
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const check = () => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight * 0.85 && r.bottom > 0) { setPlay(true); return true; } return false; };
    if (check()) return;
    const onScroll = () => { if (check()) window.removeEventListener('scroll', onScroll); };
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { if (e.isIntersecting) setPlay(true); }, { threshold: 0.3 }) : null;
    io?.observe(el);
    const fb = setTimeout(() => setPlay(true), 3000); // hard fallback so numbers are never stuck at 0
    return () => { window.removeEventListener('scroll', onScroll); io?.disconnect(); clearTimeout(fb); };
  }, []);

  const parts = (rs) => { const n = Number(rs || 0); if (n >= 1e7) return { val: n / 1e7, suffix: 'Cr', dec: 2 }; if (n >= 1e5) return { val: n / 1e5, suffix: 'L', dec: 2 }; if (n >= 1e3) return { val: n / 1e3, suffix: 'K', dec: 1 }; return { val: n, suffix: '', dec: 0 }; };
  const total = m?.batch?.total ?? 67;
  const rate = m?.sentinel?.recoveryRatePct ?? 66.4;
  const rec = parts(m?.sentinel?.moneyRecovered ?? 375000);
  const ext = parts(m?.comparison?.extraRecovered ?? 90500);
  const retriesSaved = m?.comparison?.retriesSaved ?? 123;

  const stats = [
    { label: 'Failed payments', to: total, dec: 0 },
    { label: 'Recovered', to: m?.batch?.recoveredCount ?? 46, dec: 0, tail: ` of ${total}` },
    { label: 'Recovery rate', to: rate, suffix: '%', dec: 1 },
    { label: 'vs naive baseline', to: ext.val, prefix: '+₹', suffix: ext.suffix, dec: ext.dec, good: true },
    { label: 'Fraud blocked', to: 100, suffix: '%', dec: 0, good: true },
  ];

  return (
    <section ref={ref} className="bg-white border-t border-black/[0.05]">
      <div className="max-w-[1180px] mx-auto px-6 py-20 lg:py-24">
        <div className="max-w-[700px]">
          <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full border text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#0F6E56', background: 'rgba(15,110,86,0.08)', borderColor: 'rgba(15,110,86,0.2)' }}>
            Measured, not marketed
          </span>
          <h2 className="mt-5 text-[34px] lg:text-[46px] leading-[1.05] font-bold tracking-tight2 text-ink">Real outcomes from failed-payment recovery.</h2>
          <p className="mt-4 text-[15px] lg:text-[16px] leading-relaxed" style={{ color: '#7a7a75' }}>
            Not a claim — a run. Every number is computed from the batch and scored against a naive baseline; recoveries are labelled <b className="text-ink">real</b> (Razorpay test-confirmed) or <b className="text-ink">modeled</b>.
          </p>
        </div>

        {/* three editorial cards */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1 — DIAGNOSE (bluish glass) */}
          <MCard label="Diagnose" blur={2}
            bg="url('/card-diagnose.jpg')"
            link="See how it works" onClick={() => scrollToId('how-it-works')}
            sub="Razorpay code · step · reason → one bounded action. No blind retries.">
            <Statement lines={["Every failure", "gets a real", "diagnosis."]} />
          </MCard>

          {/* Card 2 — MEASURED (dark slate stats, like the reference middle card) */}
          <div className="group relative overflow-hidden rounded-[20px] p-7 min-h-[440px] flex flex-col text-white transition-all duration-300 hover:-translate-y-1.5 shadow-[0_20px_50px_-24px_rgba(16,24,40,0.5)] hover:shadow-[0_36px_80px_-28px_rgba(16,24,40,0.6)]"
            style={{ background: 'linear-gradient(160deg,#1E2A3D 0%,#141C2A 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Pill>Measured</Pill>
            <div className="mt-6 space-y-2.5">
              {stats.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-2.5 last:border-0">
                  <span className="text-[13.5px] text-white/55">{s.label}</span>
                  <span className="font-mono text-[16px] lg:text-[18px] font-semibold tabular-nums" style={{ color: s.good ? '#4ADE80' : '#DCE6F5' }}>
                    <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} dec={s.dec} play={play} />{s.tail || ''}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-6">
              <p className="text-[12.5px] leading-snug text-white/45">Not everything is real yet — every recovery is labelled real or modeled.</p>
              <Link to="/app/overview" className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-white/90 hover:gap-2 transition-all">Open the console <span>↗</span></Link>
            </div>
          </div>

          {/* Card 3 — RECOVERED (bluish glass) */}
          <MCard label="Recovered" blur={3}
            bg="url('/card-recovered.jpg')"
            scrim="linear-gradient(180deg, rgba(8,15,26,0.55) 0%, rgba(8,15,26,0.46) 38%, rgba(8,15,26,0.78) 100%)"
            link="Try it live" to="/app/voice"
            sub={<><CountUp to={retriesSaved} dec={0} play={play} /> fewer wasted retries. Every rupee scored against a naive baseline.</>}>
            <div className="text-[30px] lg:text-[34px] font-semibold leading-[1.12] tracking-tight2">
              <div>Measured.</div>
              <div className="text-white/80">Bounded.</div>
              <div className="text-white/65">Recovered.</div>
            </div>
          </MCard>
        </div>

        <p className="mt-7 text-[12px]" style={{ color: '#b3b3ae' }}>
          Synthetic data · Razorpay test mode · outcomes modeled against a transparent per-class baseline, with a real test-link recovery path in the console.
        </p>
      </div>
    </section>
  );
}
function Pill({ children }) {
  return <span className="inline-flex self-start items-center h-6 px-2.5 rounded-md border border-white/25 text-white/70 text-[10px] font-semibold uppercase tracking-[0.2em]">{children}</span>;
}
function Statement({ lines }) {
  return (
    <div className="text-[30px] lg:text-[34px] font-semibold leading-[1.12] tracking-tight2 text-white">
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}
function MCard({ label, bg, blur = 2, scrim, link, to, onClick, sub, children }) {
  const LinkEl = to ? Link : 'button';
  return (
    <div className="group relative overflow-hidden rounded-[20px] p-7 min-h-[440px] flex flex-col text-white transition-all duration-300 hover:-translate-y-1.5 shadow-[0_20px_50px_-24px_rgba(30,52,90,0.55)] hover:shadow-[0_38px_84px_-28px_rgba(30,52,90,0.7)]"
      style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
      {/* blurred image background */}
      <div className="pointer-events-none absolute inset-[-10%] transition-transform duration-500 group-hover:scale-105" style={{ background: bg, backgroundSize: 'cover', backgroundPosition: 'center', filter: `blur(${blur}px)` }} />
      {/* dark scrim so the text stays fully legible */}
      <div className="pointer-events-none absolute inset-0" style={{ background: scrim || 'linear-gradient(180deg, rgba(8,15,26,0.42) 0%, rgba(8,15,26,0.34) 45%, rgba(8,15,26,0.66) 100%)' }} />
      <div className="relative flex flex-col flex-1">
        <Pill>{label}</Pill>
        <div className="mt-auto pt-10" style={{ textShadow: '0 2px 14px rgba(0,0,0,0.4)' }}>{children}</div>
        <p className="mt-4 text-[12.5px] leading-snug text-white/75 max-w-[88%]" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>{sub}</p>
        <LinkEl {...(to ? { to } : { onClick, type: 'button' })} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-white hover:gap-2 transition-all" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>
          {link} <span>↗</span>
        </LinkEl>
      </div>
    </div>
  );
}

/* ----- Black-theme node-flow architecture diagram of the recovery engine ----- */
function DNode({ x, y, w, label, sub, color, play, delay = 0, glow }) {
  const h = sub ? 54 : 44;
  return (
    <g style={{ opacity: play ? 1 : 0, transform: play ? 'none' : 'translateY(10px)', transformBox: 'fill-box', transition: `opacity .5s ease ${delay}s, transform .55s cubic-bezier(.2,.9,.3,1.2) ${delay}s` }}>
      {glow && <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="14" fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="1.5" style={{ filter: 'url(#nglow)' }} />}
      <rect x={x} y={y} width={w} height={h} rx="11" fill="url(#nodeFill)" stroke="rgba(255,255,255,0.12)" />
      <rect x={x + 12} y={y + (h - 18) / 2} width="18" height="18" rx="6" fill={color} />
      <rect x={x + 12} y={y + (h - 18) / 2} width="18" height="9" rx="6" fill="#ffffff" fillOpacity="0.20" />
      <text x={x + 40} y={y + (sub ? 22 : 27)} fill="#EAEDF3" fontSize="12.5" fontWeight="600" fontFamily="Inter, sans-serif">{label}</text>
      {sub && <text x={x + 40} y={y + 39} fill="#828B9C" fontSize="10" fontFamily="Inter, sans-serif">{sub}</text>}
      <circle cx={x} cy={y + h / 2} r="3" fill="#2A3040" stroke="rgba(255,255,255,0.22)" />
      <circle cx={x + w} cy={y + h / 2} r="3" fill="#2A3040" stroke="rgba(255,255,255,0.22)" />
    </g>
  );
}
function Conn({ x1, y1, x2, y2, stroke = 'rgba(255,255,255,0.18)', play, delay = 0 }) {
  const mx = (x1 + x2) / 2;
  return <path d={`M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke={stroke} strokeWidth="1.6" pathLength="1"
    style={{ strokeDasharray: 1, strokeDashoffset: play ? 0 : 1, transition: `stroke-dashoffset .7s ease ${delay}s` }} />;
}
function RecoveryEngineDiagram() {
  const [rate, setRate] = useState(66.4);
  const [play, setPlay] = useState(false);
  const ref = useRef(null);
  useEffect(() => { fetch('/api/metrics').then((r) => r.json()).then((m) => m?.sentinel?.recoveryRatePct && setRate(m.sentinel.recoveryRatePct)).catch(() => {}); }, []);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const check = () => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight * 0.82 && r.bottom > 0) { setPlay(true); return true; } return false; };
    if (check()) return;
    const onScroll = () => { if (check()) window.removeEventListener('scroll', onScroll); };
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { if (e.isIntersecting) setPlay(true); }, { threshold: 0.25 }) : null;
    io?.observe(el);
    const fb = setTimeout(() => setPlay(true), 3000);
    return () => { window.removeEventListener('scroll', onScroll); io?.disconnect(); clearTimeout(fb); };
  }, []);

  const rows = [
    { y: 60, cls: { t: 'Insufficient funds', s: 'soft decline', c: '#F59E0B' }, act: { t: 'Delayed retry + WhatsApp', s: 'near-payday', c: '#F59E0B' }, out: 'rec' },
    { y: 168, cls: { t: 'Card / mandate', s: 'card_expired · AFA', c: '#F59E0B' }, act: { t: 'Update-card / re-present', s: 'no blind retry', c: '#8B5CF6' }, out: 'rec' },
    { y: 276, cls: { t: 'Transient', s: 'gateway timeout', c: '#3B82F6' }, act: { t: 'Smart retry', s: 'cooled-off', c: '#3B82F6' }, out: 'rec' },
    { y: 384, cls: { t: 'Risk / fraud', s: 'risk_check_failed', c: '#EF4444' }, act: { t: 'Block & escalate', s: 'never contact', c: '#EF4444' }, out: 'stop' },
  ];
  const startX = 26, sW = 152, diagX = 200, dW = 150, clsX = 388, clsW = 168, actX = 606, actW = 196, polX = 850, polW = 156, outX = 1046, outW = 158;
  const midY = 222, cY = midY + 27; // start/diagnose/policy vertical centre
  const cy = (ry) => ry + 27;
  const happy = `M${startX + sW} ${cY} L${diagX} ${cY} L${diagX + dW} ${cY} C${(diagX + dW + clsX) / 2} ${cY}, ${(diagX + dW + clsX) / 2} ${cy(60)}, ${clsX} ${cy(60)} L${clsX + clsW} ${cy(60)} L${actX} ${cy(60)} L${actX + actW} ${cy(60)} C${(actX + actW + polX) / 2} ${cy(60)}, ${(actX + actW + polX) / 2} ${cY}, ${polX} ${cY} L${polX + polW} ${cY} C${(polX + polW + outX) / 2} ${cY}, ${(polX + polW + outX) / 2} ${150}, ${outX} ${150}`;

  return (
    <section ref={ref} className="bg-white border-t border-black/[0.05] text-ink overflow-hidden">
      <div className="max-w-[1180px] mx-auto px-6 py-20 lg:py-24">
        <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full border text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#3546b8', background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.22)' }}>
          The recovery engine
        </span>
        <h2 className="mt-5 text-[32px] lg:text-[42px] leading-[1.06] font-bold tracking-tight2 text-ink">How Sentinel routes a failed payment.</h2>
        <p className="mt-4 text-[15px] lg:text-[16px] leading-relaxed max-w-[640px]" style={{ color: '#7a7a75' }}>
          Detect → diagnose the real Razorpay reason → branch by class → take one bounded action — every branch passes the deterministic policy engine before anything fires.
        </p>

        <div className="relative mt-10 rounded-[18px] overflow-x-auto ring-1 ring-black/[0.08] shadow-[0_24px_60px_-24px_rgba(16,24,40,0.35)]" style={{ background: '#08090C' }}>
          <svg viewBox="0 0 1230 560" className="w-full block" style={{ minWidth: 980 }}>
            <defs>
              <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.05)" /></pattern>
              <linearGradient id="nodeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#181C25" /><stop offset="100%" stopColor="#111520" /></linearGradient>
              <filter id="nglow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4" /></filter>
              <filter id="pglow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3" /></filter>
            </defs>
            <rect width="1230" height="560" fill="url(#dots)" />

            {/* connectors */}
            <Conn x1={startX + sW} y1={cY} x2={diagX} y2={cY} play={play} delay={0.15} />
            {rows.map((r, i) => (
              <g key={i}>
                <Conn x1={diagX + dW} y1={cY} x2={clsX} y2={cy(r.y)} play={play} delay={0.3 + i * 0.05} />
                <Conn x1={clsX + clsW} y1={cy(r.y)} x2={actX} y2={cy(r.y)} play={play} delay={0.48 + i * 0.05} />
                <Conn x1={actX + actW} y1={cy(r.y)} x2={polX} y2={cY} stroke={r.out === 'stop' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.16)'} play={play} delay={0.66 + i * 0.05} />
              </g>
            ))}
            <Conn x1={polX + polW} y1={cY} x2={outX} y2={150} stroke="rgba(34,197,94,0.55)" play={play} delay={0.86} />
            <Conn x1={polX + polW} y1={cY} x2={outX} y2={300} stroke="rgba(100,116,139,0.45)" play={play} delay={0.9} />
            {/* success / failed labels */}
            <text x={polX + polW + 14} y={190} fill="#4ADE80" fontSize="10.5" fontWeight="700" fontFamily="Inter, sans-serif" style={{ opacity: play ? 1 : 0, transition: 'opacity .4s ease 1s' }}>Success</text>
            <text x={polX + polW + 14} y={272} fill="#94A3B8" fontSize="10.5" fontWeight="700" fontFamily="Inter, sans-serif" style={{ opacity: play ? 1 : 0, transition: 'opacity .4s ease 1s' }}>Failed</text>

            {/* traveling pulse along the happy path */}
            {play && (
              <circle r="4" fill="#4ADE80" filter="url(#pglow)">
                <animateMotion dur="2.8s" begin="1.1s" repeatCount="indefinite" path={happy} />
              </circle>
            )}

            {/* nodes */}
            <DNode x={startX} y={midY} w={sW} label="Failed payment" sub="code · step · reason" color="#22C55E" play={play} delay={0.05} />
            <DNode x={diagX} y={midY} w={dW} label="Diagnose" sub="LLM + rules engine" color="#3B82F6" play={play} delay={0.18} />
            {rows.map((r, i) => (
              <g key={i}>
                <DNode x={clsX} y={r.y} w={clsW} label={r.cls.t} sub={r.cls.s} color={r.cls.c} play={play} delay={0.32 + i * 0.06} />
                <DNode x={actX} y={r.y} w={actW} label={r.act.t} sub={r.act.s} color={r.act.c} play={play} delay={0.5 + i * 0.06} />
              </g>
            ))}
            <DNode x={polX} y={midY} w={polW} label="Policy engine" sub="caps · fraud · window" color="#8B5CF6" play={play} delay={0.74} />
            <DNode x={outX} y={123} w={outW} label="Recovered" sub="measured · audited" color="#22C55E" play={play} delay={0.9} glow />
            <DNode x={outX} y={273} w={outW} label="Stopped / escalate" sub="logged, never spam" color="#64748B" play={play} delay={0.94} />
          </svg>

          {/* floating Recovery Rate KPI card — sits in the empty bottom-right, clear of nodes */}
          <div className="absolute right-5 bottom-5 w-[236px] rounded-[14px] bg-white text-ink p-4 border border-black/[0.08] shadow-[0_18px_44px_-16px_rgba(16,24,40,0.28)]" style={{ opacity: play ? 1 : 0, transform: play ? 'none' : 'translateY(8px)', transition: 'opacity .5s ease 1.1s, transform .5s ease 1.1s' }}>
            <div className="flex items-center gap-1.5 text-[13px] font-semibold">Failure recovery rate <span className="w-3.5 h-3.5 rounded-full border border-black/20 grid place-items-center text-[8px] text-black/40">i</span></div>
            <div className="mt-3 text-[10px] uppercase tracking-wide" style={{ color: '#9a9a95' }}>Recovered transaction rate</div>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-[34px] font-bold tracking-tight2 tabular-nums text-ink">{rate}%</span>
              <span className="mb-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(15,110,86,0.12)', color: '#0F6E56' }}>+2%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const VOICE_FEATURES = [
  { t: 'Understands Hinglish', d: 'Converses naturally in Hindi + English.' },
  { t: 'Reasons about the issue', d: 'Identifies why the payment failed and what to do next.' },
  { t: 'Takes action', d: 'Chooses the right recovery tool and sends the payment link.' },
  { t: 'Closes the loop', d: 'Confirms payment and marks the recovery automatically.' },
];
// The scripted Hinglish recovery conversation shown live in the chat card.
const VOICE_SCRIPT = [
  { who: 'agent', text: 'Namaste! Main Sentinel hoon. Payment mein kya problem aa rahi hai?' },
  { who: 'cust', text: '₹4,999 ka payment baar-baar fail ho raha hai.' },
  { who: 'agent', text: 'Samajh gaya. Main check karta hoon… insufficient balance ki wajah se payment fail hua hai. Abhi retry karna sahi nahi hoga. Main ek secure payment link bhej deta hoon.' },
  { who: 'cust', text: 'Haan, bhej do.' },
  { who: 'agent', text: 'Done. Link WhatsApp par bhej diya hai. Payment complete hote hi main confirm kar dunga.' },
  { who: 'cust', text: 'Ho gaya payment.' },
  { who: 'agent', text: 'Payment received.', recovered: true },
];

function VoiceAgentSection() {
  return (
    <section id="agentic-recovery" className="relative overflow-hidden scroll-mt-20">
      {/* blue gradient background */}
      <div className="absolute inset-0" style={{ backgroundImage: 'url(/voice-gradient.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      {/* soft white scrim so the left copy stays readable; gradient shows behind the chat */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/55 to-white/20" />
      {/* white → blue → white fades at the top and bottom edges so it blends into the white sections */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" />
      <div className="relative max-w-[1200px] mx-auto px-6 py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-16 items-center">
        {/* left — copy */}
        <div className="max-w-[560px]">
          <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-accent-soft text-accent-ink border border-accent/20 text-[12px] font-semibold uppercase tracking-[0.12em]">
            Voice recovery
          </span>
          <h2 className="mt-5 text-[34px] lg:text-[46px] leading-[1.04] font-bold tracking-tight2 text-ink">
            Hinglish Voice Agent
          </h2>
          <p className="mt-2.5 text-[15px] lg:text-[16px] font-medium" style={{ color: '#7a7a75' }}>
            Talk to the customer. Recover the payment.
          </p>
          <p className="mt-4 text-[15px] lg:text-[16px] leading-relaxed" style={{ color: '#43433f' }}>
            Sentinel understands Hinglish, identifies what the customer needs, chooses the right recovery action, and sends the payment link — without a human chasing them.
          </p>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {VOICE_FEATURES.map((f) => (
              <div key={f.t}>
                <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <span className="w-[18px] h-[18px] rounded-full grid place-items-center shrink-0" style={{ background: 'rgba(15,110,86,0.12)', color: '#0F6E56' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  {f.t}
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed pl-[26px]" style={{ color: '#7a7a75' }}>{f.d}</p>
              </div>
            ))}
          </div>
          <Link to="/app/voice" className="mt-8 inline-flex items-center gap-2 h-11 px-5 rounded-[11px] bg-ink text-white text-[14px] font-semibold hover:bg-black transition">
            Try the Voice Agent <IconArrowRight size={16} />
          </Link>
        </div>

        {/* right — live voice widget */}
        <VoiceWidget />
      </div>
    </section>
  );
}
function Bubble({ who, children }) {
  const agent = who === 'agent';
  return (
    <div className={`flex ${agent ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${agent ? 'bg-surface text-ink' : 'bg-accent text-white'}`}>
        {agent && <div className="text-[10px] font-semibold text-accent mb-0.5">Sentinel · Hinglish</div>}
        {children}
      </div>
    </div>
  );
}

// ₹12,499 → "12499 rupaye" so TTS reads amounts naturally.
const forSpeech = (t) => t.replace(/₹\s?([\d,]+)/g, (_, n) => `${n.replace(/,/g, '')} rupaye`);

// A sent voice note — play/pause + waveform, replays your recording.
const WAVE = [8, 14, 6, 18, 11, 5, 16, 9, 13, 7, 17, 10, 6, 14, 8, 12, 5, 15, 9, 7];
function VoiceNote({ audio }) {
  const aRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  return (
    <div className="flex justify-end">
      <div className="flex items-center gap-2.5 rounded-2xl pl-2 pr-3 py-2 bg-accent text-white max-w-[90%]">
        <button
          onClick={() => { const a = aRef.current; if (!a) return; if (playing) a.pause(); else { a.currentTime = 0; a.play(); } }}
          className="w-8 h-8 rounded-full bg-white/20 grid place-items-center shrink-0 hover:bg-white/30"
        >
          {playing ? <span className="flex gap-[3px]"><span className="w-[3px] h-3 bg-white rounded-sm" /><span className="w-[3px] h-3 bg-white rounded-sm" /></span> : <IconPlay size={13} />}
        </button>
        <div className="flex items-center gap-[2px] h-6">
          {WAVE.map((h, i) => (
            <span key={i} className="w-[2.5px] rounded-full" style={{ height: h, background: i / WAVE.length <= prog ? '#fff' : 'rgba(255,255,255,0.45)' }} />
          ))}
        </div>
        <audio
          ref={aRef}
          src={audio}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProg(0); }}
          onTimeUpdate={(e) => { const a = e.target; setProg(a.duration ? a.currentTime / a.duration : 0); }}
        />
      </div>
    </div>
  );
}

function VoiceWidget() {
  const [chat, setChat] = useState([VOICE_SCRIPT[0]]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [input, setInput] = useState('');
  const bodyRef = useRef(null);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [chat]);

  // play the scripted recovery conversation live, one line at a time
  const scriptedRef = useRef(true);
  useEffect(() => {
    let i = 1;
    const id = setInterval(() => {
      if (!scriptedRef.current || i >= VOICE_SCRIPT.length) { clearInterval(id); return; }
      setChat((c) => [...c, VOICE_SCRIPT[i++]]);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const audioRef = useRef(null);
  const browserSpeak = (text) => {
    try {
      const u = new SpeechSynthesisUtterance(forSpeech(text));
      u.lang = 'hi-IN'; u.rate = 0.98;
      const hi = window.speechSynthesis.getVoices().find((v) => (v.lang || '').toLowerCase().startsWith('hi'));
      if (hi) u.voice = hi;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };
  // natural Hindi via ElevenLabs (Devanagari); falls back to the browser voice
  const speak = async (display, hindi) => {
    const toSpeak = (hindi || display || '').trim();
    if (!toSpeak) return;
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      window.speechSynthesis && window.speechSynthesis.cancel();
      setSpeaking(true);
      const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: toSpeak }) });
      if (!r.ok) throw new Error('tts');
      const url = URL.createObjectURL(await r.blob());
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => setSpeaking(false);
      await a.play();
    } catch {
      setSpeaking(false);
      browserSpeak(display); // fallback if ElevenLabs unavailable
    }
  };

  const ruleReply = (t) => {
    const R = (display, hindi) => ({ display, hindi });
    if (/namaste|hello|^\s*hi\b|^\s*hey|good morning|good evening|kaise ho|kaise hain/.test(t))
      return R('Namaste! Main Sentinel se bol raha hoon. Aapka ₹12,499 ka payment pending hai — kya main link bhej doon?', 'नमस्ते! मैं सेंटिनल से बोल रहा हूँ। आपका बारह हज़ार चार सौ निन्यानवे रुपये का पेमेंट पेंडिंग है — क्या मैं लिंक भेज दूँ?');
    if (/aaj|date|tareekh|tarikh|kaun sa din|kaunsa din|kitni tarikh|28/.test(t))
      return R('Ji, aaj 28 August 2026 hai. Waise aapka ₹12,499 ka payment abhi pending hai — kya main link bhej doon?', 'जी, आज अट्ठाईस अगस्त दो हज़ार छब्बीस है। वैसे आपका बारह हज़ार चार सौ निन्यानवे रुपये का पेमेंट अभी पेंडिंग है — क्या मैं लिंक भेज दूँ?');
    if (/kaun ho|kaun hai|who are you|tum kaun|aap kaun|naam kya|tumhara naam/.test(t))
      return R('Main Sentinel ka payment recovery assistant hoon. Aapke pending ₹12,499 ke payment mein madad ke liye baat kar raha hoon.', 'मैं सेंटिनल का पेमेंट रिकवरी असिस्टेंट हूँ। आपके पेंडिंग बारह हज़ार चार सौ निन्यानवे रुपये के पेमेंट में मदद के लिए बात कर रहा हूँ।');
    if (/thank|dhanyavaad|shukriya|thanks/.test(t))
      return R('Aapka dhanyavaad! Kisi bhi madad ke liye main yahin hoon.', 'आपका धन्यवाद! किसी भी मदद के लिए मैं यहीं हूँ।');
    if (/haan|yes|bhej|link|ok|okay|theek|kar do|kardo|\bha\b|bhejo|send/.test(t))
      return R('Bilkul! Maine aapko secure payment link bhej diya hai. Ek tap mein complete kar lijiye. Dhanyavaad!', 'बिल्कुल! मैंने आपको सिक्योर पेमेंट लिंक भेज दिया है। एक टैप में कम्प्लीट कर लीजिए। धन्यवाद!');
    if (/nahi|no|abhi nahi|baad|later|mat|busy/.test(t))
      return R('Koi baat nahi. Main aapko thodi der baad reminder bhej dunga. Aapka din shubh rahe!', 'कोई बात नहीं। मैं आपको थोड़ी देर बाद रिमाइंडर भेज दूँगा। आपका दिन शुभ रहे!');
    if (/kitna|kitne|amount|paisa|kitni|balance|pending/.test(t))
      return R('Aapka ₹12,499 ka payment pending hai. Kya main secure link bhej doon?', 'आपका बारह हज़ार चार सौ निन्यानवे रुपये का पेमेंट पेंडिंग है। क्या मैं सिक्योर लिंक भेज दूँ?');
    return R('Aapka ₹12,499 ka payment pending hai. Kya aap ise abhi complete karna chahenge? Main link bhej sakta hoon.', 'आपका बारह हज़ार चार सौ निन्यानवे रुपये का पेमेंट पेंडिंग है। क्या आप इसे अभी कम्प्लीट करना चाहेंगे? मैं लिंक भेज सकता हूँ।');
  };
  const reply = async (userText) => {
    scriptedRef.current = false; // user took over — stop the scripted demo
    // instant smart fallback, then upgrade with live AI if the quota allows
    const fb = ruleReply(userText.toLowerCase());
    let r = fb.display, hindi = fb.hindi;
    try {
      const res = await fetch('/api/voice/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText, history: chat.slice(-6) }),
      });
      const data = await res.json();
      if (data && data.reply) { r = data.reply; hindi = data.hindi || fb.hindi; }
    } catch {}
    setChat((c) => [...c, { who: 'agent', text: r }]);
    speak(r, hindi);
  };

  const listen = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setChat((c) => [...c, { who: 'sys', text: 'Voice input needs Chrome/Edge. Tap “Listen” to hear the agent instead.' }]);
      return;
    }
    window.speechSynthesis && window.speechSynthesis.cancel(); // stop the agent talking so the mic can hear you

    // capture the actual audio so the spoken message becomes a playable voice note
    let mediaRec = null, stream = null;
    const chunks = [];
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRec = new MediaRecorder(stream);
      mediaRec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      mediaRec.start();
    } catch {}

    const cleanup = () => { try { stream && stream.getTracks().forEach((t) => t.stop()); } catch {} };
    const pushMsg = (text) => {
      if (mediaRec && mediaRec.state !== 'inactive') {
        mediaRec.onstop = () => {
          const url = URL.createObjectURL(new Blob(chunks, { type: mediaRec.mimeType || 'audio/webm' }));
          cleanup();
          setChat((c) => [...c, { who: 'cust', text, audio: url }]);
          reply(text);
        };
        mediaRec.stop();
      } else {
        cleanup();
        setChat((c) => [...c, { who: 'cust', text }]);
        reply(text);
      }
    };

    const rec = new SR();
    rec.lang = 'en-IN'; rec.interimResults = false; rec.maxAlternatives = 1;
    let got = false;
    setListening(true);
    rec.onresult = (e) => { got = true; const text = (e.results[0][0].transcript || '').trim(); if (text) pushMsg(text); };
    rec.onerror = (e) => {
      setListening(false);
      try { mediaRec && mediaRec.state !== 'inactive' && mediaRec.stop(); } catch {}
      cleanup();
      const msg = e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Mic blocked — allow microphone access for this site and try again.'
        : e.error === 'no-speech' ? 'Didn’t catch that — tap and speak again.'
        : `Mic error (${e.error || 'unknown'}). Try Chrome + allow mic.`;
      setChat((c) => [...c, { who: 'sys', text: msg }]);
    };
    rec.onend = () => { setListening(false); if (!got) { try { mediaRec && mediaRec.state !== 'inactive' && mediaRec.stop(); } catch {} cleanup(); } };
    try { rec.start(); } catch { setListening(false); cleanup(); }
  };

  const listenSample = () => {
    const line = 'Namaste! Aapka ₹12,499 ka payment fail ho gaya hai. Kya main aapko secure link bhej doon?';
    const hindi = 'नमस्ते! आपका बारह हज़ार चार सौ निन्यानवे रुपये का पेमेंट फ़ेल हो गया है। क्या मैं आपको सिक्योर लिंक भेज दूँ?';
    setChat((c) => [...c, { who: 'agent', text: line }]);
    speak(line, hindi);
  };

  return (
    <div className="w-full lg:w-[540px] rounded-[24px] bg-white border border-hairline shadow-[0_36px_80px_-28px_rgba(16,24,40,0.5)] overflow-hidden">
      {/* orb + try it live */}
      <div className="relative text-center pt-10 pb-6 overflow-hidden" style={{ background: 'linear-gradient(180deg,#EFF4FF, #ffffff)' }}>
        <div className="mx-auto w-[148px] h-[148px]" style={{ perspective: '600px' }}>
          <div className="w-full h-full rounded-full overflow-hidden shadow-[0_18px_40px_-16px_rgba(59,90,246,0.5)]" style={{ animation: `orb-float 5s ease-in-out infinite${speaking ? '' : ''}`, transformStyle: 'preserve-3d' }}>
            <img src="/orb.png" alt="Voice orb" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="mt-5 text-[17px] font-bold tracking-tight2 text-ink">Try it live</div>
        <div className="text-[13px] text-muted">Tap the mic and speak in Hinglish</div>
      </div>

      {/* chat */}
      <div ref={bodyRef} className="px-5 py-4 space-y-2.5 h-[400px] overflow-y-auto border-t border-hairline">
        {chat.map((m, i) => (
          m.who === 'sys'
            ? <div key={i} className="text-center text-[11px] text-faint">{m.text}</div>
            : m.audio
              ? <VoiceNote key={i} audio={m.audio} />
              : m.recovered
                ? <Bubble key={i} who="agent">{m.text} <span className="font-bold text-good">₹4,999 recovered ✓</span></Bubble>
                : <Bubble key={i} who={m.who}>{m.text}</Bubble>
        ))}
        {speaking && <div className="flex items-center gap-1.5 text-[11px] text-accent"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> speaking…</div>}
      </div>

      {/* type-or-speak bar */}
      <div className="px-5 pt-3 border-t border-hairline">
        <form
          onSubmit={(e) => { e.preventDefault(); const v = input.trim(); if (!v) return; setInput(''); setChat((c) => [...c, { who: 'cust', text: v }]); reply(v); }}
          className="flex items-center gap-2 h-11 px-3 rounded-[12px] border border-hairline bg-surface"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything…"
            className="flex-1 bg-transparent outline-none text-[13.5px] text-ink placeholder:text-faint min-w-0"
          />
          <button type="button" onClick={listen} title="Speak" className={`w-8 h-8 rounded-full grid place-items-center shrink-0 transition ${listening ? 'bg-stop text-white animate-pulse' : 'bg-accent-soft text-accent hover:bg-accent hover:text-white'}`}>
            <IconMic size={15} />
          </button>
          <button type="submit" title="Send" className="w-8 h-8 rounded-full bg-ink text-white grid place-items-center shrink-0 hover:bg-black">
            <IconArrowRight size={15} />
          </button>
        </form>
      </div>

      {/* listen sample */}
      <div className="px-5 py-3.5 flex items-center justify-between">
        <span className="text-[12px] text-muted">{listening ? 'Listening… speak now' : 'Type, or tap the mic to speak'}</span>
        <button onClick={listenSample} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] border border-hairline text-[12.5px] font-medium text-ink hover:bg-surface">
          <IconPlay size={13} /> Listen to agent
        </button>
      </div>
    </div>
  );
}

function SeesAndDoes() {
  return (
    <section className="bg-[#F7F7F8] border-t border-black/[0.05]">
      <div className="max-w-[1360px] mx-auto px-6 py-20 lg:py-24 flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
        {/* invoice pic on the LEFT, shifted a little down — in a liquid-glass frame */}
        <div className="hidden lg:flex flex-col items-start shrink-0 lg:mt-24 w-[400px]">
          {/* apple-glass label above the invoice */}
          <span className="mb-4 inline-flex items-center h-11 px-6 rounded-full text-[15px] font-semibold tracking-[0.08em] uppercase text-ink/75 border border-white/70 bg-gradient-to-b from-white/75 to-[#D9DBDF]/55 backdrop-blur-md shadow-[0_2px_6px_rgba(16,24,40,0.08),inset_0_1px_0_rgba(255,255,255,0.75)]">
            Invoice Overdue
          </span>
          <img
            src="/invoice.jpg"
            alt="Overdue invoice INV-9281"
            className="w-full rounded-[20px] shadow-[0_22px_50px_-16px_rgba(16,24,40,0.4)]"
          />
          {/* action-executed grey apple-glass note between the two images */}
          <div className="w-full my-5 rounded-2xl px-5 py-3.5 text-center border border-white/70 bg-gradient-to-b from-white/75 to-[#D9DBDF]/55 backdrop-blur-md shadow-[0_2px_8px_rgba(16,24,40,0.08),inset_0_1px_0_rgba(255,255,255,0.72)]">
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink/45 font-semibold">Action executed</div>
            <div className="text-[13.5px] font-medium text-ink/80 mt-1">
              <span className="text-green-600 font-semibold">✓</span> Payment link sent via WhatsApp
            </div>
          </div>
          {/* WhatsApp recovery message, just below */}
          <img
            src="/whatsapp.jpg"
            alt="Sentinel WhatsApp payment reminder"
            className="w-full rounded-[20px] shadow-[0_22px_50px_-16px_rgba(16,24,40,0.4)]"
          />
        </div>

        {/* the two cards, shifted right */}
        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — what Sentinel sees */}
        <div className="bg-white border border-[#E6E6EA] rounded-[28px] p-8 lg:p-10 shadow-[0_2px_14px_-8px_rgba(16,24,40,0.08)]">
          <Eyebrow>What Sentinel sees</Eyebrow>
          <h2 className="font-display-serif text-[34px] lg:text-[42px] leading-[1.04] font-medium text-ink mt-4">
            The signals before revenue disappears.
          </h2>
          <p className="mt-4 text-[15px] text-muted leading-relaxed max-w-[440px]">
            A failed payment. A customer who leaves checkout. An invoice that goes silent. Sentinel
            catches every recovery opportunity before it becomes lost revenue.
          </p>
          <div className="mt-7 space-y-3">
            {SIGNALS.map((s) => (
              <div key={s.title} className="flex items-center gap-4 rounded-2xl bg-[#FBEEEE] border border-[#F2DBDB] px-4 py-3.5">
                <span className="w-10 h-10 rounded-full bg-white grid place-items-center text-[#C0392B] shrink-0">
                  <RiskIcon kind={s.icon} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold tracking-[0.06em] text-ink">{s.title}</div>
                  <div className="text-[13px] text-muted truncate">{s.sub}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[15px] font-semibold text-stop tabular-nums">− ₹{s.amt}</div>
                  <div className="text-2xs text-faint">{s.time}</div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/app/queue" className="btn mt-7">
            View all revenue at risk <IconArrowRight size={15} />
          </Link>
        </div>

        {/* RIGHT — what Sentinel does */}
        <div className="bg-white border border-[#E6E6EA] rounded-[28px] p-8 lg:p-10 shadow-[0_2px_14px_-8px_rgba(16,24,40,0.08)]">
          <Eyebrow>What Sentinel does</Eyebrow>
          <h2 className="font-display-serif text-[34px] lg:text-[42px] leading-[1.04] font-medium text-ink mt-4">
            The right move.
            <br />
            At the right time.
          </h2>
          <p className="mt-4 text-[15px] text-muted leading-relaxed max-w-[460px]">
            Sentinel understands what went wrong, chooses the right intervention, and executes a
            controlled recovery path from risk to payment.
          </p>

          {/* dark case card */}
          <div className="mt-7 rounded-2xl bg-black p-6 lg:p-7">
            <div className="flex items-center gap-3 pb-1">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/50" />
              <span className="font-mono text-[13px] font-semibold text-white tracking-wide">CASE #8391</span>
            </div>
            <ol className="relative mt-1">
              <span className="absolute left-[6px] top-3 bottom-4 w-px bg-white/12" />
              {CASE_STEPS.map((st) => (
                <li key={st.label} className="relative pl-6 pt-3.5">
                  <span className="absolute left-0 top-[18px] w-3.5 h-3.5 rounded-full border-2 border-white/40 bg-black" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px] text-white/45">{st.label}</div>
                      <div className={`font-mono text-[13px] leading-snug mt-0.5 ${st.color}`}>{st.value}</div>
                    </div>
                    {st.badge && (
                      <span className="shrink-0 mt-4 inline-flex items-center h-6 px-2.5 rounded-md bg-green-500/15 border border-green-500/30 text-green-300 font-mono text-[12px] font-semibold whitespace-nowrap">
                        {st.badge}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* action pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <span
                key={a.t}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[11px] font-semibold tracking-[0.05em] text-ink/70 border border-white/70 bg-gradient-to-b from-white/75 to-[#D9DBDF]/55 backdrop-blur-md shadow-[0_1px_2px_rgba(16,24,40,0.06),inset_0_1px_0_rgba(255,255,255,0.75)]"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${a.c}`} />
                {a.t}
              </span>
            ))}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

function Eyebrow({ children }) {
  return (
    <div className="text-[11px] font-semibold tracking-[0.16em] uppercase text-faint flex items-center gap-2">
      <span className="w-4 h-px bg-faint/60" />
      {children}
    </div>
  );
}

function RiskIcon({ kind }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (kind === 'card')
    return (<svg {...p}><rect x="2" y="5" width="20" height="14" rx="2.5" /><line x1="2" y1="10" x2="22" y2="10" /></svg>);
  if (kind === 'cart')
    return (<svg {...p}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2l2.5 12.5a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8L20 7H6" /></svg>);
  if (kind === 'mandate')
    return (<svg {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>);
  return (<svg {...p}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><line x1="9" y1="13" x2="16" y2="13" /><line x1="9" y1="17" x2="14" y2="17" /></svg>);
}

/* ------------------------------------------------------------------ Night shift (statement) */
function NightShift() {
  return (
    <section className="bg-white border-t border-black/[0.05]">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-24 lg:py-28">
        <span className="chip bg-accent-soft text-accent-ink border-accent/20">Always on</span>
        <h2 className="mt-6 text-[34px] sm:text-[46px] lg:text-[52px] leading-[1.1] font-semibold tracking-tight2 max-w-[1280px]">
          <span className="text-ink">
            At 2 AM, Sentinel catches the payment that failed while your team was asleep.
          </span>{' '}
          <span className="text-faint">
            It finds the right intervention, follows the recovery through, and stops the moment the
            money comes back.
          </span>
        </h2>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ FAQ */
const FAQS = [
  {
    q: 'What happens when a payment fails at 2:13 AM?',
    a: 'Sentinel catches it the moment it fails — no waiting for business hours. It diagnoses why (bad card, insufficient funds, gateway timeout, expired mandate), picks the one right recovery action, and starts a bounded recovery loop while your team sleeps.',
  },
  {
    q: 'Where does lost revenue go?',
    a: 'It leaks away quietly as involuntary churn — failed renewals, expired mandates, abandoned carts, silent overdue invoices. Most of it is recoverable; it just never gets chased because no one is watching at the moment it slips. Sentinel surfaces every rupee at risk and wins back what it can.',
  },
  {
    q: 'How do you recover a payment that never completed?',
    a: 'Sentinel matches the failure to the right move: a smart retry after a cooldown for transient errors, a card-update link for expired cards, a re-presented mandate for subscriptions, or a one-tap recovery link for abandoned checkouts — then it follows the attempt through to payment.',
  },
  {
    q: 'What happens after a customer abandons checkout?',
    a: 'Sentinel sends a recovery payment link so the customer can finish in one tap, while respecting message limits so it never spams. If they return and pay, it stops immediately; if not, it escalates within bounds and then stops.',
  },
  {
    q: 'When should recovery stop?',
    a: 'The moment the money comes back — or when the stopping rules say so: a cap on retries per payment, never retrying a hard decline, cooldown windows between attempts, and a limit on messages per customer. Sentinel knows when to stop, not just when to try, and logs every decision.',
  },
];

function FAQ() {
  const [open, setOpen] = useState(null);
  return (
    <section id="docs" className="bg-[#F7F7F8] border-t border-black/[0.05] scroll-mt-20">
      <div className="max-w-[860px] mx-auto px-6 py-24 lg:py-28">
        <Eyebrow>Frequently asked</Eyebrow>
        <h2 className="mt-5 text-[32px] sm:text-[44px] leading-[1.05] font-semibold tracking-tight2 text-ink">
          Questions, answered.
        </h2>

        <div className="mt-10 border-t border-hairline">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="border-b border-hairline">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-6 py-5 text-left group"
                >
                  <span className={`text-[16px] sm:text-[18px] font-medium transition-colors ${isOpen ? 'text-ink' : 'text-ink/80 group-hover:text-ink'}`}>
                    {f.q}
                  </span>
                  <span className={`shrink-0 w-8 h-8 rounded-full border border-hairline grid place-items-center bg-white transition-all ${isOpen ? 'rotate-180 border-accent/30 text-accent' : 'text-muted'}`}>
                    <IconChevron size={16} />
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-6 pr-10 text-[15px] text-muted leading-relaxed">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Footer */
function Footer() {
  return (
    <footer className="border-t border-black/[0.06] bg-white">
      <div className="max-w-[1180px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo size={20} />
          <span className="text-[13px] text-ink/45">Synthetic batch · Razorpay test mode</span>
        </div>
        <div className="flex items-center gap-5 text-[13px] text-ink/50">
          <span>Track 03 · AI Revenue Recovery</span>
          <Link to="/app/overview" className="font-medium text-accent hover:underline">
            Open console →
          </Link>
        </div>
      </div>
      {/* giant faded wordmark — clipped at the bottom edge of the page */}
      <div className="relative overflow-hidden select-none pointer-events-none" aria-hidden="true">
        <div
          className="font-logo font-bold uppercase text-center whitespace-nowrap leading-[0.82] text-black/[0.07]"
          style={{ fontSize: '15.5vw', letterSpacing: '0.02em', marginBottom: '-0.08em' }}
        >
          Sentinel
        </div>
      </div>
    </footer>
  );
}
