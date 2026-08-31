// The agent loop, run across the whole batch.
//
// Phase 1 — DIAGNOSE every un-diagnosed payment, pick its bounded action, and
//           assign a TIER: auto_retry (silent) / whatsapp / voice.
// Phase 2 — Run recovery ROUNDS. Each round is one recovery pass. Before every
//           action the stopping rules are re-checked; each refusal is written as
//           an `intervention_skipped` row naming the exact rule. Silent
//           auto-retries never count toward the 3-contact cap, so running the
//           pipeline repeatedly makes the cap shut the whole thing down on its own.

import { prisma, getRules, getModel } from './../db.js';
import { analyze } from './aiEngine.js';
import { checkStoppingRules, isContactTier } from './stoppingRules.js';
import { createPaymentLink } from './execute.js';
import { CLASS_TO_TIER, VOICE_MIN_AMOUNT } from '../config.js';

function tierFor(payment, cls) {
  const base = CLASS_TO_TIER[cls] || 'whatsapp';
  if (base === 'whatsapp' && payment.amount >= VOICE_MIN_AMOUNT) return 'voice';
  return base;
}

async function diagnoseOne(payment) {
  return analyze(payment);
}

// India-Standard-Time hour (0–23) for the calling-window rule.
function istHour() {
  return Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }));
}

export async function runBatch() {
  const rules = await getRules();
  const model = await getModel();
  const events = [];
  const log = (paymentId, step, decision, extra = {}) => events.push({ paymentId, step, decision, ts: new Date(), ...extra });

  let payments = await prisma.payment.findMany();

  // ---- Phase 1: DIAGNOSE + assign tier (parallel, to keep a 60-payment run fast) ----
  const undiagnosed = payments.filter((p) => !p.diagnosisClass);
  const CHUNK = 8;
  for (let i = 0; i < undiagnosed.length; i += CHUNK) {
    await Promise.all(
      undiagnosed.slice(i, i + CHUNK).map(async (p) => {
        const a = await diagnoseOne(p);
        const tier = tierFor(p, a.class);
        await prisma.payment.update({
          where: { id: p.id },
          data: {
            diagnosisClass: a.class, confidence: a.confidence, diagnosisWhy: a.why, diagnosisSource: a.source,
            chosenAction: a.action, tier, recoveryMessage: a.message, recoveryMessageHinglish: a.messageHinglish, status: 'diagnosed',
          },
        });
        Object.assign(p, { diagnosisClass: a.class, confidence: a.confidence, chosenAction: a.action, tier, status: 'diagnosed' });
        log(p.id, 'diagnose', `Diagnosed as ${a.class} (${Math.round(a.confidence * 100)}%, ${a.source}) — ${a.why}`, { detail: JSON.stringify({ source: a.source }) });
        log(p.id, 'decide', `Tier chosen: ${tier} (${a.action})`, { action: a.action });
      }),
    );
  }

  // ---- Phase 2: RECOVERY ROUNDS ----
  const nowHour = istHour();
  const maxRounds = rules.maxContactAttempts + rules.maxAutoRetries + 2;
  const rounds = [];

  for (let round = 1; round <= maxRounds; round++) {
    payments = await prisma.payment.findMany();
    const stat = { round, auto_retry: 0, whatsapp: 0, voice: 0, skipped: 0 };
    let acted = 0;

    for (const p of payments) {
      if (p.status === 'recovered' || p.status === 'stopped') continue; // left the funnel
      if (!p.tier) continue;

      let tier = p.tier;
      const check = checkStoppingRules(p, tier, rules, nowHour);

      // Refusal → intervention_skipped naming the exact rule.
      if (!check.allowed) {
        await prisma.payment.update({ where: { id: p.id }, data: { status: 'stopped', stopReason: check.rule } });
        log(p.id, 'intervention_skipped', `Skipped — rule: ${check.rule}`, { action: tier, outcome: 'skipped', wave: round, retriesUsed: p.retriesUsed });
        stat.skipped++;
        continue;
      }
      // Calling-window downgrade: voice → whatsapp outside 9am–9pm.
      if (check.downgradeTo) {
        log(p.id, 'decide', `Outside calling window — voice downgraded to ${check.downgradeTo}`, { action: 'calling_window', wave: round });
        tier = check.downgradeTo;
      }

      // Execute the tier. The batch uses a simulated link so a 60-payment run
      // stays instant; REAL Razorpay links are created on-demand by the voice
      // agent and the create_payment_link tool.
      const contact = isContactTier(tier);
      let paymentLinkUrl = p.paymentLinkUrl;
      if (contact && !paymentLinkUrl) paymentLinkUrl = `https://rzp.io/sim/${p.id.slice(-8)}`;
      const base = model.successRates[p.chosenAction] ?? 0.3;
      const rate = tier === 'voice' ? Math.min(0.95, base + 0.12) : base;
      const recovered = Math.random() < rate;

      const data = { paymentLinkUrl, lastActionAt: new Date() };
      if (contact) {
        data.contactAttempts = p.contactAttempts + 1;
        if (tier === 'whatsapp') data.messagesSent = p.messagesSent + 1;
      } else {
        data.retriesUsed = p.retriesUsed + 1;
      }
      if (recovered) { data.status = 'recovered'; data.recoveredAmount = p.amount; data.recoveredVia = 'modeled'; }
      else data.status = contact ? 'link_sent' : 'retrying';
      await prisma.payment.update({ where: { id: p.id }, data });

      stat[tier]++;
      acted++;
      const label = tier === 'auto_retry' ? `silent retry #${(data.retriesUsed || p.retriesUsed)}` : `${tier} contact #${data.contactAttempts}`;
      log(p.id, 'execute', `Executed ${tier} (${label})`, { action: tier, outcome: recovered ? 'success' : 'attempted', wave: round });
      log(p.id, 'outcome', recovered ? `RECOVERED ₹${(p.amount / 100).toLocaleString('en-IN')}` : `${tier} sent — awaiting outcome`, { action: tier, outcome: recovered ? 'success' : (contact ? 'link_sent_pending' : 'failure'), wave: round });
    }

    rounds.push(stat);
    if (acted === 0) break; // the cap has closed everything
  }

  if (events.length) await prisma.auditEvent.createMany({ data: events });
  return { events: events.length, rounds };
}
