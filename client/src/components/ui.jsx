// Small shared presentational atoms.
import { STATUS, CLASS_DOT, confPct } from '../lib/format.js';

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.at_risk;
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
}

export function ClassTag({ cls }) {
  if (!cls) return <span className="text-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink">
      <span className={`w-1.5 h-1.5 rounded-full ${CLASS_DOT[cls] || 'bg-faint'}`} />
      {cls}
    </span>
  );
}

// A confidence bar + %.
export function Confidence({ value }) {
  if (value == null) return <span className="text-faint">—</span>;
  const p = Math.round(value * 100);
  const tone = p >= 85 ? 'bg-good' : p >= 70 ? 'bg-accent' : 'bg-warn';
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-hairline overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-2xs text-muted tabular-nums w-8">{confPct(value)}</span>
    </div>
  );
}

// Section label used on cards.
export function CardHead({ title, sub, right }) {
  return (
    <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-hairline2">
      <div>
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {sub && <p className="text-2xs text-muted mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="py-16 text-center text-[13px] text-faint">{children}</div>;
}

export function ModePill({ label, tone }) {
  const map = {
    live: 'bg-good-soft text-good border-good/20',
    sim: 'bg-surface text-muted border-hairline',
    ai: 'bg-accent-soft text-accent-ink border-accent/20',
  };
  return <span className={`chip ${map[tone] || map.sim}`}>{label}</span>;
}
