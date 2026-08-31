// Synthetic batch generator.
//
// Produces a realistic mix of ~60 failed / at-risk payments. THIS DATA IS
// SYNTHETIC — no real customers, no real money. It exists so the agent has a
// batch to recover across, which is what the track scores.

import { prisma } from './db.js';
import { REASON_SCHEMA } from './config.js';

const FIRST = [
  'Aarav', 'Diya', 'Vivaan', 'Ananya', 'Aditya', 'Isha', 'Kabir', 'Meera', 'Rohan', 'Sara',
  'Arjun', 'Priya', 'Reyansh', 'Anika', 'Vihaan', 'Kiara', 'Dev', 'Riya', 'Ishaan', 'Navya',
  'Krishna', 'Aisha', 'Yash', 'Tara', 'Advait', 'Nisha', 'Karan', 'Pooja', 'Rahul', 'Sneha',
];
const LAST = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Mehta', 'Singh', 'Rao',
  'Bose', 'Kapoor', 'Chopra', 'Malhotra', 'Joshi', 'Desai', 'Ghosh', 'Menon', 'Bhat', 'Shetty',
];

// The failure-reason mix, using Razorpay's real `reason` vocabulary. Weights make
// the batch feel real: lots of soft declines and transient timeouts, a meaningful
// slice of expired cards, risk blocks, and RBI-mandate AFA breaches.
const REASON_MIX = [
  { reason: 'insufficient_funds', weight: 22 },
  { reason: 'payment_timed_out', weight: 20 },
  { reason: 'card_expired', weight: 14 },
  { reason: 'payment_risk_check_failed', weight: 8 },
  { reason: 'mandate_afa_required', weight: 16 },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedReason() {
  const total = REASON_MIX.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const item of REASON_MIX) {
    if (r < item.weight) return item.reason;
    r -= item.weight;
  }
  return REASON_MIX[0].reason;
}

// Realistic INR ticket sizes (in paise). A blend of small B2C and larger B2B.
function amountForReason(reason) {
  const rupees =
    reason === 'mandate_afa_required'
      ? pick([15999, 18534, 21000, 24999, 32000, 48000]) // recurring charges above the RBI ₹15,000 AFA threshold
      : reason === 'payment_risk_check_failed'
        ? pick([2999, 5999, 8999, 14999, 22000])
        : pick([349, 599, 899, 1199, 1999, 2499, 3499, 4999, 7499]);
  return rupees * 100;
}

// Create a fresh batch, wiping any previous one (and its audit trail).
export async function seedBatch(count = 60) {
  await prisma.auditEvent.deleteMany({});
  await prisma.payment.deleteMany({});

  const now = Date.now();
  const rows = [];
  for (let i = 0; i < count; i++) {
    const reason = weightedReason();
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const email = `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@example.com`;
    // Spread failures over the last ~48h.
    const createdAt = new Date(now - Math.floor(Math.random() * 48 * 3600 * 1000));
    const id = `pay_${(now + i).toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const schema = REASON_SCHEMA[reason];
    rows.push({
      id,
      amount: amountForReason(reason),
      customerName: name,
      customerEmail: email,
      failureReason: reason, // Razorpay `reason`
      errorCode: schema.code, // Razorpay top-level `code`
      errorStep: schema.step, // Razorpay `step`
      createdAt,
      // risk/fraud blocks are flagged so the existing neverContactFraud rule halts them;
      // everything else keeps the small realistic background rate.
      fraudFlagged: reason === 'payment_risk_check_failed' ? true : Math.random() < 0.05,
    });
  }

  await prisma.payment.createMany({ data: rows });

  // One ingest audit event per payment — the trail starts the moment we see it.
  await prisma.auditEvent.createMany({
    data: rows.map((r) => ({
      paymentId: r.id,
      step: 'ingest',
      decision: `Ingested failed payment · code=${r.errorCode} · step=${r.errorStep} · reason=${r.failureReason} · ₹${(r.amount / 100).toFixed(0)}`,
      outcome: null,
    })),
  });

  return { count: rows.length };
}
