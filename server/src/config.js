// Default configuration for Sentinel.
//
// Everything here is editable at runtime from the Rules and Settings pages
// (persisted in the Setting table). These are the "clearly labeled, editable"
// constants the track asks for — nothing about the money math is hidden.

// ---------------------------------------------------------------------------
// STOPPING RULES — enforced before every single action (see agent/stoppingRules.js)
// ---------------------------------------------------------------------------
export const DEFAULT_RULES = {
  maxContactAttempts: 3, // hard cap of customer-facing contacts (WhatsApp + voice). Silent auto-retries do NOT count.
  maxAutoRetries: 3, // cap on silent auto-retries (never reach the customer)
  callWindowStart: 9, // voice calls only inside this window (TRAI-aligned)
  callWindowEnd: 21, // 9am–9pm; outside it voice is downgraded to WhatsApp / deferred
  neverContactPaid: true, // never contact someone who has already settled (re-read at execution time)
  neverContactFraud: true, // fraud-flagged payments get no automated contact at all
  dropIfNoLongerFailed: true, // anything that left the recovery funnel is dropped
};

// Tier = the channel the agent uses. auto_retry is SILENT (never reaches the
// customer); whatsapp and voice are CONTACT attempts and count toward the cap.
export const CLASS_TO_TIER = {
  Transient: 'auto_retry', // gateway/bank blips — silently retried
  'Mandate fail': 'auto_retry', // mandate re-presented, no customer contact
  'Insufficient funds': 'whatsapp',
  'Bad card': 'whatsapp',
  Abandoned: 'whatsapp',
};
// High-value cases escalate from WhatsApp to a voice call.
export const VOICE_MIN_AMOUNT = 800000; // ₹8,000 (paise)

// ---------------------------------------------------------------------------
// RECOVERY-RATE MODEL CONSTANTS
// Used by the simulated-mode executor to model outcomes when live Razorpay keys
// are absent. Each number is the probability that the chosen action recovers the
// money, given the diagnosed class. These are transparent assumptions, not real
// gateway results — the README says so plainly.
// ---------------------------------------------------------------------------
export const DEFAULT_MODEL = {
  // Sentinel's targeted actions: the right action for each class.
  successRates: {
    smart_retry: 0.68, // transient/gateway errors clear on a cooled-off retry
    delayed_retry: 0.47, // insufficient funds — retry near payday + reminder
    update_card_link: 0.34, // expired/bad card — customer updates card via link
    represent_mandate: 0.55, // subscription mandate re-presented within limits
    recovery_link: 0.28, // abandoned checkout — recovery link conversion
  },

  // Naive "retry everything" baseline: blindly retry every payment up to 3x,
  // no diagnosis, no links. Retrying a dead card or an abandoned cart mostly
  // fails; this is what Sentinel is measured against.
  baselineRetrySuccess: {
    Transient: 0.42,
    'Insufficient funds': 0.16,
    'Bad card': 0.02, // retrying an expired card almost never works
    'Mandate fail': 0.3,
    Abandoned: 0.0, // you cannot "retry" a checkout the customer walked away from
  },
  baselineMaxRetries: 3, // the baseline hammers every payment up to this many times

  // Cost model for honest metrics.
  costPerMessageInr: 3, // ₹ cost of sending one reminder / payment link (SMS+email+processing)
  goodwillPenaltyInr: 12, // ₹ modelled goodwill cost per message that annoyed a non-recovering customer
  gatewayFeePerRetryInr: 2, // ₹ gateway/processing cost burned on each retry attempt that failed
};

// Razorpay's actual error schema, keyed by the programmatic `reason`. This is the
// single source of truth: the synthetic generator, the policy engine, and the
// dashboard all read `code` / `step` / `reason` from here so cases read like
// genuine Razorpay error output rather than a custom format.
// (see https://razorpay.com/docs/payments/payments/handle-failed-payments/ )
export const REASON_SCHEMA = {
  insufficient_funds:        { code: 'BAD_REQUEST_ERROR', step: 'payment_authorization',  cls: 'Insufficient funds' },
  card_expired:              { code: 'BAD_REQUEST_ERROR', step: 'payment_authentication', cls: 'Bad card' },
  payment_timed_out:         { code: 'GATEWAY_ERROR',     step: 'payment_initiation',     cls: 'Transient' },
  payment_risk_check_failed: { code: 'GATEWAY_ERROR',     step: 'payment_authorization',  cls: 'Bad card' },
  mandate_afa_required:      { code: 'BAD_REQUEST_ERROR', step: 'payment_authorization',  cls: 'Mandate fail' },
};

