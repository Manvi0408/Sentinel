// Metrics — the honest scoreboard.
//
// Reports measured money recovered across the batch, the false-positive cost of
// Sentinel's interventions, and an apples-to-apples comparison against the naive
// "retry everything" baseline. All amounts are in rupees.
//
// Sentinel figures are ACTUAL simulated results from the last run.
// Baseline figures are the EXPECTED outcome of blindly retrying every payment
// up to N times with no diagnosis and no links — computed from the same
// editable per-class success constants, so the comparison is fair.

import { prisma, getModel } from '../db.js';
import { normalizeRazorpayReason } from '../config.js';

const toRs = (paise) => Math.round(paise / 100);

export async function computeMetrics() {
  const model = await getModel();
  const payments = await prisma.payment.findMany();

  const total = payments.length;
  const amountAtRiskPaise = payments.reduce((s, p) => s + p.amount, 0);

  // ---- Sentinel actuals ----
  const diagnosed = payments.filter((p) => p.diagnosisClass).length;
  const recoveredPayments = payments.filter((p) => p.status === 'recovered');
  const recoveredPaise = recoveredPayments.reduce((s, p) => s + p.recoveredAmount, 0);
  // honest provenance split: REAL = confirmed by a real Razorpay test link/webhook; MODELED = batch outcome vs baseline
  const realRecovered = recoveredPayments.filter((p) => p.recoveredVia === 'razorpay_paid');
  const realRecoveredCount = realRecovered.length;
  const realRecoveredPaise = realRecovered.reduce((s, p) => s + p.recoveredAmount, 0);
  const modeledRecoveredCount = recoveredPayments.length - realRecoveredCount;
  const sentinelRetries = payments.reduce((s, p) => s + p.retriesUsed, 0); // SILENT auto-retries
  const sentinelContacts = payments.reduce((s, p) => s + p.contactAttempts, 0); // customer-facing (capped)
  const interventions = sentinelRetries + sentinelContacts;
  // refusals logged as intervention_skipped (auditable non-actions)
  const interventionsSkipped = await prisma.auditEvent.count({ where: { step: 'intervention_skipped' } });

  // False-positive cost: customer contacts that did NOT recover cost money + goodwill;
  // wasted silent retries cost only a gateway fee.
  const nonRecovered = payments.filter((p) => p.status !== 'recovered');
  const wastedContacts = nonRecovered.reduce((s, p) => s + p.contactAttempts, 0);
  const wastedRetries = nonRecovered.reduce((s, p) => s + p.retriesUsed, 0);
  const sentinelFpCost =
    wastedContacts * (model.costPerMessageInr + model.goodwillPenaltyInr) +
    wastedRetries * model.gatewayFeePerRetryInr;

  // ---- Naive "retry everything" baseline (expected) ----
  const n = model.baselineMaxRetries;
  let baselineRecoveredPaise = 0;
  let baselineRetries = 0;
  let baselineWastedRetries = 0;
  for (const p of payments) {
    const cls = p.diagnosisClass || classFromReason(p.failureReason);
    const pr = model.baselineRetrySuccess[cls] ?? 0.2;
    const recoverProb = 1 - Math.pow(1 - pr, n); // recovered within n retries
    baselineRecoveredPaise += p.amount * recoverProb;
    // Expected number of attempts before success or exhausting n.
    let attempts = 0;
    for (let k = 0; k < n; k++) attempts += Math.pow(1 - pr, k);
    baselineRetries += attempts;
    baselineWastedRetries += attempts * (1 - recoverProb); // attempts on ultimately-failed payments
  }
  const baselineFpCost = Math.round(baselineWastedRetries * model.gatewayFeePerRetryInr);

  const recoveryRate = amountAtRiskPaise ? recoveredPaise / amountAtRiskPaise : 0;
  const baselineRate = amountAtRiskPaise ? baselineRecoveredPaise / amountAtRiskPaise : 0;

  return {
    mode: {
      // surfaced so the UI can show which engines are live
      razorpay: process.env.RAZORPAY_KEY_ID ? 'live-test' : 'simulated',
      gemini: process.env.GEMINI_API_KEY ? 'enabled' : 'rules-fallback',
    },
    batch: {
      total,
      diagnosed,
      amountAtRisk: toRs(amountAtRiskPaise),
      recoveredCount: recoveredPayments.length,
      realRecoveredCount,      // confirmed by a REAL Razorpay test link/webhook
      modeledRecoveredCount,   // batch outcome, modeled vs baseline
      realRecoveredRs: toRs(realRecoveredPaise),
    },
    sentinel: {
      moneyRecovered: toRs(recoveredPaise),
      recoveryRatePct: +(recoveryRate * 100).toFixed(1),
      realRecoveredCount,
      modeledRecoveredCount,
      realRecoveredRs: toRs(realRecoveredPaise),
      retries: sentinelRetries,
      messages: sentinelContacts,
      contacts: sentinelContacts,
      interventions,
      interventionsSkipped,
      falsePositiveCost: Math.round(sentinelFpCost),
    },
    baseline: {
      moneyRecovered: toRs(baselineRecoveredPaise),
      recoveryRatePct: +(baselineRate * 100).toFixed(1),
      retries: Math.round(baselineRetries),
      falsePositiveCost: baselineFpCost,
    },
    comparison: {
      extraRecovered: toRs(recoveredPaise - baselineRecoveredPaise),
      retriesSaved: Math.round(baselineRetries) - sentinelRetries,
      // Net benefit = extra money Sentinel recovered MINUS what its targeted
      // interventions cost (false-positive cost). Proves the actions pay for
      // themselves even after honestly charging for every wasted message/retry.
      netBenefit: toRs(recoveredPaise - baselineRecoveredPaise) - Math.round(sentinelFpCost),
    },
    // status distribution for the queue / overview
    statusBreakdown: countBy(payments, (p) => p.status),
    classBreakdown: countBy(payments.filter((p) => p.diagnosisClass), (p) => p.diagnosisClass),
  };
}

