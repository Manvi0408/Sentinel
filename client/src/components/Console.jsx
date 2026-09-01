import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { api } from '../api.js';
import { ModePill } from './ui.jsx';
import Logo from './Logo.jsx';
import SentinelLogo from './SentinelLogo.jsx';
import SandboxDrawer from './SandboxDrawer.jsx';
import GatewayModal from './GatewayModal.jsx';
import { RazorpayIcon, WhatsAppIcon } from './BrandIcons.jsx';
import {
  IconGrid, IconSettings, IconPlay, IconRefresh, IconArrowRight, IconSearch, IconShield,
  IconChevron, IconWarn, IconRobot, IconFlow, IconCheckCircle, IconMic, IconReceipt,
  IconChart, IconPlug, IconBolt, IconInbox, IconActivity, IconClose,
} from './Icons.jsx';

// Shared console state: data-refresh signal, run/seed actions, toast, mode flags.
const ConsoleCtx = createContext(null);
export const useConsole = () => useContext(ConsoleCtx);

// Grouped sidebar nav — mirrors the requested 8-section structure.
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/app/overview', label: 'Overview', icon: IconGrid },
      { to: '/app/risk', label: 'Revenue at Risk', icon: IconWarn },
      { to: '/app/simulate', label: 'Webhook Simulator', icon: IconPlug, star: true },
      { to: '/app/agent', label: 'AI Recovery Agent', icon: IconRobot, star: true },
      { to: '/app/trace', label: 'Agent Trace', icon: IconFlow, star: true },
      { to: '/app/recoveries', label: 'Recoveries', icon: IconCheckCircle, star: true },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/app/degradation', label: 'Degradation Detector', icon: IconActivity, star: true },
      { to: '/app/simulator', label: 'What-If Simulator', icon: IconChart, star: true },
    ],
  },
  {
    label: 'Automation',
    items: [
      { to: '/app/workflows', label: 'Workflows', icon: IconFlow, star: true },
      { to: '/app/voice', label: 'Hinglish Voice Agent', icon: IconMic, star: true },
      { to: '/app/promises', label: 'Promise-to-Pay', icon: IconReceipt, star: true },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/app/receivables', label: 'Receivables', icon: IconReceipt },
      { to: '/app/audit', label: 'Audit & Analytics', icon: IconChart },
    ],
  },
];
// Integrations shown as their own list (all open the Integrations page).
const INTEGRATIONS_NAV = [
  { label: 'Razorpay', icon: RazorpayIcon },
  { label: 'WhatsApp', icon: WhatsAppIcon },
  { label: 'Voice', icon: IconMic },
  { label: 'Email', icon: IconInbox },
  { label: 'Webhooks', icon: IconPlug },
];
const BOTTOM_NAV = [{ to: '/app/settings', label: 'Settings', icon: IconSettings }];

