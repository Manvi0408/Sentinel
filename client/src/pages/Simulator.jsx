import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { inr } from '../lib/format.js';
import { IconChart } from '../components/Icons.jsx';

const DEFAULTS = { successMultiplier: 1, baselineMaxRetries: 3, costPerMessageInr: 3, goodwillPenaltyInr: 12 };

export default function Simulator() {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [out, setOut] = useState(null);
  const t = useRef(null);

  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => { api.simulate(inputs).then(setOut).catch(() => {}); }, 120);
    return () => clearTimeout(t.current);
  }, [inputs]);

  const set = (k, v) => setInputs((s) => ({ ...s, [k]: v }));
  const reset = () => setInputs(DEFAULTS);

  const s = out?.sentinel, b = out?.baseline;
  const max = Math.max(s?.moneyRecovered || 1, b?.moneyRecovered || 1);

  return (
    <div className="p-6 max-w-[1180px] mx-auto space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-[10px] bg-accent-soft text-accent grid place-items-center"><IconChart size={18} /></span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight2">What-If Simulator</h1>
          <p className="text-[13px] text-muted">Move the levers and see projected recovery, cost, and net benefit recompute live.</p>
        </div>
        <button onClick={reset} className="ml-auto chip h-8 px-3 bg-canvas text-muted border-hairline hover:bg-surface">Reset</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        {/* levers */}
        <div className="card p-5 space-y-6 h-fit">
          <Slider label="Action effectiveness" hint="Scales Sentinel's per-action success rate" value={inputs.successMultiplier}
            min={0.5} max={1.5} step={0.05} onChange={(v) => set('successMultiplier', v)} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Baseline retries" hint="How hard the naive 'retry-everything' hammers" value={inputs.baselineMaxRetries}
            min={1} max={8} step={1} onChange={(v) => set('baselineMaxRetries', v)} fmt={(v) => `${v}×`} />
          <Slider label="Cost per message" hint="₹ per reminder / link sent" value={inputs.costPerMessageInr}
            min={0} max={15} step={1} onChange={(v) => set('costPerMessageInr', v)} fmt={(v) => `₹${v}`} />
          <Slider label="Goodwill penalty" hint="₹ modelled cost of annoying a non-recovering customer" value={inputs.goodwillPenaltyInr}
            min={0} max={40} step={1} onChange={(v) => set('goodwillPenaltyInr', v)} fmt={(v) => `₹${v}`} />
        </div>

        {/* projection */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Sentinel recovers" value={inr(s?.moneyRecovered)} sub={`${s?.recoveryRatePct ?? 0}% of risk`} tone="good" big />
            <Stat label="Naive baseline" value={inr(b?.moneyRecovered)} sub={`${b?.recoveryRatePct ?? 0}% of risk`} />
            <Stat label="Extra recovered" value={inr(out?.extraRecovered)} sub="vs baseline" tone="accent" />
            <Stat label="Net benefit" value={inr(out?.netBenefit)} sub="after false-positive cost" tone={out && out.netBenefit >= 0 ? 'good' : 'stop'} big />
          </div>

          <div className="card p-5">
            <div className="text-[13px] font-semibold mb-4">Recovered money — Sentinel vs naive baseline</div>
            <Bar label="Sentinel (targeted)" value={s?.moneyRecovered || 0} max={max} tone="bg-good" />
            <Bar label="Retry everything" value={b?.moneyRecovered || 0} max={max} tone="bg-faint" />
            <div className="mt-4 pt-4 border-t border-hairline grid grid-cols-3 gap-3 text-center">
              <Mini label="False-positive cost" value={inr(s?.falsePositiveCost)} />
              <Mini label="Customer contacts" value={s?.contacts ?? 0} />
              <Mini label="Amount at risk" value={inr(out?.amountAtRisk)} />
            </div>
          </div>

          <p className="text-[12px] text-faint px-1">
            Projection over the current batch — pure math, nothing is written. Net benefit charges Sentinel honestly for every wasted message before comparing.
          </p>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, hint, value, min, max, step, onChange, fmt }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="text-[13px] font-semibold tabular-nums text-accent">{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)}
        className="mt-2 w-full h-1.5 rounded-full appearance-none cursor-pointer accent-accent"
        style={{ background: `linear-gradient(to right, #4B63E6 ${pct}%, rgb(var(--surface)) ${pct}%)` }} />
      <div className="mt-1 text-[11px] text-faint">{hint}</div>
    </div>
  );
}

function Stat({ label, value, sub, tone, big }) {
  const c = { good: 'text-good', stop: 'text-stop', accent: 'text-accent' }[tone] || 'text-ink';
  return (
    <div className="card p-4">
      <div className="text-[12px] text-muted">{label}</div>
      <div className={`mt-1 font-semibold tracking-tight2 tabular-nums ${c} ${big ? 'text-[24px]' : 'text-[20px]'}`}>{value}</div>
      <div className="text-[11px] text-faint">{sub}</div>
    </div>
  );
}

function Bar({ label, value, max, tone }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <div className="w-[140px] shrink-0 text-[12px] text-muted">{label}</div>
      <div className="flex-1 h-7 rounded-[7px] bg-surface overflow-hidden">
        <div className={`h-full rounded-[7px] ${tone} transition-all duration-300 flex items-center justify-end pr-2`} style={{ width: `${Math.max(6, (value / max) * 100)}%` }}>
          <span className="text-[11px] font-semibold text-white tabular-nums">{inr(value)}</span>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <div className="text-[16px] font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}