// ── What-if simulator ──────────────────────────────────────────────
// Projects recovered money / false-positive cost / net benefit under
// hypothetical settings, WITHOUT touching the stored batch. Pure math so
// the UI sliders recompute instantly and honestly.
export async function simulateMetrics(overrides = {}) {
  const model = await getModel();
  const payments = await prisma.payment.findMany();

  const successMult = clamp(overrides.successMultiplier ?? 1, 0.3, 1.6);
  const costPerMessage = num(overrides.costPerMessageInr, model.costPerMessageInr);
  const goodwill = num(overrides.goodwillPenaltyInr, model.goodwillPenaltyInr);
  const gatewayFee = num(overrides.gatewayFeePerRetryInr, model.gatewayFeePerRetryInr);
  const baselineN = Math.max(1, Math.round(num(overrides.baselineMaxRetries, model.baselineMaxRetries)));

  const amountAtRisk = payments.reduce((s, p) => s + p.amount, 0);

  // Sentinel projection: right action per payment, scaled by the multiplier.
  let sentinelRecovered = 0;
  let wastedContacts = 0;
  let contacts = 0;
  for (const p of payments) {
    const base = model.successRates[p.chosenAction] ?? 0.35;
    const prob = clamp(base * successMult, 0, 0.98);
    sentinelRecovered += p.amount * prob;
    const isContactTier = p.chosenAction !== 'smart_retry'; // contact-tier actions message the customer
    if (isContactTier) { contacts += 1; wastedContacts += 1 - prob; }
  }
  const fpCost = Math.round(wastedContacts * (costPerMessage + goodwill));

  // Naive baseline: blindly retry every payment up to N times.
  let baselineRecovered = 0;
  let baselineWastedRetries = 0;
  let baselineRetries = 0;
  for (const p of payments) {
    const cls = p.diagnosisClass || classFromReason(p.failureReason);
    const pr = model.baselineRetrySuccess[cls] ?? 0.2;
    const recoverProb = 1 - Math.pow(1 - pr, baselineN);
    baselineRecovered += p.amount * recoverProb;
    let attempts = 0;
    for (let k = 0; k < baselineN; k++) attempts += Math.pow(1 - pr, k);
    baselineRetries += attempts;
    baselineWastedRetries += attempts * (1 - recoverProb);
  }
  const baselineFpCost = Math.round(baselineWastedRetries * gatewayFee);

  const extra = sentinelRecovered - baselineRecovered;
  return {
    inputs: { successMultiplier: +successMult.toFixed(2), costPerMessageInr: costPerMessage, goodwillPenaltyInr: goodwill, baselineMaxRetries: baselineN },
    amountAtRisk: toRs(amountAtRisk),
    sentinel: {
      moneyRecovered: toRs(sentinelRecovered),
      recoveryRatePct: amountAtRisk ? +((sentinelRecovered / amountAtRisk) * 100).toFixed(1) : 0,
      contacts: Math.round(contacts),
      falsePositiveCost: fpCost,
    },
    baseline: {
      moneyRecovered: toRs(baselineRecovered),
      recoveryRatePct: amountAtRisk ? +((baselineRecovered / amountAtRisk) * 100).toFixed(1) : 0,
      retries: Math.round(baselineRetries),
      falsePositiveCost: baselineFpCost,
    },
    extraRecovered: toRs(extra),
    netBenefit: toRs(extra) - fpCost,
  };
}

