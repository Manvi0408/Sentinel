import { useEffect, useState } from 'react';
import { useConsole } from '../components/Console.jsx';
import { api } from '../api.js';
import { CardHead } from '../components/ui.jsx';
import { IconCheck } from '../components/Icons.jsx';

// Editable stopping rules. Each rule is explained so the "why" is visible.
const NUMERIC = [
  { key: 'maxContactAttempts', label: 'Max contact attempts', hint: 'Hard cap of customer-facing contacts (WhatsApp + voice). Silent auto-retries do NOT count.', min: 0, max: 10 },
  { key: 'maxAutoRetries', label: 'Max silent auto-retries', hint: 'Cap on silent retries that never reach the customer.', min: 0, max: 10 },
  { key: 'callWindowStart', label: 'Calling window — start (hour)', hint: 'Voice calls only after this hour (TRAI-aligned).', min: 0, max: 23 },
  { key: 'callWindowEnd', label: 'Calling window — end (hour)', hint: 'Outside 9am–9pm, voice is downgraded to WhatsApp and deferred.', min: 0, max: 24 },
];
const TOGGLES = [
  { key: 'neverContactPaid', label: 'Never contact someone who has paid', hint: 'Status is re-read at execution time, never trusted from the decision.' },
  { key: 'neverContactFraud', label: 'Fraud-flagged → no automated contact', hint: 'Fraud-flagged payments get no automated contact at all.' },
  { key: 'dropIfNoLongerFailed', label: 'Drop if no longer failed', hint: 'Anything that left the recovery funnel is dropped.' },
];

export default function Rules() {
  const { flash, refresh } = useConsole();
  const [rules, setRules] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.rules().then(setRules).catch(() => {});
  }, []);

  const set = (k, v) => {
    setRules((r) => ({ ...r, [k]: v }));
    setDirty(true);
  };

  const save = async () => {
    const saved = await api.saveRules(rules);
    setRules(saved);
    setDirty(false);
    flash('Stopping rules saved');
    refresh();
  };
  const reset = async () => {
    const d = await api.resetRules();
    setRules(d);
    setDirty(false);
    flash('Rules reset to defaults');
  };

  if (!rules) return <div className="p-6 text-[13px] text-faint">Loading…</div>;

  return (
    <div className="p-6 max-w-[860px] mx-auto space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight2">Stopping rules</h1>
        <p className="text-[13px] text-muted mt-0.5">
          Enforced before every single action. These are what keep recovery compliant — bounded
          retries, no spam, and a hard stop on hard declines.
        </p>
      </div>

      <div className="card">
        <CardHead title="Limits" sub="Checked on every wave for every payment." />
        <div className="p-5 space-y-4">
          {NUMERIC.map((n) => (
            <div key={n.key} className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px] font-medium">{n.label}</div>
                <div className="text-2xs text-faint mt-0.5">{n.hint}</div>
              </div>
              <input
                type="number"
                min={n.min}
                max={n.max}
                className="input w-24 tabular-nums text-center"
                value={rules[n.key]}
                onChange={(e) => set(n.key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <CardHead title="Hard guarantees" />
        <div className="p-5 space-y-3">
          {TOGGLES.map((t) => (
            <button
              key={t.key}
              onClick={() => set(t.key, !rules[t.key])}
              className="w-full flex items-center justify-between gap-4 text-left"
            >
              <div>
                <div className="text-[13px] font-medium">{t.label}</div>
                <div className="text-2xs text-faint mt-0.5">{t.hint}</div>
              </div>
              <span
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
                  rules[t.key] ? 'bg-accent' : 'bg-hairline'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-card transition-all ${
                    rules[t.key] ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn" onClick={reset}>Reset to defaults</button>
        <button className="btn btn-accent" onClick={save} disabled={!dirty}>
          <IconCheck size={15} /> Save rules
        </button>
      </div>
    </div>
  );
}
