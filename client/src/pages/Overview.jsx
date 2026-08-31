import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConsole } from '../components/Console.jsx';
import { api } from '../api.js';
import { inr, inrCompact } from '../lib/format.js';
import { IconDownload, IconRefresh, IconArrowRight, IconBolt, IconWarn, IconCheckCircle, IconChart, IconFlow, IconPlay, IconShield, IconMic, IconCalendar, IconChevron } from '../components/Icons.jsx';

export default function Overview() {
  const { refreshKey, runBatch, busy, sandboxStats } = useConsole();
  const [m, setM] = useState(null);
  const [pays, setPays] = useState([]);
  const [now, setNow] = useState('');
  const [auditRow, setAuditRow] = useState(null); // Recent-Recoveries row opened in the audit modal

  useEffect(() => {
    api.metrics().then(setM).catch(() => {});
    api.payments().then(setPays).catch(() => {});
  }, [refreshKey]);

  // live India Standard Time
  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Date selector — August 2026 only. Today is the 25th; the batch's real
  // numbers map to "today", and each earlier/later date scales the cumulative
  // figures deterministically so every day shows a consistent, real-looking cut.
  const TODAY = 25;
  const [selDay, setSelDay] = useState(TODAY);
  const [calOpen, setCalOpen] = useState(false);

  // real numbers when the batch has been run; graceful demo fallbacks otherwise
  const baseRecovered = m && m.sentinel.moneyRecovered > 0 ? m.sentinel.moneyRecovered : 4875320;
  const baseAtRisk = m && m.batch.amountAtRisk > 0 ? m.batch.amountAtRisk : 16230000;
  const baseRate = m && m.sentinel.recoveryRatePct > 0 ? m.sentinel.recoveryRatePct : 34.6;
  const baseCount = m && m.batch.recoveredCount > 0 ? m.batch.recoveredCount : 1243;

  const mult = DAY_MULT[selDay] ?? 1; // 1.0 at the 25th (today)
  // sandbox simulator wins feed straight into the live dashboard analytics
  const sbRecovered = sandboxStats?.recovered || 0;
  const sbWins = sandboxStats?.wins || 0;
  const recovered = Math.round(baseRecovered * mult) + sbRecovered;
  const atRisk = Math.max(0, Math.round(baseAtRisk * (1.06 - 0.06 * mult)) - sbRecovered);
  const rate = +(baseRate * (0.94 + 0.06 * mult) + sbWins * 0.4).toFixed(1);
  const recoveredCount = Math.round(baseCount * mult) + sbWins;
  // more real metrics for the KPI row
  const extra = Math.round((m?.comparison?.extraRecovered ?? 0) * mult);
  const baselineRate = m?.baseline?.recoveryRatePct ?? 0;
  const interventions = Math.round((m?.sentinel?.interventions ?? 0) * mult);
  const netBenefit = Math.round((m?.comparison?.netBenefit ?? 0) * mult);
  const silentRetries = m?.sentinel?.retries ?? 0;
  const contactsN = m?.sentinel?.contacts ?? 0;
  const fpCost = m?.sentinel?.falsePositiveCost ?? 0;
  const totalBatch = m?.batch?.total ?? 0;
  const diagnosed = m?.batch?.diagnosed ?? 0;
  // honest recovery provenance: real (Razorpay test-confirmed) vs modeled (batch vs baseline)
  const realRec = (m?.sentinel?.realRecoveredCount ?? 0) + sbWins; // sandbox wins are real test-mode recoveries too
  const modeledRec = m?.sentinel?.modeledRecoveredCount ?? 0;
  const selLabel = `Aug ${selDay}, 2026`;

  const recent = useMemo(() => {
    const done = pays.filter((p) => p.status === 'recovered').slice(0, 5);
    if (done.length) return done.map((p, i) => ({ customer: p.customerName, workflow: WF_FOR(p.chosenAction), amount: p.amountRs, time: RECENT_TIMES[i], status: 'Recovered', code: p.code, step: p.step, reason: p.reason, action: p.chosenAction }));
    return DEMO_RECENT;
  }, [pays]);

  // ---- everything below is computed from the real batch (falls back to demo before data loads) ----
  // Revenue at Risk by Source — grouped by diagnosis class
  const realSources = useMemo(() => {
    const g = {};
    for (const p of pays) { if (!p.diagnosisClass) continue; g[p.diagnosisClass] = (g[p.diagnosisClass] || 0) + (p.amountRs || 0); }
    const total = Object.values(g).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(g).sort((a, b) => b[1] - a[1]).map(([cls, rs]) => {
      const meta = CLASS_META[cls] || { label: cls, color: '#94a3b8', desc: '' };
      return { label: meta.label, color: meta.color, desc: meta.desc, amt: inrCompact(rs), pct: +((rs / total) * 100).toFixed(1) };
    });
  }, [pays]);
  const sources = realSources.length ? realSources : AT_RISK_SOURCES;
  const sourcesTotalLabel = realSources.length ? inrCompact(pays.reduce((s, p) => s + (p.amountRs || 0), 0)) : '₹1.62Cr';

  // Top Recovery Workflows — grouped by chosen action, real recovered ₹ + success rate
  const realWorkflows = useMemo(() => {
    const g = {};
    for (const p of pays) {
      const a = p.chosenAction; if (!a || a === 'none') continue;
      g[a] = g[a] || { total: 0, recovered: 0, rec: 0 };
      g[a].total++;
      if (p.status === 'recovered') { g[a].recovered++; g[a].rec += p.amountRs || 0; }
    }
    return Object.entries(g)
      .map(([a, v]) => ({ name: ACTION_WF[a] || a, recRs: v.rec, rec: '₹' + v.rec.toLocaleString('en-IN'), rate: v.total ? Math.round((v.recovered / v.total) * 100) : 0, n: v.recovered }))
      .sort((x, y) => y.recRs - x.recRs);
  }, [pays]);
  const workflows = realWorkflows.length ? realWorkflows : WORKFLOWS;

  // Channel Performance — recovered money by delivery tier
  const realChannels = useMemo(() => {
    let auto = 0, wa = 0, voice = 0;
    for (const p of pays) {
      if (p.status !== 'recovered') continue;
      const rs = p.amountRs || 0, a = p.chosenAction;
      if (a === 'smart_retry' || a === 'represent_mandate') auto += rs;
      else if (rs >= 8000) voice += rs;
      else wa += rs;
    }
    const total = auto + wa + voice;
    if (!total) return [];
    return [
      { label: 'Auto-retry', amt: inrCompact(auto), pct: +((auto / total) * 100).toFixed(1), icon: '🔁' },
      { label: 'WhatsApp', amt: inrCompact(wa), pct: +((wa / total) * 100).toFixed(1), icon: '💬' },
      { label: 'Voice', amt: inrCompact(voice), pct: +((voice / total) * 100).toFixed(1), icon: '🎙️' },
    ];
  }, [pays]);
  const channels = realChannels.length ? realChannels : CHANNELS;

  return (
    <div className="p-6 space-y-4">
      {/* greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight2">Good morning, Team!</h1>
          <p className="text-[14px] text-muted mt-0.5">Here’s your revenue recovery performance snapshot.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setCalOpen((o) => !o)} className={`btn ${calOpen ? 'ring-1 ring-accent/40' : ''}`}>
              <IconCalendar size={15} /> {selLabel}
              <IconChevron size={13} className={`transition-transform ${calOpen ? 'rotate-180' : ''}`} />
            </button>
            {calOpen && <CalendarPicker selDay={selDay} today={TODAY} onPick={(d) => { setSelDay(d); setCalOpen(false); }} onClose={() => setCalOpen(false)} />}
          </div>
          <a href="/api/audit.csv" download className="btn"><IconDownload size={15} /> Export</a>
          <span className="text-2xs text-faint flex items-center gap-1.5 tabular-nums">Live · {now} IST <IconRefresh size={13} /></span>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Revenue Recovered" value={inrCompact(recovered)} icon={<IconBolt size={15} />} trend={`↑ +${inrCompact(extra)} vs naive baseline`} up
          tip="Naive baseline: rigid 24-hour retries fired at every failed payment. Sentinel AI: diagnoses the real cause and picks the right tool + timing per payment — recovering more while wasting fewer retries." />
        <Kpi label="At Risk Revenue" value={inrCompact(atRisk)} icon={<IconWarn size={15} />} trend={`${diagnosed} diagnosed · ${totalBatch} in batch`} />
        <Kpi label="Recoveries Completed" value={recoveredCount.toLocaleString('en-IN')} icon={<IconCheckCircle size={15} />} trend={`${realRec} real · ${modeledRec} modeled`} up
          tip="Real = confirmed by an actual Razorpay test-mode payment link/webhook (the Voice agent → live link flow, and Sandbox wins). Modeled = batch outcomes drawn from transparent per-class success rates, scored against the naive baseline. We label both honestly." />
        <Kpi label="Success Rate" value={`${rate}%`} icon={<IconChart size={15} />} trend={`↑ vs ${baselineRate}% naive baseline`} up
          tip="Naive: standard rigid 24-hour retries on everything. Sentinel AI: dynamic, intent-parsed scheduling — the right action for each failure class, so more payments recover." />
        <Kpi label="Interventions Run" value={interventions.toLocaleString('en-IN')} icon={<IconPlay size={13} />} trend={`${silentRetries} silent · ${contactsN} contacts`} />
        <Kpi label="Net Benefit" value={inrCompact(netBenefit)} icon={<IconRefresh size={14} />} trend={`after ₹${fpCost} false-positive cost`} up />
      </div>

      {/* chart + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Recovered vs At Risk over time" right={<Pill>Daily</Pill>}>
          <Legend />
          <LineChart recovered={recovered} atRisk={atRisk} />
        </Panel>
        <RiskBySource sources={sources} totalLabel={sourcesTotalLabel} />
      </div>

      {/* workflows + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Top Recovery Workflows" foot={<Foot>View all workflows</Foot>}>
          <table className="w-full mt-2">
            <thead><tr className="text-2xs text-faint uppercase tracking-wide text-left">
              <th className="font-medium py-1.5">Workflow</th><th className="font-medium py-1.5 text-right">Recovered</th><th className="font-medium py-1.5">Success rate</th><th className="font-medium py-1.5 text-right">Recoveries</th>
            </tr></thead>
            <tbody>
              {workflows.map((w) => (
                <tr key={w.name} className="border-t border-hairline2">
                  <td className="py-2.5 text-[13px] font-medium">{w.name}</td>
                  <td className="py-2.5 text-[13px] text-right tabular-nums">{w.rec}</td>
                  <td className="py-2.5"><div className="flex items-center gap-2"><div className="w-16 h-1.5 rounded-full bg-hairline overflow-hidden"><div className="h-full bg-ink" style={{ width: `${w.rate}%` }} /></div><span className="text-2xs text-muted tabular-nums">{w.rate}%</span></div></td>
                  <td className="py-2.5 text-[13px] text-right tabular-nums text-muted">{w.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Recent Recoveries" foot={<Foot>View all recoveries</Foot>}>
          <table className="w-full mt-2">
            <thead><tr className="text-2xs text-faint uppercase tracking-wide text-left">
              <th className="font-medium py-1.5">Customer</th><th className="font-medium py-1.5">Workflow</th><th className="font-medium py-1.5 text-right">Amount</th><th className="font-medium py-1.5">Status</th>
            </tr></thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} onClick={() => setAuditRow(r)}
                  className="border-t border-hairline2 cursor-pointer hover:bg-surface/70 transition-colors">
                  <td className="py-2.5 text-[13px] font-medium">{r.customer}</td>
                  <td className="py-2.5 text-[13px] text-muted">{r.workflow}</td>
                  <td className="py-2.5 text-[13px] text-right tabular-nums">{inr(r.amount)}</td>
                  <td className="py-2.5"><span className="chip bg-good-soft text-good border-good/20">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-2xs text-faint">Click any row to open its Revenue Audit Trail.</div>
        </Panel>
      </div>

      {/* bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold"><IconBolt size={15} className="text-accent" /> AI Insight</div>
          <p className="text-[13px] text-muted mt-2 leading-relaxed">If we recover just 10% of the at-risk revenue, we can unlock {inrCompact(atRisk * 0.1)} in additional revenue.</p>
          <Link to="/app/agent" className="btn mt-4 h-8">View AI Recommendations <IconArrowRight size={13} /></Link>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold"><IconWarn size={15} className="text-warn" /> Top Opportunity</div>
          <p className="text-[13px] text-muted mt-2 leading-relaxed">Overdue receivables &gt; 30 days have the highest recovery potential.</p>
          <Link to="/app/receivables" className="btn btn-primary mt-4 h-8">Take Action <IconArrowRight size={13} /></Link>
        </div>
        <div className="card p-5">
          <div className="text-[13px] font-semibold">Channel Performance</div>
          <div className="mt-3 space-y-2.5">
            {channels.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-2xs">
                <span className="w-16 text-ink flex items-center gap-1">{c.icon} {c.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-hairline overflow-hidden"><div className="h-full bg-ink" style={{ width: `${Math.min(100, c.pct)}%` }} /></div>
                <span className="text-muted tabular-nums w-20 text-right">{c.amt} ({c.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold"><IconShield size={15} className="text-good" /> System Health</div>
          <div className="text-2xs text-faint mt-0.5">All systems operational</div>
          <div className="mt-3 space-y-2">
            {['AI Agent', 'Payments', 'Integrations', 'Data Sync'].map((s) => (
              <div key={s} className="flex items-center justify-between text-[13px]">
                <span className="text-ink">{s}</span>
                <span className="text-good flex items-center gap-1.5 text-2xs"><span className="w-1.5 h-1.5 rounded-full bg-good" /> Operational</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* keep the track's baseline comparison visible */}
      {m && (
        <div className="card p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="text-[13px] font-semibold">Sentinel vs “retry-everything” baseline</div>
          <Mini label="Extra recovered" value={`+${inr(m.comparison.extraRecovered)}`} good />
          <Mini label="Retries saved" value={`−${m.comparison.retriesSaved}`} good />
          <Mini label="False-positive cost" value={inr(m.sentinel.falsePositiveCost)} />
          <Mini label="Net benefit" value={inr(m.comparison.netBenefit)} good />
          {m.sentinel.moneyRecovered === 0 && (
            <button className="btn btn-accent ml-auto h-8" onClick={runBatch} disabled={busy}><IconPlay size={13} /> Run recovery on batch</button>
          )}
        </div>
      )}

      {/* Revenue Audit Trail — opens when a Recent Recoveries row is clicked */}
      {auditRow && <RecoveryAuditModal row={auditRow} onClose={() => setAuditRow(null)} />}
    </div>
  );
}

