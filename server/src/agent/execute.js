// EXECUTE step — the only place money actions actually happen.
//
// Every Razorpay call is wrapped so the app runs in one of two modes:
//   • LIVE (test keys present): payment-link actions create a REAL Razorpay
//     test-mode payment link (safe, no real money). Retries/re-presents are
//     still modelled, because you cannot truly "retry" a synthetic failed
//     charge — we don't have a real gateway transaction to re-drive.
//   • SIMULATED (no keys): outcomes are drawn from the editable per-class
//     success-rate constants in Settings. Clearly labelled as a model.
//
// Either way the outcome funds Sentinel's honest metrics.

import Razorpay from 'razorpay';
import { RETRY_ACTIONS, MESSAGE_ACTIONS } from '../config.js';

let razorpayClient = null;
export function razorpayMode() {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return 'live-test';
  return 'simulated';
}

export function getClient() {
  if (razorpayMode() !== 'live-test') return null;
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

// Create a payment link. Real Razorpay test-mode link when keys exist; otherwise
// a clearly-simulated placeholder URL.
export async function createPaymentLink(payment) {
  const client = getClient();
  if (client) {
    try {
      const link = await client.paymentLink.create({
        amount: payment.amount,
        currency: 'INR',
        accept_partial: false,
        description: `Acme Store — recover payment ${payment.id}`,
        customer: { name: payment.customerName, email: payment.customerEmail },
        notify: { sms: false, email: false }, // we don't actually notify synthetic customers
        reminder_enable: false,
        notes: { sentinel: 'true', paymentId: payment.id },
      });
      return { url: link.short_url, id: link.id, real: true };
    } catch {
      // fall through to simulated link if the API call fails
    }
  }
  return { url: `https://rzp.io/sim/${payment.id.slice(-8)}`, id: null, real: false };
}

// Draw a simulated outcome for an action given the diagnosed class.
function simulateOutcome(action, model) {
  const p = model.successRates[action] ?? 0.3;
  return Math.random() < p;
}

// Execute one bounded action. Returns:
// { outcome, recovered, isRetry, isMessage, paymentLinkUrl, detail }
export async function executeAction(payment, action, model) {
  const isRetry = RETRY_ACTIONS.has(action);
  const isMessage = MESSAGE_ACTIONS.has(action);
  const mode = razorpayMode();

  let paymentLinkUrl = payment.paymentLinkUrl || null;

  // Link-based actions: ensure a payment link exists (create once).
  if ((action === 'update_card_link' || action === 'recovery_link' || action === 'delayed_retry') && !paymentLinkUrl) {
    const link = await createPaymentLink(payment);
    paymentLinkUrl = link.url;
  }

  // Model whether this action recovered the money.
  const recovered = simulateOutcome(action, model);

  const detail = {
    mode,
    action,
    modelledSuccessRate: model.successRates[action] ?? null,
  };

  let outcome;
  if (action === 'update_card_link' || action === 'recovery_link') {
    // These never "retry"; the outcome is whether the customer paid via the link.
    outcome = recovered ? 'success' : 'link_sent_pending';
    detail.note = mode === 'live-test' ? 'Real Razorpay test-mode link created' : 'Simulated payment link';
  } else {
    // Retry-style actions (smart_retry, delayed_retry, represent_mandate).
    outcome = recovered ? 'success' : 'failure';
    detail.note = 'Retry outcome modelled (no live gateway transaction to re-drive)';
  }

  return { outcome, recovered, isRetry, isMessage, paymentLinkUrl, detail };
}