// Slide-in terminal that streams the agent's live thoughts during a batch run.
const TRACE_COLOR = { boot: '#8B93A7', scan: '#8B93A7', diag: '#8AB4F8', rule: '#F0B34E', exec: '#8AB4F8', done: '#4ADE80', fail: '#F87171' };
const TRACE_TAG = { boot: 'boot', scan: 'scan', diag: 'diagnose', rule: 'guard', exec: 'execute', done: 'done', fail: 'error' };
function TraceDrawer({ lines, running, onClose }) {
  const bodyRef = useRef(null);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [lines]);
  return (
    <div className="fixed inset-y-0 right-0 z-[55] w-full max-w-[400px] p-4" style={{ animation: 'trace-in .32s cubic-bezier(.22,1,.36,1) both' }}>
      <div className="h-full rounded-[18px] overflow-hidden flex flex-col border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]" style={{ background: '#0B0D12' }}>
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-white/10">
          <span className="relative flex w-2 h-2"><span className={`absolute inline-flex w-full h-full rounded-full ${running ? 'animate-ping' : ''}`} style={{ background: running ? '#4ADE80' : '#6B7280', opacity: 0.6 }} /><span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: running ? '#4ADE80' : '#6B7280' }} /></span>
          <span className="text-[13px] font-semibold text-white">Recovery agent · {running ? 'running' : 'complete'}</span>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full grid place-items-center text-white/50 hover:bg-white/10"><IconClose size={14} /></button>
        </div>
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {lines.map((l, i) => {
            const last = i === lines.length - 1;
            return (
              <div key={i} className="text-[12px] leading-relaxed flex items-start gap-2" style={{ animation: 'trace-line .25s ease both' }}>
                <span className="shrink-0 mt-[1px] text-[10px] uppercase tracking-wide px-1.5 rounded" style={{ color: TRACE_COLOR[l.t], background: 'rgba(255,255,255,0.06)' }}>{TRACE_TAG[l.t]}</span>
                <span style={{ color: l.t === 'done' ? '#86EFAC' : l.t === 'fail' ? '#FCA5A5' : 'rgba(255,255,255,0.82)' }}>
                  {l.s}
                  {last && running && <span className="inline-block w-[6px] h-[12px] align-[-1px] ml-1 animate-pulse" style={{ background: '#4ADE80' }} />}
                </span>
              </div>
            );
          })}
          {running && (
            <div className="text-[12px] text-white/40 flex items-center gap-1.5 pt-1">
              <span className="inline-flex gap-0.5"><span className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '120ms' }} /><span className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '240ms' }} /></span>
              processing…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Console() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(null); // 'run' | 'seed' | null
  const [toast, setToast] = useState(null);
  const [trace, setTrace] = useState(null); // live agent-trace drawer lines, or null
  const [mode, setMode] = useState({ razorpay: 'simulated', gemini: 'rules-fallback' });
  const [q, setQ] = useState('');
  const [connOpen, setConnOpen] = useState(false);
  const connRef = useRef(null);
  const [testOpen, setTestOpen] = useState(false);
  // Testing-Layer sandbox: open state + global analytics the sandbox feeds into.
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [sandboxStats, setSandboxStats] = useState({ recovered: 0, wins: 0 });
  const addSandboxWin = useCallback((amountRs) => {
    setSandboxStats((s) => ({ recovered: s.recovered + amountRs, wins: s.wins + 1 }));
  }, []);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('sentinel-dark') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('sentinel-dark', dark ? '1' : '0'); } catch { /* ignore */ }
  }, [dark]);
  const ql = q.trim().toLowerCase();
  const match = (label) => !ql || label.toLowerCase().includes(ql);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const flash = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    api.health().then((h) => setMode(h.mode)).catch(() => {});
  }, []);

  const runBatch = async () => {
    if (busy) return;
    setBusy('run');
    // live agent thoughts streamed into the drawer while the real batch runs
    const script = [
      { t: 'boot', s: 'agent · loading policy engine + stopping rules' },
      { t: 'scan', s: 'diagnosing batch in parallel (chunks of 8)…' },
      { t: 'diag', s: 'pay · Transient (82%) → tier: auto_retry → smart_retry' },
      { t: 'diag', s: 'pay · Insufficient funds → tier: whatsapp → delayed_retry + reminder' },
      { t: 'diag', s: 'pay · Bad card → update-card link (no blind retries)' },
      { t: 'rule', s: 'enforcing caps · fraud-block guard · drop-if-recovered' },
      { t: 'exec', s: 'executing interventions · logging every step…' },
    ];
    setTrace([]);
    let i = 0;
    const timer = setInterval(() => { if (i < script.length) { const line = script[i++]; setTrace((t) => [...(t || []), line]); } }, 650);
    try {
      const r = await api.run();
      clearInterval(timer);
      setTrace((t) => {
        const rest = script.slice((t || []).length);
        return [...(t || []), ...rest, { t: 'done', s: `RECOVERED ${r.metrics.sentinel.recoveryRatePct}% · ₹${r.metrics.sentinel.moneyRecovered.toLocaleString('en-IN')} across ${r.metrics.batch.total} payments` }];
      });
      flash(`Recovery run complete · ${r.metrics.sentinel.recoveryRatePct}% recovered · ₹${r.metrics.sentinel.moneyRecovered.toLocaleString('en-IN')}`);
      refresh();
      setTimeout(() => setTrace(null), 4200);
    } catch (e) {
      clearInterval(timer);
      setTrace((t) => [...(t || []), { t: 'fail', s: 'run failed · ' + e.message }]);
      flash('Run failed: ' + e.message);
      setTimeout(() => setTrace(null), 4200);
    } finally {
      setBusy(null);
    }
  };

  const reseed = async () => {
    setBusy('seed');
    try {
      const r = await api.seed(60);
      flash(`Re-seeded ${r.count} synthetic at-risk payments`);
      refresh();
    } catch (e) {
      flash('Re-seed failed: ' + e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <ConsoleCtx.Provider value={{ refreshKey, refresh, flash, mode, runBatch, reseed, busy, sandboxStats, addSandboxWin, openSandbox: () => setIsSandboxOpen(true) }}>
      <div className={`min-h-screen flex bg-canvas text-ink ${dark ? 'dark' : ''}`}>
        {/* Sidebar */}
        <aside className="w-[236px] shrink-0 border-r border-hairline flex flex-col fixed inset-y-0 left-0 bg-canvas">
          {/* Sentinel brand (above search) */}
          <Link to="/" className="flex items-center gap-2.5 pl-2.5 pr-4 h-[60px] border-b border-hairline">
            <SentinelLogo size={36} radius={11} />
            <div className="leading-tight">
              <div className="text-[15px] font-bold tracking-tight text-ink">Sentinel</div>
              <div className="text-[8.5px] uppercase tracking-[0.18em] text-faint mt-0.5">AI Revenue Recovery</div>
            </div>
          </Link>

          {/* search */}
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2 h-9 px-2.5 rounded-[10px] border border-hairline bg-surface">
              <IconSearch size={15} className="text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-[13px] outline-none text-ink placeholder:text-faint min-w-0"
              />
              {q ? (
                <button onClick={() => setQ('')} className="text-2xs text-faint hover:text-ink">✕</button>
              ) : (
                <kbd className="text-2xs text-faint border border-hairline rounded px-1 bg-canvas">/</kbd>
              )}
            </div>
          </div>

          <nav className="px-3 pt-3 flex-1 overflow-y-auto">
            {/* Testing Layer — pinned at the very top of the sidebar */}
            {(match('Testing Layer') || match('Sandbox Checkout Simulator') || match('Gateway Route Config')) && (
              <div className="mb-4">
                <button
                  onClick={() => setTestOpen((o) => !o)}
                  className={`flex items-center gap-2.5 w-full h-10 px-2.5 rounded-[12px] text-[14px] font-medium text-ink transition-colors ${testOpen || ql ? 'bg-canvas border border-hairline shadow-[0_1px_2px_rgba(16,24,40,0.05)]' : 'hover:bg-surface'}`}
                >
                  <TerminalIcon size={17} />
                  <span className="flex-1 text-left truncate">Testing Layer</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-hairline bg-surface text-muted tabular-nums leading-none">2</span>
                  <IconChevron size={15} className={`text-faint transition-transform ${testOpen || ql ? 'rotate-180' : ''}`} />
                </button>
                {(testOpen || ql) && (
                  <div className="relative mt-1 ml-[19px] pl-3.5">
                    <span className="absolute left-0 top-1.5 bottom-3 w-px bg-hairline" />
                    <div className="space-y-0.5">
                      <SubItem onClick={() => { setIsGatewayOpen(false); setIsSandboxOpen(true); }} label="Sandbox Checkout Simulator" />
                      <SubItem onClick={() => { setIsSandboxOpen(false); setIsGatewayOpen(true); }} label="Gateway Route Config" chevron />
                    </div>
                  </div>
                )}
              </div>
            )}
            {NAV_GROUPS.map((group, gi) => {
              const items = group.items.filter((it) => match(it.label));
              if (!items.length) return null;
              return (
                <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                  {group.label && (
                    <div className="px-2 pb-1.5 text-2xs font-semibold uppercase tracking-wide text-faint">
                      {group.label}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {items.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => `nav-item justify-start ${isActive ? 'nav-item-active' : ''}`}
                      >
                        <Icon size={16} />
                        <span className="flex-1 truncate">{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Connections — collapsible, reveals the integrations inside */}
            {(match('Connections') || INTEGRATIONS_NAV.some((it) => match(it.label))) && (
              <div className="mt-4" ref={connRef}>
                <button
                  onClick={() =>
                    setConnOpen((o) => {
                      const next = !o;
                      if (next)
                        setTimeout(
                          () => connRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
                          60,
                        );
                      return next;
                    })
                  }
                  className="nav-item justify-start w-full"
                >
                  <IconPlug size={16} />
                  <span className="flex-1 text-left">Connections</span>
                  <IconChevron size={14} className={`text-faint transition-transform ${connOpen || ql ? 'rotate-180' : ''}`} />
                </button>
                {(connOpen || ql) && (
                  <div className="mt-0.5 ml-4 pl-2 border-l border-hairline space-y-0.5">
                    {INTEGRATIONS_NAV.filter((it) => match(it.label)).map(({ label, icon: Icon }) => (
                      <NavLink
                        key={label}
                        to="/app/integrations"
                        className={({ isActive }) => `nav-item justify-start h-8 ${isActive ? 'nav-item-active' : ''}`}
                      >
                        <Icon size={15} />
                        <span className="text-[12.5px]">{label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* bottom: integrations + settings + mode */}
          <div className="p-3 border-t border-hairline space-y-0.5">
            {BOTTOM_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item justify-start ${isActive ? 'nav-item-active' : ''}`}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
            <div className="flex items-center gap-2 px-2 pt-2 text-2xs text-faint">
              <ModePill label={mode.razorpay === 'live-test' ? 'Razorpay live' : 'Simulated'} tone={mode.razorpay === 'live-test' ? 'live' : 'sim'} />
              <ModePill label={mode.ai === 'anthropic' ? 'Claude' : mode.ai === 'gemini' ? 'Gemini' : 'Rules'} tone={mode.ai && mode.ai !== 'rules' ? 'ai' : 'sim'} />
            </div>
            {/* user profile */}
            <button className="mt-2 pt-2 w-full flex items-center gap-2.5 h-11 px-2 rounded-lg border-t border-hairline2 hover:bg-surface transition-colors">
              <span className="w-7 h-7 rounded-lg bg-ink text-canvas grid place-items-center text-2xs font-semibold shrink-0">SC</span>
              <div className="flex-1 text-left leading-tight min-w-0">
                <div className="text-[13px] font-semibold truncate">Acme Store</div>
                <div className="text-2xs text-faint">Team Admin · test mode</div>
              </div>
              <IconChevron size={14} className="text-faint" />
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 ml-[236px] flex flex-col min-w-0">
          {/* Topbar */}
          <header className="h-16 px-6 flex items-center justify-between border-b border-hairline sticky top-0 bg-canvas/90 backdrop-blur z-20">
            <Breadcrumb />
            <div className="flex items-center gap-2">
              <button
                className="btn h-9 w-9 px-0 justify-center"
                onClick={() => setDark((v) => !v)}
                title={dark ? 'Switch to light' : 'Switch to jet black'}
              >
                {dark ? <Sun /> : <Moon />}
              </button>
              <button className="btn" onClick={reseed} disabled={busy}>
                <IconRefresh size={15} className={busy === 'seed' ? 'animate-spin' : ''} />
                Re-seed batch
              </button>
              <button className="btn btn-accent" onClick={runBatch} disabled={busy}>
                <IconPlay size={14} />
                {busy === 'run' ? 'Running…' : 'Run recovery on batch'}
              </button>
            </div>
          </header>

          <main className="flex-1 min-w-0" style={{ background: 'rgb(var(--page))' }}>
            <Outlet />
          </main>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 card shadow-pop px-4 py-2.5 text-[13px] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {toast}
          </div>
        )}

        {/* Live agent-trace drawer */}
        {trace != null && <TraceDrawer lines={trace} running={busy === 'run'} onClose={() => setTrace(null)} />}

        {/* Sandbox Checkout Simulator — centered modal */}
        <SandboxDrawer open={isSandboxOpen} onClose={() => setIsSandboxOpen(false)} />
        {/* Gateway Route & AI Agent Pipeline — centered modal */}
        <GatewayModal open={isGatewayOpen} onClose={() => setIsGatewayOpen(false)} />
      </div>
    </ConsoleCtx.Provider>
  );
}

function Moon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
// Sentinel app-mark — white node glyph on the black app icon.
function SentinelMark({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="32" cy="34" r="9.5" fill="currentColor" />
      <circle cx="37" cy="69" r="9.5" fill="currentColor" />
      <path d="M33 35 C 67 41, 53 63, 69 67" stroke="currentColor" strokeWidth="14.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function TerminalIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" />
    </svg>
  );
}
// One dropdown child — indented text on the connector line, with an optional
// right chevron for items that drill in further (like "Materials" in the ref).
function SubItem({ onClick, label, chevron }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center w-full h-9 pl-3 pr-2 rounded-[10px] text-[13.5px] text-muted hover:text-ink hover:bg-surface transition-colors"
    >
      <span className="absolute left-0 top-1/2 w-2.5 h-px bg-hairline" />
      <span className="flex-1 text-left truncate">{label}</span>
      {chevron && <IconChevron size={14} className="text-faint -rotate-90 shrink-0" />}
    </button>
  );
}
function Sun() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function Breadcrumb() {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted">
      <span className="text-faint">Acme Store</span>
      <IconArrowRight size={13} className="text-hairline" />
      <span className="text-ink font-medium">Revenue recovery</span>
    </div>
  );
}
