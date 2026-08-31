// Deterministic rules engine — the always-available brain.
//
// Sentinel uses Gemini when a key is present (see gemini.js), but EVERYTHING
// works without it: this module classifies each failure, picks the bounded
// action, and writes the recovery messages using transparent rules. That
// guarantees the demo is fully functional and reproducible offline.

import { CLASS_TO_ACTION, FAILURE_REASONS, normalizeRazorpayReason } from '../config.js';

// Map Razorpay's programmatic `reason` -> {class, confidence, why}. The lookup is
// keyed off the `reason` field (Razorpay's real error vocabulary), not custom labels.
// Confidence reflects how unambiguous the signal is. A little jitter keeps the
// batch from looking fake while staying deterministic-enough to reason about.
const DIAGNOSIS = {
  insufficient_funds: {
    cls: 'Insufficient funds',
    base: 0.9,
    why: 'Bank declined for low balance at authorization — a soft decline that typically clears after payday.',
  },
  card_expired: {
    cls: 'Bad card',
    base: 0.95,
    why: 'Card expired / invalid at authentication — a hard decline. Retrying cannot succeed; the card must be updated.',
  },
  payment_timed_out: {
    cls: 'Transient',
    base: 0.85,
    why: 'Issuer/bank timed out during payment initiation — a transient gateway error likely to clear on a cooled-off retry.',
  },
  payment_risk_check_failed: {
    cls: 'Bad card',
    base: 0.9,
    why: 'Blocked by the gateway risk/fraud check at authorization — flagged for review; no automated retry or outreach.',
  },
  mandate_afa_required: {
    cls: 'Mandate fail',
    base: 0.88,
    why: 'Recurring mandate charge crossed the RBI ₹15,000 additional-factor-authentication threshold — needs customer re-authorization, not a silent retry.',
  },
};

function jitter(base, seedStr) {
  // Small stable-ish jitter (±0.06) derived from the id so confidences vary.
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  const delta = ((h % 120) / 1000) - 0.06;
  return Math.max(0.5, Math.min(0.99, +(base + delta).toFixed(2)));
}

export function rulesAnalyze(payment) {
  // normalize real Razorpay reasons (or our synthetic keys) onto a diagnosis class
  const key = normalizeRazorpayReason({ code: payment.errorCode, step: payment.errorStep, reason: payment.failureReason });
  const d = DIAGNOSIS[key] || {
    cls: 'Transient',
    base: 0.6,
    why: 'Unrecognized failure reason — treated as transient and retried conservatively.',
  };
  const cls = d.cls;
  const action = CLASS_TO_ACTION[cls];
  const confidence = jitter(d.base, payment.id);
  const { message, messageHinglish } = buildMessages(payment, cls, action);
  return {
    class: cls,
    confidence,
    why: d.why,
    action,
    message,
    messageHinglish,
    source: 'rules',
  };
}

// Customer-facing copy per action, with a Hinglish variant for each.
export function buildMessages(payment, cls, action) {
  const first = payment.customerName.split(' ')[0];
  const amt = `₹${(payment.amount / 100).toLocaleString('en-IN')}`;
  const link = payment.paymentLinkUrl || 'the secure link below';

  switch (action) {
    case 'update_card_link':
      return {
        message: `Hi ${first}, your payment of ${amt} to Acme Store didn't go through because your card has expired. Please update your card here to complete it: ${link}`,
        messageHinglish: `Hi ${first}, aapka ${amt} ka payment Acme Store pe nahi hua kyunki aapka card expire ho gaya hai. Naya card add karke payment complete karein: ${link}`,
      };
    case 'recovery_link':
      return {
        message: `Hi ${first}, you left ${amt} in your Acme Store cart. Complete your purchase in one tap here: ${link}`,
        messageHinglish: `Hi ${first}, aapne ${amt} ka order Acme Store cart mein chhod diya. Ek tap mein order poora karein: ${link}`,
      };
    case 'delayed_retry':
      return {
        message: `Hi ${first}, we couldn't collect ${amt} due to insufficient balance. We'll retry automatically in a few days — or you can pay now: ${link}`,
        messageHinglish: `Hi ${first}, ${amt} balance kam hone ki wajah se collect nahi hua. Hum kuch dino mein dobara try karenge — ya abhi pay karein: ${link}`,
      };
    case 'represent_mandate':
      return {
        message: `Hi ${first}, your subscription charge of ${amt} didn't process. We're re-presenting it to your bank — no action needed unless it fails again.`,
        messageHinglish: `Hi ${first}, aapki subscription ka ${amt} charge nahi hua. Hum bank ko dobara present kar rahe hain — agar phir fail ho to hi action chahiye.`,
      };
    case 'smart_retry':
    default:
      return {
        message: `Hi ${first}, a temporary glitch stopped your ${amt} payment to Acme Store. We're retrying it for you automatically — no action needed.`,
        messageHinglish: `Hi ${first}, ek temporary issue ki wajah se aapka ${amt} payment ruk gaya. Hum automatically dobara try kar rahe hain — koi action ki zarurat nahi.`,
      };
  }
}

export const reasonLabel = (r) => FAILURE_REASONS[r] || r;