// Real Razorpay `error_reason` values (and common variants) → one of our five
// internal classes. Razorpay emits dozens of programmatic reasons; this maps the
// real ones onto the class that drives the right bounded action. The verbatim
// code/step/reason are always preserved for display — this only picks the class.
const REASON_ALIASES = {
  insufficient_funds: ['insufficient_funds', 'insufficient_balance', 'account_balance_low', 'low_balance', 'balance_insufficient'],
  card_expired: ['card_expired', 'expired_card', 'invalid_card', 'incorrect_card_details', 'card_declined', 'invalid_cvv', 'invalid_expiry', 'incorrect_otp', 'authentication_failed', 'auth_failed', '3ds_failed', 'invalid_card_number', 'card_not_supported', 'payment_declined_by_bank', 'do_not_honour', 'restricted_card', 'lost_or_stolen_card'],
  payment_timed_out: ['payment_timed_out', 'gateway_timed_out', 'gateway_timeout', 'gateway_error', 'gateway_technical_error', 'network_error', 'server_error', 'issuer_down', 'bank_down', 'gateway_down', 'timeout', 'request_timeout', 'issuer_unavailable', 'switch_down'],
  payment_risk_check_failed: ['payment_risk_check_failed', 'risk_check_failed', 'suspected_fraud', 'fraud', 'blocked_by_risk', 'payment_declined_by_risk', 'risk_threshold_breached'],
  mandate_afa_required: ['mandate_afa_required', 'mandate_failed', 'mandate_cancelled', 'emandate_failed', 'upi_mandate_failed', 'afa_required', 'recurring_payment_failed', 'token_expired', 'invalid_token', 'subscription_charge_failed'],
};
const REASON_LOOKUP = {};
for (const [key, list] of Object.entries(REASON_ALIASES)) for (const a of list) REASON_LOOKUP[a] = key;

// Normalize a real (or synthetic) Razorpay error into one of our five internal
// reason keys. Order: exact-known → alias table → keyword heuristics → code/step
// fallback → safe default (a silent retry). This is what lets the rules engine
// classify Razorpay's full taxonomy instead of collapsing everything to a default.
export function normalizeRazorpayReason({ code, step, reason } = {}) {
  const r = String(reason || '').toLowerCase().trim();
  if (REASON_SCHEMA[r]) return r; // already one of ours (synthetic data)
  if (REASON_LOOKUP[r]) return REASON_LOOKUP[r]; // an exact real Razorpay reason
  if (/insufficient|balance/.test(r)) return 'insufficient_funds';
  if (/mandate|afa|recurring|emandate|autopay|subscription|token/.test(r)) return 'mandate_afa_required';
  if (/risk|fraud|suspicious|blocked/.test(r)) return 'payment_risk_check_failed';
  if (/expire|invalid.?card|card.?declin|\botp\b|authenticat|3ds|cvv|declin|do_not_honou?r|restricted|lost|stolen|international|not.?allowed|not.?supported|not.?permitted/.test(r)) return 'card_expired';
  if (/timeout|timed.?out|gateway|network|server|issuer|bank.?down|unavailable|\bdown\b|switch/.test(r)) return 'payment_timed_out';
  const s = String(step || '').toLowerCase();
  if (s === 'payment_authentication') return 'card_expired';
  if (s === 'payment_initiation') return 'payment_timed_out';
  const c = String(code || '').toUpperCase();
  if (c === 'GATEWAY_ERROR' || c === 'SERVER_ERROR') return 'payment_timed_out';
  return 'payment_timed_out'; // conservative default: a bounded silent retry
}

// How confidently a reason was classified — 'exact' when it matched a known
// Razorpay reason verbatim (or our synthetic schema), 'heuristic' when it only
// matched by keyword/step/code fallback. The cost gate (LLM_GATE) uses this to
// skip the LLM on unambiguous cases and reserve it for the ambiguous long tail.
export function classifySource({ code, step, reason } = {}) {
  const r = String(reason || '').toLowerCase().trim();
  if (REASON_SCHEMA[r] || REASON_LOOKUP[r]) return 'exact';
  return 'heuristic';
}

// Human-readable labels for each Razorpay reason (used where a friendly name is shown).
export const FAILURE_REASONS = {
  insufficient_funds: 'Insufficient funds',
  card_expired: 'Card expired',
  payment_timed_out: 'Issuer/bank timeout',
  payment_risk_check_failed: 'Risk / fraud block',
  mandate_afa_required: 'RBI mandate AFA breach',
};

// The five diagnosis classes the agent maps everything into.
export const CLASSES = ['Transient', 'Insufficient funds', 'Bad card', 'Mandate fail', 'Abandoned'];

// Map each class to the single bounded action the agent is allowed to take.
export const CLASS_TO_ACTION = {
  Transient: 'smart_retry',
  'Insufficient funds': 'delayed_retry',
  'Bad card': 'update_card_link',
  'Mandate fail': 'represent_mandate',
  Abandoned: 'recovery_link',
};

// Actions that count as a "retry" against the retry limit (vs. sending a link/message).
export const RETRY_ACTIONS = new Set(['smart_retry', 'delayed_retry', 'represent_mandate']);
// Actions that count as a customer "message" against the message limit.
export const MESSAGE_ACTIONS = new Set(['update_card_link', 'recovery_link', 'delayed_retry']);