// ── Payment-degradation detector ───────────────────────────────────
// Segments the batch by failure type, measures each segment's recovery
// rate, and flags the ones dragging revenue down — with a root cause and
// the action Sentinel auto-took. Truthful: computed from real batch rows.
export async function computeDegradation() {
  const payments = await prisma.payment.findMany();
  const groups = {};
  for (const p of payments) {
    const key = p.diagnosisClass || classFromReason(p.failureReason);
    (groups[key] ||= []).push(p);
  }
  const HEALTHY = 0.45; // segments recovering below this are "degrading"
  const ACTION = {
    Transient: 'Smart retry after cooldown',
    'Insufficient funds': 'Delayed retry near payday + reminder',
    'Bad card': 'Send update-card link (no blind retries)',
    'Mandate fail': 'Re-present mandate within limits',
    Abandoned: 'Send recovery link',
  };
  const segments = Object.entries(groups).map(([name, ps]) => {
    const count = ps.length;
    const recovered = ps.filter((p) => p.status === 'recovered').length;
    const atRisk = ps.reduce((s, p) => s + p.amount, 0);
    const rate = count ? recovered / count : 0;
    return {
      name,
      count,
      recovered,
      recoveryRatePct: +(rate * 100).toFixed(0),
      amountAtRisk: toRs(atRisk),
      degrading: rate < HEALTHY && count > 0,
      action: ACTION[name] || 'Diagnose and route',
    };
  }).sort((a, b) => b.amountAtRisk - a.amountAtRisk);

  const worst = segments.filter((s) => s.degrading).sort((a, b) => b.amountAtRisk - a.amountAtRisk)[0] || null;
  const overallRate = payments.length ? payments.filter((p) => p.status === 'recovered').length / payments.length : 0;
  return {
    overallRecoveryPct: +(overallRate * 100).toFixed(0),
    segments,
    alert: worst && {
      segment: worst.name,
      recoveryRatePct: worst.recoveryRatePct,
      amountAtRisk: worst.amountAtRisk,
      count: worst.count,
      rootCause: `${worst.name} failures recovering at only ${worst.recoveryRatePct}% — dragging batch revenue.`,
      autoAction: worst.action,
    },
  };
}

const num = (v, d) => (Number.isFinite(+v) ? +v : d);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function countBy(arr, fn) {
  const out = {};
  for (const x of arr) {
    const k = fn(x);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

// Fallback class inference for baseline math if a payment isn't diagnosed yet.
function classFromReason(reason) {
  return (
    {
      insufficient_funds: 'Insufficient funds',
      card_expired: 'Bad card',
      payment_timed_out: 'Transient',
      payment_risk_check_failed: 'Bad card',
      mandate_afa_required: 'Mandate fail',
    }[normalizeRazorpayReason({ reason })] || 'Transient'
  );
}
