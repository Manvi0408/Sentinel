import { useEffect, useState } from 'react';
import { useConsole } from '../components/Console.jsx';
import { api } from '../api.js';
import { CardHead, ModePill } from '../components/ui.jsx';
import { IconCheck } from '../components/Icons.jsx';

const ACTION_KEYS = [
  { key: 'smart_retry', label: 'Smart retry (Transient)' },
  { key: 'delayed_retry', label: 'Delayed retry (Insufficient funds)' },
  { key: 'update_card_link', label: 'Card-update link (Bad card)' },
  { key: 'represent_mandate', label: 'Re-present mandate (Mandate fail)' },
  { key: 'recovery_link', label: 'Recovery link (Abandoned)' },
];
const BASELINE_KEYS = ['Transient', 'Insufficient funds', 'Bad card', 'Mandate fail', 'Abandoned'];
const COSTS = [
  { key: 'costPerMessageInr', label: 'Cost per message (₹)' },
  { key: 'goodwillPenaltyInr', label: 'Goodwill penalty / wasted msg (₹)' },
  { key: 'gatewayFeePerRetryInr', label: 'Gateway fee / wasted retry (₹)' },
];

export default function Settings() {
  const { flash, refresh } = useConsole();
  const [data, setData] = useState(null);
  const [model, setModel] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.settings().then((d) => {
      setData(d);
      setModel(d.model);
    });
  }, []);

  const setRate = (group, key, val) => {
    setModel((m) => ({ ...m, [group]: { ...m[group], [key]: val } }));
    setDirty(true);
  };
  const setNum = (key, val) => {
    setModel((m) => ({ ...m, [key]: val }));
    setDirty(true);
  };

  const save = async () => {
    const saved = await api.saveModel(model);
    setModel(saved);
    setDirty(false);
    flash('Model constants saved');
    refresh();
  };
  const reset = async () => {
    const d = await api.resetModel();
    setModel(d);
    setDirty(false);
    flash('Model reset to defaults');
  };

  if (!data || !model) return <div className="p-6 text-[13px] text-faint">Loading…</div>;

  return (
    <div className="p-6 max-w-[860px] mx-auto space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight2">Settings</h1>
        <p className="text-[13px] text-muted mt-0.5">
          Razorpay keys and the recovery-rate model constants. Keys are read from the server’s
          environment and never exposed here.
        </p>
      </div>

      {/* Keys / mode */}
      <div className="card">
        <CardHead title="Integrations" sub="Configure keys in server/.env. The app runs fully without them." />
        <div className="p-5 space-y-3">
          <KeyRow
            title="Razorpay (test mode)"
            desc="When set, payment-link actions create real Razorpay test-mode links."
            present={data.keys.razorpay}
            live="Live test keys"
            absent="Simulated"
          />
          <KeyRow
            title="Google Gemini"
            desc="When set, Gemini does diagnosis, action choice, and recovery copy."
            present={data.keys.gemini}
            live="Enabled"
            liveTone="ai"
            absent="Rules fallback"
          />
          <div className="rounded-[10px] border border-hairline bg-surface px-3.5 py-2.5 text-2xs text-muted font-mono">
            server/.env → RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, GEMINI_API_KEY
          </div>
        </div>
      </div>

      {/* Sentinel success rates */}
      <div className="card">
        <CardHead
          title="Sentinel action success rates"
          sub="Probability each targeted action recovers the money, in simulated mode. Clearly a model — not live gateway data."
        />
        <div className="p-5 space-y-3">
          {ACTION_KEYS.map((a) => (
            <RateRow
              key={a.key}
              label={a.label}
              value={model.successRates[a.key]}
              onChange={(v) => setRate('successRates', a.key, v)}
            />
          ))}
        </div>
      </div>

      {/* Baseline rates */}
      <div className="card">
        <CardHead
          title="“Retry everything” baseline success rates"
          sub="Per-class success of a blind retry — what Sentinel is measured against."
        />
        <div className="p-5 space-y-3">
          {BASELINE_KEYS.map((k) => (
            <RateRow
              key={k}
              label={k}
              value={model.baselineRetrySuccess[k]}
              onChange={(v) => setRate('baselineRetrySuccess', k, v)}
            />
          ))}
        </div>
      </div>

      {/* Cost constants */}
      <div className="card">
        <CardHead title="Cost model" sub="Used for the honest false-positive-cost metric." />
        <div className="p-5 grid grid-cols-3 gap-4">
          {COSTS.map((c) => (
            <div key={c.key}>
              <div className="text-2xs text-faint mb-1">{c.label}</div>
              <input
                type="number"
                className="input w-full tabular-nums"
                value={model[c.key]}
                onChange={(e) => setNum(c.key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn" onClick={reset}>Reset to defaults</button>
        <button className="btn btn-accent" onClick={save} disabled={!dirty}>
          <IconCheck size={15} /> Save constants
        </button>
      </div>
    </div>
  );
}

function KeyRow({ title, desc, present, live, liveTone, absent }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-[13px] font-medium">{title}</div>
        <div className="text-2xs text-faint mt-0.5">{desc}</div>
      </div>
      {present ? (
        <ModePill label={live} tone={liveTone || 'live'} />
      ) : (
        <ModePill label={absent || 'Simulated'} tone="sim" />
      )}
    </div>
  );
}

function RateRow({ label, value, onChange }) {
  const p = Math.round((value ?? 0) * 100);
  return (
    <div className="flex items-center gap-4">
      <div className="w-56 text-[13px] text-ink shrink-0">{label}</div>
      <input
        type="range"
        min="0"
        max="100"
        value={p}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="flex-1 accent-accent"
      />
      <div className="w-12 text-right text-[13px] font-medium tabular-nums">{p}%</div>
    </div>
  );
}
