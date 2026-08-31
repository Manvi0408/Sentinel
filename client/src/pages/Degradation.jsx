import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useConsole } from '../components/Console.jsx';
import { inr } from '../lib/format.js';
import { IconActivity, IconWarn, IconBolt } from '../components/Icons.jsx';

export default function Degradation() {
  const { refreshKey } = useConsole();
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = () => api.degradation().then(setData).catch(() => {});
    load();
    const id = setInterval(load, 6000); // live monitor
    return () => clearInterval(id);
  }, [refreshKey]);

  const segments = data?.segments || [];
  const alert = data?.alert;

  return (
    <div className="p-6 max-w-[1180px] mx-auto space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[10px] bg-warn-soft text-warn grid place-items-center"><IconActivity size={18} /></span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">Degradation Detector</h1>
          <p className="text-[13px] text-muted">Watches recovery rate per failure segment and fires the moment revenue starts slipping.</p>
        </div>
        <span className="ml-auto chip h-7 px-3 bg-good-soft text-good border-good/20">
          <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" /> Monitoring live
        </span>
      </div>

      {/* headline + alert */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <div className="card p-5">
          <div className="text-[13px] text-muted">Overall recovery rate</div>
          <div className="mt-1 text-[38px] font-semibold tracking-tight2 tabular-nums">{data ? data.overallRecoveryPct : '—'}%</div>
          <div className="mt-2 h-1.5 rounded-full bg-surface overflow-hidden">
            <div className="h-full bg-good rounded-full transition-all" style={{ width: `${data?.overallRecoveryPct || 0}%` }} />
          </div>
          <div className="mt-2 text-[12px] text-faint">{segments.reduce((s, x) => s + x.count, 0)} payments across {segments.length} segments</div>
        </div>

        {alert ? (
          <div className="card p-5 border-stop/30 bg-stop-soft/40">
            <div className="flex items-center gap-2 text-stop">
              <IconWarn size={17} />
              <span className="text-[14px] font-semibold">Degradation detected · {alert.segment}</span>
              <span className="ml-auto chip h-6 px-2 text-[11px] bg-white text-stop border-stop/20">{alert.recoveryRatePct}% recovering</span>
            </div>
            <p className="mt-2 text-[13px] text-ink/80">{alert.rootCause}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="chip h-6 px-2 text-[11px] bg-surface text-muted border-hairline">{inr(alert.amountAtRisk)} at risk</span>
              <span className="chip h-6 px-2 text-[11px] bg-surface text-muted border-hairline">{alert.count} payments</span>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-white border border-hairline px-3 py-2">
              <span className="w-6 h-6 rounded-[7px] bg-accent-soft text-accent grid place-items-center"><IconBolt size={14} /></span>
              <span className="text-[12px] text-faint">Auto-action taken</span>
              <span className="text-[13px] font-medium">{alert.autoAction}</span>
            </div>
          </div>
        ) : (
          <div className="card p-5 grid place-items-center text-center">
            <div>
              <div className="text-[14px] font-semibold text-good">All segments healthy</div>
              <p className="mt-1 text-[13px] text-muted">No segment is recovering below the 45% threshold.</p>
            </div>
          </div>
        )}
      </div>

      {/* per-segment bars */}
      <div className="card p-5">
        <div className="text-[13px] font-semibold mb-4">Recovery rate by failure segment</div>
        <div className="space-y-3.5">
          {segments.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <div className="w-[130px] shrink-0 text-[13px] flex items-center gap-2">
                {s.degrading && <span className="w-1.5 h-1.5 rounded-full bg-stop" />}
                <span className="truncate">{s.name}</span>
              </div>
              <div className="flex-1 h-6 rounded-[7px] bg-surface overflow-hidden relative">
                <div
                  className={`h-full rounded-[7px] transition-all ${s.degrading ? 'bg-stop' : s.recoveryRatePct >= 65 ? 'bg-good' : 'bg-warn'}`}
                  style={{ width: `${Math.max(4, s.recoveryRatePct)}%` }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-medium text-white mix-blend-luminosity">{s.recoveryRatePct}%</span>
              </div>
              <div className="w-[92px] shrink-0 text-right text-[12px] text-muted tabular-nums">{inr(s.amountAtRisk)}</div>
              <div className="w-[120px] shrink-0 text-[11px] text-faint truncate hidden md:block">{s.action}</div>
            </div>
          ))}
          {segments.length === 0 && <div className="text-[13px] text-muted py-6 text-center">No data — run the batch first.</div>}
        </div>
      </div>
    </div>
  );
}
