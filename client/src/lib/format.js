// Formatting + display-mapping helpers shared across the console.

// ₹ with Indian grouping. Input is rupees.
export const inr = (rs) =>
  '₹' + Number(rs || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// Compact ₹ for hero numbers: ₹1.26L, ₹2.17L, ₹12.4K.
export const inrCompact = (rs) => {
  const n = Number(rs || 0);
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + 'L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
  return '₹' + n;
};

export const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

// Status pill styling.
export const STATUS = {
  at_risk: { label: 'At risk', cls: 'bg-surface text-muted border-hairline' },
  diagnosed: { label: 'Diagnosed', cls: 'bg-accent-soft text-accent-ink border-accent/20' },
  retrying: { label: 'Retrying', cls: 'bg-warn-soft text-warn border-warn/20' },
  link_sent: { label: 'Link sent', cls: 'bg-accent-soft text-accent-ink border-accent/20' },
  recovered: { label: 'Recovered', cls: 'bg-good-soft text-good border-good/20' },
  stopped: { label: 'Stopped', cls: 'bg-stop-soft text-stop border-stop/20' },
};

// Human labels for the bounded actions.
export const ACTION_LABEL = {
  smart_retry: 'Smart retry',
  delayed_retry: 'Delayed retry + reminder',
  update_card_link: 'Send card-update link',
  represent_mandate: 'Re-present mandate',
  recovery_link: 'Send recovery link',
  none: '—',
};

// Diagnosis-class accent dots.
export const CLASS_DOT = {
  Transient: 'bg-accent',
  'Insufficient funds': 'bg-warn',
  'Bad card': 'bg-stop',
  'Mandate fail': 'bg-[#8B5CF6]',
  Abandoned: 'bg-faint',
};

export const confPct = (c) => (c == null ? '—' : `${Math.round(c * 100)}%`);

export const fmtTime = (ts) =>
  new Date(ts).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