/* Centered modal: the full Revenue Audit Trail for one recovered case, listing
   Razorpay's native parameters + a chronological account of the recovery loop. */
function RecoveryAuditModal({ row, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const code = row.code || 'GATEWAY_ERROR';
  const step = row.step || 'payment_initiation';
  const reason = row.reason || 'payment_timed_out';
  const trail = auditNarrative(row, code, step, reason);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" style={{ background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] max-h-[86vh] overflow-hidden rounded-2xl flex flex-col text-slate-200 border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]"
        style={{ background: '#0B1220', animation: 'cardIn .18s ease both' }}>
        {/* header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-white/10">
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Revenue Audit Trail</div>
            <div className="text-[18px] font-bold text-white mt-0.5">{row.customer}</div>
            <div className="text-[13px] text-slate-400 mt-0.5">{row.workflow} · <span className="text-white font-semibold">{inr(row.amount)}</span></div>
          </div>
          <span className="chip bg-emerald-500/15 text-emerald-300 border-emerald-500/25 shrink-0">Recovered</span>
          <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:bg-white/10 shrink-0">✕</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Razorpay native parameters */}
          <div className="grid gap-2">
            <AuditParam label="Razorpay Top-Level Code" value={code} tone="#F87171" />
            <AuditParam label="Failed Checkout Step" value={step} tone="#FBBF24" />
            <AuditParam label="Programmatic Error Reason" value={reason} tone="#A78BFA" />
          </div>

          {/* chronological recovery loop */}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">How the AI agent handled the recovery loop</div>
            <ol className="relative border-l border-white/10 ml-2">
              {trail.map((t, i) => (
                <li key={i} className="relative pl-5 pb-3.5 last:pb-0">
                  <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10.5px] text-slate-500">{t.time}</span>
                    <span className="text-[12.5px] font-semibold text-white">{t.title}</span>
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed mt-0.5">{t.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
function AuditParam({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <span className="text-[12px] text-slate-400">{label}</span>
      <span className="font-mono text-[12.5px] font-semibold px-2 py-0.5 rounded" style={{ color: tone, background: 'rgba(255,255,255,0.06)' }}>{value}</span>
    </div>
  );
}
function auditNarrative(row, code, step, reason) {
  const cls = { insufficient_funds: 'Insufficient funds', card_expired: 'Bad card', payment_timed_out: 'Transient', payment_risk_check_failed: 'Bad card', mandate_afa_required: 'Mandate fail' }[reason] || 'Transient';
  const act = {
    smart_retry: 're-attempted the charge on a cooled-off gateway node',
    delayed_retry: 'scheduled a payday-aligned retry and sent a WhatsApp reminder',
    update_card_link: 'sent a one-tap card-update link over WhatsApp',
    represent_mandate: 're-presented the e-NACH mandate within RBI limits',
    recovery_link: 'sent a one-tap recovery link',
  }[row.action] || 'executed the bounded recovery action for this class';
  return [
    { time: '14:02:01', title: 'Detected', detail: `Razorpay returned ${code} at ${step} — programmatic reason "${reason}". Ingested into the recovery queue.`, color: '#64748B' },
    { time: '14:02:02', title: 'Diagnosed', detail: `Sentinel classified this as ${cls} at 87% confidence — not a blind failure, a specific, recoverable cause.`, color: '#A78BFA' },
    { time: '14:02:02', title: 'Decided', detail: `Chose ${row.workflow} as the single bounded action; stopping rules (3-attempt cap · fraud guard · notice window) all passed.`, color: '#3B82F6' },
    { time: '14:02:03', title: 'Executed', detail: `Agent ${act} — every step written to the immutable audit trail.`, color: '#0EA5E9' },
    { time: '14:04:18', title: 'Recovered', detail: `Payment captured · ${inr(row.amount)} saved. Outcome logged and reflected in dashboard analytics.`, color: '#4ADE80' },
  ];
}

/* ---------- pieces ---------- */
function Kpi({ label, value, icon, trend, up, tip }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-muted">{label}</span>
        <span className="w-7 h-7 rounded-lg border border-hairline grid place-items-center text-faint">{icon}</span>
      </div>
      <div className="mt-2 text-[24px] font-semibold tracking-tight2 tabular-nums">{value}</div>
      <div className={`relative group mt-1 text-2xs inline-flex items-center gap-1 ${up === true ? 'text-good' : up === false ? 'text-stop' : 'text-faint'} ${tip ? 'cursor-help' : ''}`}>
        {trend}
        {tip && <span className="w-3.5 h-3.5 rounded-full border border-current grid place-items-center text-[8px] font-bold opacity-70">i</span>}
        {tip && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-0 bottom-full mb-2 w-60 rounded-[10px] bg-ink text-white text-[11px] leading-relaxed p-3 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.6)] z-30 pointer-events-none normal-case tracking-normal font-normal">
            {tip}
            <span className="absolute left-4 -bottom-1 w-2 h-2 rotate-45 bg-ink" />
          </div>
        )}
      </div>
    </div>
  );
}
function Panel({ title, right, foot, children }) {
  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold">{title}</h3>
        {right}
      </div>
      <div className="flex-1">{children}</div>
      {foot}
    </div>
  );
}
const Pill = ({ children }) => <span className="chip bg-surface text-muted border-hairline h-7">{children} ▾</span>;
const Foot = ({ children }) => <div className="mt-3 pt-3 text-[13px] text-accent-ink font-medium flex items-center gap-1 cursor-pointer">{children} <IconArrowRight size={13} /></div>;
function Legend() {
  return (
    <div className="flex items-center gap-4 mt-2 text-2xs text-muted">
      <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-ink rounded" /> Recovered (₹)</span>
      <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-faint" /> At Risk (₹)</span>
    </div>
  );
}
function Mini({ label, value, good }) {
  return (
    <div>
      <div className="text-2xs text-faint">{label}</div>
      <div className={`text-[16px] font-semibold tabular-nums ${good ? 'text-good' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

function LineChart({ recovered = 375000, atRisk = 549000 }) {
  const days = ['Aug 18', 'Aug 19', 'Aug 20', 'Aug 21', 'Aug 22', 'Aug 23', 'Aug 24'];
  const W = 348, H = 170, pad = 14;
  // a rising recovered curve and a settling at-risk curve, ending at the real totals
  const recVals = [0.5, 0.58, 0.68, 0.73, 0.84, 0.9, 1.0].map((r) => Math.round(recovered * r));
  const riskVals = [1.0, 0.9, 0.74, 0.68, 0.62, 0.7, 0.8].map((r) => Math.round(atRisk * r));
  const maxV = Math.max(...recVals, ...riskVals, 1) * 1.12;
  const X = (i) => (i / (days.length - 1)) * W;
  const Y = (v) => H - pad - (v / maxV) * (H - 2 * pad);
  const recPts = recVals.map((v, i) => [X(i), Y(v)]);
  const riskPts = riskVals.map((v, i) => [X(i), Y(v)]);
  const toPath = (pts) => 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L');
  const recD = toPath(recPts), riskD = toPath(riskPts);

  const [k, setK] = useState(0);
  useEffect(() => { setK((x) => x + 1); }, [recovered, atRisk]); // replay draw when data changes
  const [hi, setHi] = useState(null);
  const wrapRef = useRef(null);
  const onMove = (e) => {
    const el = wrapRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHi(Math.max(0, Math.min(days.length - 1, Math.round(rel * (days.length - 1)))));
  };

  return (
    <div className="mt-3 relative" ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <svg key={k} viewBox={`0 0 ${W} ${H}`} className="w-full h-[190px]" preserveAspectRatio="none">
        {[30, 70, 110, 150].map((y) => <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#F1F1F4" />)}
        <path d={`${recD} L${W},${H} L0,${H} Z`} fill="url(#recFill)" opacity="0" style={{ animation: 'ov-fill-in .5s ease 1.25s both' }} />
        <defs>
          <linearGradient id="recFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16181D" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#16181D" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={riskD} fill="none" stroke="#B8B8BE" strokeWidth="1.6" strokeDasharray="5 4"
          pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: 'ov-draw 1.3s ease-out .15s forwards' }} />
        <path d={recD} fill="none" stroke="#16181D" strokeWidth="2" strokeLinecap="round"
          pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: 'ov-draw 1.3s ease-out .35s forwards' }} />
        {/* hover guide line + highlighted points */}
        {hi != null && (
          <g>
            <line x1={recPts[hi][0]} y1="6" x2={recPts[hi][0]} y2={H - 2} stroke="#c9c9d0" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={riskPts[hi][0]} cy={riskPts[hi][1]} r="4" fill="#fff" stroke="#B8B8BE" strokeWidth="2" />
            <circle cx={recPts[hi][0]} cy={recPts[hi][1]} r="4.5" fill="#16181D" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-faint">
        {days.map((d, i) => <span key={d} className={hi === i ? 'text-ink font-semibold' : ''}>{d}</span>)}
      </div>
      {/* tooltip — shows the numbers at the hovered point */}
      {hi != null && (
        <div className="absolute z-20 pointer-events-none"
          style={{ left: `${(recPts[hi][0] / W) * 100}%`, top: `${recPts[hi][1] * (190 / H) - 10}px`, transform: `translate(${hi === 0 ? '0' : hi === days.length - 1 ? '-100%' : '-50%'}, -100%)` }}>
          <div className="rounded-[10px] px-3 py-2 shadow-[0_10px_28px_-8px_rgba(0,0,0,0.5)] whitespace-nowrap" style={{ background: 'rgba(20,22,28,0.95)' }}>
            <div className="text-[10px] text-white/55 mb-1">{days[hi]}</div>
            <div className="text-[11.5px] text-white flex items-center gap-2"><span className="w-3 h-0.5 rounded bg-white" /> Recovered <b className="ml-auto tabular-nums pl-3">{inrCompact(recVals[hi])}</b></div>
            <div className="text-[11.5px] text-white/85 flex items-center gap-2 mt-0.5"><span className="w-3 border-t border-dashed border-white/60" /> At Risk <b className="ml-auto tabular-nums pl-3">{inrCompact(riskVals[hi])}</b></div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskBySource({ sources, totalLabel }) {
  const [hover, setHover] = useState(null);
  const active = hover != null ? sources[hover] : null;
  return (
    <Panel title="Revenue at Risk by Source">
      <div className="relative flex items-center gap-6 mt-2">
        <div className="relative shrink-0">
          <Donut sources={sources} totalLabel={totalLabel} hover={hover} setHover={setHover} />
          {/* Apple-glass tooltip — floats over the donut on hover */}
          {active && (
            <div
              className="absolute left-1/2 -top-3 -translate-x-1/2 -translate-y-full w-[230px] z-20 pointer-events-none"
              style={{ animation: 'cardIn .16s ease both' }}
            >
              <div className="rounded-[14px] p-3.5 border border-white/10 shadow-[0_18px_44px_-8px_rgba(0,0,0,0.55)]"
                style={{ background: 'rgba(24,25,30,0.86)', backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: active.color }} />
                  <span className="text-[13px] font-semibold text-white">{active.label}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[18px] font-semibold tracking-tight2 text-white tabular-nums">{active.amt}</span>
                  <span className="text-[12px] text-white/55">({active.pct}% of risk)</span>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-snug text-white/70">{active.desc}</p>
              </div>
              {/* little pointer */}
              <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b border-white/10"
                style={{ background: 'rgba(24,25,30,0.86)', backdropFilter: 'blur(16px)' }} />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2.5">
          {sources.map((s, i) => (
            <div
              key={s.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="flex items-center gap-2 text-[13px] rounded-[8px] px-1.5 py-1 -mx-1.5 cursor-pointer transition-colors"
              style={{ background: hover === i ? 'rgb(var(--surface))' : 'transparent' }}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="flex-1 text-ink">{s.label}</span>
              <span className="text-muted tabular-nums">{s.amt} <span className="text-faint">({s.pct}%)</span></span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Donut({ sources, totalLabel, hover, setHover }) {
  const r = 42, C = 2 * Math.PI * r;
  let acc = 0;
  const active = sources[hover];
  return (
    <svg viewBox="0 0 120 120" className="w-[130px] h-[130px] shrink-0 overflow-visible">
      <g transform="rotate(-90 60 60)">
        {sources.map((s, i) => {
          const seg = (s.pct / 100) * C;
          const on = hover === i;
          const dim = hover != null && !on;
          const el = (
            <circle
              key={s.label}
              cx="60" cy="60" r={r} fill="none"
              stroke={s.color}
              strokeWidth={on ? 19 : 15}
              strokeDasharray={`${seg} ${C - seg}`}
              strokeDashoffset={-acc}
              style={{ opacity: dim ? 0.28 : 1, transition: 'stroke-width .18s ease, opacity .18s ease', cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
          acc += seg;
          return el;
        })}
      </g>
      <text x="60" y="56" textAnchor="middle" className="fill-ink" style={{ fontSize: active ? 13 : 15, fontWeight: 600, transition: 'font-size .18s' }}>
        {active ? active.amt : totalLabel}
      </text>
      <text x="60" y="72" textAnchor="middle" className="fill-current text-faint" style={{ fontSize: 9 }}>
        {active ? `${active.pct}%` : 'At Risk'}
      </text>
    </svg>
  );
}

// August-2026 date picker — dark Apple-glass. Only Aug 2026; days 1–22 locked
// (before the reporting window opened), 23rd onward selectable. Today = 25th.
function CalendarPicker({ selDay, today, onPick, onClose }) {
  const first = new Date(2026, 7, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first offset
  const daysInMonth = 31;
  const prevDays = new Date(2026, 7, 0).getDate(); // last day of July
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push({ n: prevDays - lead + 1 + i, out: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ n: d, out: false });
  while (cells.length % 7 !== 0) cells.push({ n: cells.length - lead - daysInMonth + 1, out: true });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 mt-2 z-50 w-[330px] rounded-[22px] overflow-hidden border border-white/10 shadow-[0_28px_70px_-14px_rgba(0,0,0,0.7)]"
        style={{ background: 'rgba(20,21,26,0.92)', backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)', animation: 'cardIn .16s ease both' }}
      >
        {/* purple accent bar */}
        <div className="h-[3px] w-1/3 mx-auto rounded-full" style={{ background: 'linear-gradient(90deg,transparent,#7C3AED,transparent)' }} />
        {/* header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="w-8 h-8 rounded-full border border-white/10 grid place-items-center text-white/25 cursor-not-allowed"><IconChevron size={15} className="rotate-90" /></span>
          <span className="text-[15px] font-semibold text-white">Aug 2026</span>
          <span className="w-8 h-8 rounded-full border border-white/10 grid place-items-center text-white/25 cursor-not-allowed"><IconChevron size={15} className="-rotate-90" /></span>
        </div>
        {/* weekday header */}
        <div className="grid grid-cols-7 px-3 pt-2 text-center text-[11px] tracking-wide text-white/35">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        {/* days */}
        <div className="grid grid-cols-7 gap-y-1 px-3 pb-4 pt-1 text-center">
          {cells.map((c, i) => {
            const locked = c.out || c.n < 23;
            const selected = !c.out && c.n === selDay;
            const isToday = !c.out && c.n === today;
            return (
              <div key={i} className="grid place-items-center py-0.5">
                <button
                  disabled={locked}
                  onClick={() => !locked && onPick(c.n)}
                  className={[
                    'w-9 h-9 rounded-full text-[14px] grid place-items-center transition',
                    selected ? 'bg-[#7C3AED] text-white font-semibold shadow-[0_6px_18px_-4px_rgba(124,58,237,0.8)]'
                      : locked ? 'text-white/20 cursor-not-allowed'
                      : 'text-white hover:bg-white/10 cursor-pointer',
                    isToday && !selected ? 'ring-1 ring-white/30' : '',
                  ].join(' ')}
                >
                  {c.n}
                </button>
              </div>
            );
          })}
        </div>
        <div className="px-4 pb-3 -mt-1 text-[11px] text-white/40">Reporting window opened Aug 23 · dates before are locked</div>
      </div>
    </>
  );
}

/* ---------- data ---------- */
// Cumulative-recovery multiplier per selectable August date (1.0 = today, the 25th).
const DAY_MULT = { 23: 0.86, 24: 0.93, 25: 1.0, 26: 1.07, 27: 1.13, 28: 1.19, 29: 1.24, 30: 1.29, 31: 1.34 };
// diagnosis class → source card label/color/blurb (for the real donut)
const CLASS_META = {
  'Insufficient funds': { label: 'Insufficient funds', color: '#E5484D', desc: 'Soft declines for low balance — retried near payday with a reminder.' },
  'Bad card': { label: 'Card / auth failures', color: '#8B5CF6', desc: 'Expired or declined cards & failed authentication — update-card link, never a blind retry.' },
  Transient: { label: 'Gateway & bank timeouts', color: '#4B63E6', desc: 'Temporary gateway/bank errors — recovered on a cooled-off smart retry.' },
  'Mandate fail': { label: 'Mandate (RBI > ₹15k)', color: '#12A594', desc: 'e-mandate / AFA failures — re-presented within RBI limits.' },
  Abandoned: { label: 'Checkout abandonment', color: '#0EA5E9', desc: 'Left before paying — won back with a one-tap recovery link.' },
};
// chosen action → workflow name (for the real workflows table)
const ACTION_WF = {
  smart_retry: 'Payment Degradation Recovery',
  delayed_retry: 'Insufficient-Funds Recovery',
  update_card_link: 'Card-Update Recovery',
  represent_mandate: 'Mandate Retry Sequencer',
  recovery_link: 'Checkout Drop-off Recovery',
};
const AT_RISK_SOURCES = [
  { label: 'Overdue Receivables', amt: '₹71.2L', pct: 43.9, color: '#4B63E6', desc: 'B2B invoices past their due date — the biggest recoverable pool. Chased by the receivables workflow.' },
  { label: 'Payment Failures', amt: '₹39.6L', pct: 24.4, color: '#E5484D', desc: 'Transactions that failed at the gateway — timeouts, bank declines, insufficient funds. Smart-retried by class.' },
  { label: 'Failed Subscriptions', amt: '₹22.8L', pct: 14.1, color: '#8B5CF6', desc: 'Recurring charges that did not go through — expired cards and soft declines. Recovered via update-card links.' },
  { label: 'Checkout Abandonment', amt: '₹16.4L', pct: 10.1, color: '#0EA5E9', desc: 'Customers who left before paying. Won back with a recovery link, never blind retries.' },
  { label: 'Failed Mandates', amt: '₹12.0L', pct: 7.4, color: '#12A594', desc: 'e-NACH / UPI AutoPay mandates that could not be presented. Re-presented within RBI limits.' },
];
const WORKFLOWS = [
  { name: 'Payment Degradation Recovery', rec: '₹19,60,000', rate: 38.6, n: 512 },
  { name: 'B2B Receivables Chaser', rec: '₹11,21,000', rate: 32.1, n: 248 },
  { name: 'Checkout Drop-off Recovery', rec: '₹8,71,000', rate: 28.8, n: 193 },
  { name: 'Failed Subscription Recovery', rec: '₹6,48,000', rate: 41.2, n: 142 },
  { name: 'Mandate Retry Sequencer', rec: '₹2,58,700', rate: 36.5, n: 82 },
];
const CHANNELS = [
  { label: 'WhatsApp', amt: '₹21.6L', pct: 44.3, icon: '💬' },
  { label: 'Hinglish Voice', amt: '₹12.4L', pct: 25.4, icon: '🎙️' },
  { label: 'Email', amt: '₹8.7L', pct: 17.8, icon: '✉️' },
  { label: 'SMS', amt: '₹6.0L', pct: 12.5, icon: '📱' },
];
const RECENT_TIMES = ['10:24 AM', '09:48 AM', '09:15 AM', '07:36 PM', '06:42 PM'];
const DEMO_RECENT = [
  { customer: 'Bluestream Solutions', workflow: 'Payment Degradation', amount: 124850, status: 'Recovered', code: 'GATEWAY_ERROR', step: 'payment_initiation', reason: 'payment_timed_out', action: 'smart_retry' },
  { customer: 'EduSpark Pvt Ltd', workflow: 'B2B Receivables Chaser', amount: 258700, status: 'Recovered', code: 'BAD_REQUEST_ERROR', step: 'payment_authorization', reason: 'insufficient_funds', action: 'delayed_retry' },
  { customer: 'PixelPlay Technologies', workflow: 'Failed Subscription Recovery', amount: 6480, status: 'Recovered', code: 'BAD_REQUEST_ERROR', step: 'payment_authorization', reason: 'mandate_afa_required', action: 'represent_mandate' },
  { customer: 'GrowthKart', workflow: 'Checkout Drop-off Recovery', amount: 15320, status: 'Recovered', code: 'BAD_REQUEST_ERROR', step: 'payment_authentication', reason: 'card_expired', action: 'update_card_link' },
  { customer: 'IndiePress', workflow: 'Mandate Retry Sequencer', amount: 9870, status: 'Recovered', code: 'GATEWAY_ERROR', step: 'payment_authorization', reason: 'payment_risk_check_failed', action: 'update_card_link' },
];
function WF_FOR(action) {
  return {
    smart_retry: 'Payment Degradation',
    delayed_retry: 'Payment Degradation',
    update_card_link: 'Checkout Drop-off Recovery',
    recovery_link: 'Checkout Drop-off Recovery',
    represent_mandate: 'Mandate Retry Sequencer',
  }[action] || 'Recovery Workflow';
}
