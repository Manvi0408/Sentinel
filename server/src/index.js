// Sentinel API server.
//
// No auth — single hardcoded merchant ("Acme Store · test mode"), exactly as the
// brief asks. Every route is thin; the real logic lives in ./agent/*.

import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { prisma, getRules, setSetting, getModel } from './db.js';
import { DEFAULT_RULES, DEFAULT_MODEL, REASON_SCHEMA, normalizeRazorpayReason } from './config.js';
import { seedBatch } from './seed.js';
import { runBatch } from './agent/runBatch.js';
import { computeMetrics, simulateMetrics, computeDegradation } from './agent/metrics.js';
import { reasonLabel, rulesAnalyze } from './agent/rules.js';
import { getEffectiveEngine, analyze } from './agent/aiEngine.js';
import { geminiChat } from './agent/gemini.js';
import { callTool, TOOL_LIST } from './agent/tools.js';
import { getClient as getRazorpay } from './agent/execute.js';
import { runOnce, sweepStale } from './agent/guard.js';

const app = express();
app.use(cors());
// keep the raw body so the Razorpay webhook signature can be verified (Fix #2)
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

const MERCHANT = { name: 'Acme Store', mode: 'test mode' };

// ---- health / mode ----
app.get('/api/health', async (req, res) => {
  const ai = await getEffectiveEngine(); // the engine that actually works
  res.json({
    ok: true,
    merchant: MERCHANT,
    mode: {
      razorpay: process.env.RAZORPAY_KEY_ID ? 'live-test' : 'simulated',
      gemini: ai !== 'rules' ? 'enabled' : 'rules-fallback',
      ai,
      voice: process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'on-device',
      messaging: process.env.DRY_RUN !== 'false' ? 'dry-run' : process.env.TWILIO_ACCOUNT_SID ? 'live-twilio' : 'dry-run',
      calling: process.env.DRY_RUN === 'false' && process.env.TWILIO_CALLER_ID ? 'live-twilio' : 'simulated',
    },
    demoCallTo: process.env.DEMO_CALL_TO || process.env.TWILIO_TEST_TO || '',
    demoCallName: process.env.DEMO_CALL_NAME || '',
  });
});

// ---- Text-to-speech (ElevenLabs) for the Hinglish Voice Agent ----
// Returns MP3 audio. The client falls back to the on-device engine if this 501s.
app.post('/api/tts', async (req, res) => {
  const text = String(req.body?.text || '').slice(0, 800);
  if (!process.env.ELEVENLABS_API_KEY) return res.status(501).json({ error: 'no ElevenLabs key' });
  if (!text) return res.status(400).json({ error: 'no text' });
  const voice = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Sarah — clear, multilingual
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.75 } }),
    });
    if (!r.ok) return res.status(502).json({ error: 'tts failed', detail: (await r.text()).slice(0, 200) });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---- batch lifecycle ----
app.post('/api/seed', async (req, res) => {
  const count = Math.min(Math.max(Number(req.body?.count) || 60, 10), 120);
  const out = await seedBatch(count);
  res.json(out);
});

app.post('/api/run', async (req, res) => {
  const out = await runBatch();
  const metrics = await computeMetrics();
  res.json({ ...out, metrics });
});

// Mark a payment recovered (from a real Razorpay 'paid' — via poll or webhook).
async function markRecovered(p, reason) {
  await prisma.payment.update({
    where: { id: p.id },
    data: { status: 'recovered', recoveredAmount: p.amount, recoveredVia: 'razorpay_paid', rzpLinkStatus: 'paid', lastActionAt: new Date() },
  });
  await prisma.auditEvent.create({
    data: { paymentId: p.id, step: 'outcome', decision: `RECOVERED ₹${(p.amount / 100).toLocaleString('en-IN')} — ${reason}`, action: 'razorpay_paid', outcome: 'success' },
  });
}

// ---- poll a payment link's status (works locally, no public webhook needed) ----
// When the demo completes the test-mode checkout, this flips the payment to Recovered.
app.post('/api/payments/:id/checklink', async (req, res) => {
  const p = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: 'not found' });
  const client = getRazorpay();
  if (!client || !p.rzpLinkId) return res.json({ paid: p.status === 'recovered', status: 'simulated' });
  try {
    const link = await client.paymentLink.fetch(p.rzpLinkId);
    const paid = link.status === 'paid';
    if (paid && p.status !== 'recovered') await markRecovered(p, 'payment link paid');
    res.json({ paid, status: link.status });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

// Map inbound Razorpay failure events → Razorpay's `reason` vocabulary.
const EVENT_TO_REASON = {
  'payment.failed': 'insufficient_funds',
  'payment_link.expired': 'payment_timed_out',
  'invoice.expired': 'mandate_afa_required',
  'subscription.halted': 'mandate_afa_required',
  'subscription.cancelled': 'mandate_afa_required',
};

// Ingest a real leakage event: create the at-risk payment, diagnose it, and log
// the detection — the same path a live Razorpay webhook takes.
async function ingestLeakageEvent(event) {
  const type = event.event || '';
  const pay = event?.payload?.payment?.entity;
  const link = event?.payload?.payment_link?.entity;
  const inv = event?.payload?.invoice?.entity;
  const sub = event?.payload?.subscription?.entity;
  const ent = pay || link || inv || sub || {};
  // Read Razorpay's REAL error fields verbatim (payment.failed carries these on the
  // payment entity). Keep the raw code/step/reason for display; normalize only to
  // pick our internal class. Falls back to notes / event-type for non-payment events.
  const rzCode = pay?.error_code || ent.error_code || null;
  const rzStep = pay?.error_step || ent.error_step || null;
  const rzReason = pay?.error_reason || ent.error_reason || ent.notes?.reason || EVENT_TO_REASON[type] || null;
  const internal = normalizeRazorpayReason({ code: rzCode, step: rzStep, reason: rzReason });
  const schema = REASON_SCHEMA[internal];
  // display values: the real ones when Razorpay sent them, else our schema's
  const code = rzCode || schema.code;
  const step = rzStep || schema.step;
  const reason = rzReason || internal;
  const amount = ent.amount || Math.floor(Math.random() * 4500 + 500) * 100;
  const name = ent.notes?.customerName || ent.customer_details?.name || `${['Aarav', 'Isha', 'Rohan', 'Neha', 'Kabir', 'Diya'][Math.floor(Math.random() * 6)]} ${['Sharma', 'Verma', 'Menon', 'Iyer', 'Kapoor'][Math.floor(Math.random() * 5)]}`;
  const id = `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const p = await prisma.payment.create({
    data: {
      id, amount, customerName: name,
      customerEmail: `${name.split(' ')[0].toLowerCase()}@example.com`,
      failureReason: reason, errorCode: code, errorStep: step, createdAt: new Date(),
      fraudFlagged: internal === 'payment_risk_check_failed',
    },
  });
  await prisma.auditEvent.create({ data: { paymentId: id, step: 'ingest', decision: `Detected via webhook · ${type} · code=${code} · step=${step} · reason=${reason} · ₹${(amount / 100).toFixed(0)}`, action: 'webhook_detect', outcome: null } });
  // Fix #3: diagnose real events through the effective AI engine (Claude/Gemini),
  // with the rules engine as the catch-all fallback for anything it can't reach.
  const dx = await analyze(p);
  await prisma.payment.update({ where: { id }, data: { diagnosisClass: dx.class, confidence: dx.confidence, diagnosisWhy: dx.why, chosenAction: dx.action, diagnosisSource: dx.source, recoveryMessage: dx.message, recoveryMessageHinglish: dx.messageHinglish, status: 'diagnosed' } });
  await prisma.auditEvent.create({ data: { paymentId: id, step: 'diagnosis', decision: `Diagnosed as ${dx.class} (${Math.round(dx.confidence * 100)}%) — ${dx.why}`, action: 'diagnose', outcome: dx.class } });
  return { id, type, reason, amount, customerName: name, diagnosisClass: dx.class, confidence: dx.confidence, action: dx.action };
}

// Verify Razorpay's webhook signature (HMAC-SHA256 of the raw body with the
// webhook secret). Active only when RAZORPAY_WEBHOOK_SECRET is set — until then
// it's a no-op so the local simulator keeps working. Returns { ok, reason }.
function verifyRazorpaySignature(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return { ok: true, reason: 'no-secret (verification disabled)' };
  const sig = req.get('x-razorpay-signature');
  if (!sig || !req.rawBody) return { ok: false, reason: 'missing signature or body' };
  const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    return { ok, reason: ok ? 'verified' : 'signature mismatch' };
  } catch {
    return { ok: false, reason: 'signature length mismatch' };
  }
}

// ---- Razorpay webhook: recovers on 'paid', DETECTS on failure events ----
// Point a Razorpay test-mode webhook here (via a public tunnel) to auto-recover
// AND to ingest live payment.failed / invoice.expired / subscription.halted events.
app.post('/api/webhook/razorpay', async (req, res) => {
  try {
    // Fix #2: reject spoofed webhooks once a secret is configured (no-op until then)
    const v = verifyRazorpaySignature(req);
    if (!v.ok) return res.status(401).json({ ok: false, error: 'invalid webhook signature', reason: v.reason });
    const event = req.body || {};
    const type = event.event || '';
    // detection: a live failure event → ingest a new at-risk case
    if (EVENT_TO_REASON[type]) {
      const created = await ingestLeakageEvent(event);
      return res.json({ ok: true, detected: created });
    }
    // recovery: a 'paid'/'captured' event → mark the matching payment recovered
    const linkEntity = event?.payload?.payment_link?.entity;
    const payEntity = event?.payload?.payment?.entity;
    const notesPaymentId = linkEntity?.notes?.paymentId || payEntity?.notes?.paymentId;
    const linkId = linkEntity?.id;
    let p = null;
    if (notesPaymentId) p = await prisma.payment.findUnique({ where: { id: notesPaymentId } });
    if (!p && linkId) p = await prisma.payment.findFirst({ where: { rzpLinkId: linkId } });
    if (p && /paid|captured/.test(type) && p.status !== 'recovered') {
      const r = await runOnce(`webhook:${p.id}:paid`, p.id, () => markRecovered(p, `razorpay webhook: ${type}`));
      return res.json({ ok: true, executed: r.executed, cached: r.cached });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) }); // webhooks should still get 2xx
  }
});

// ---- webhook simulator: fire a realistic Razorpay-shaped event through the SAME path ----
app.post('/api/simulate/event', async (req, res) => {
  const type = String(req.body?.type || 'payment.failed');
  const amount = Number(req.body?.amount) || null;
  const reason = req.body?.reason || null;
  // build a Razorpay-shaped envelope so it goes through ingestLeakageEvent unchanged
  const entity = { amount: amount || undefined, notes: { reason: reason || undefined, customerName: req.body?.customerName || undefined }, error_reason: req.body?.error_reason };
  const key = type.startsWith('payment_link') ? 'payment_link' : type.startsWith('invoice') ? 'invoice' : type.startsWith('subscription') ? 'subscription' : 'payment';
  const event = { event: type, payload: { [key]: { entity } } };
  try {
    const created = await ingestLeakageEvent(event);
    res.json({ ok: true, event: type, detected: created });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// ---- agent toolbelt ----
app.get('/api/tools', (req, res) => res.json(TOOL_LIST));
app.post('/api/tools/:name', async (req, res) => {
  try {
    const result = await callTool(req.params.name, req.body || {});
    res.json({ ok: true, tool: req.params.name, result });
  } catch (e) {
    res.status(400).json({ ok: false, tool: req.params.name, error: String(e.message || e) });
  }
});

// ---- metrics (Overview) ----
app.get('/api/metrics', async (req, res) => {
  res.json(await computeMetrics());
});

// ---- what-if simulator ----
app.post('/api/simulate', async (req, res) => {
  res.json(await simulateMetrics(req.body || {}));
});

// ---- live Hinglish voice chat (landing widget) ----
app.post('/api/voice/chat', async (req, res) => {
  const text = String((req.body && req.body.text) || '').slice(0, 300);
  const history = Array.isArray(req.body && req.body.history) ? req.body.history : [];
  let out = null;
  try { out = await geminiChat(text, history); } catch {}
  res.json({ reply: out ? out.display : null, hindi: out ? out.speak : null, source: out ? 'gemini' : 'rules' });
});

// ---- payment-degradation detector ----
app.get('/api/degradation', async (req, res) => {
  res.json(await computeDegradation());
});

// ---- promise-to-pay tracker ----
app.get('/api/promises', async (req, res) => {
  const events = await prisma.auditEvent.findMany({
    where: { action: 'record_promise_to_pay' },
    orderBy: { id: 'desc' },
  });
  const ids = [...new Set(events.map((e) => e.paymentId))];
  const pays = await prisma.payment.findMany({ where: { id: { in: ids } } });
  const byId = Object.fromEntries(pays.map((p) => [p.id, p]));
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const promises = [];
  for (const e of events) {
    if (seen.has(e.paymentId)) continue; // latest promise per payment
    seen.add(e.paymentId);
    const p = byId[e.paymentId];
    if (!p) continue;
    let by = today;
    try { by = JSON.parse(e.detail || '{}').by || today; } catch {}
    const paid = p.status === 'recovered';
    const overdue = !paid && by < today;
    promises.push({
      paymentId: p.id,
      customerName: p.customerName,
      amountRs: Math.round(p.amount / 100),
      by,
      loggedAt: e.ts,
      status: paid ? 'kept' : overdue ? 'overdue' : 'pending',
    });
  }
  res.json(promises);
});

// Demo helper: log promise-to-pay on a few open, contact-tier payments so the
// tracker has content to show. Uses the real record_promise_to_pay tool.
app.post('/api/promises/demo', async (req, res) => {
  const open = await prisma.payment.findMany({
    where: { status: { not: 'recovered' } }, // anyone not yet paid can promise to pay
    orderBy: { amount: 'desc' },
    take: 5,
  });
  let n = 0;
  for (let i = 0; i < open.length; i++) {
    const by = new Date(Date.now() + (i - 1) * 2 * 864e5).toISOString().slice(0, 10); // some past, some future
    await callTool('record_promise_to_pay', { paymentId: open[i].id, date: by });
    n++;
  }
  res.json({ ok: true, created: n });
});

// ---- recovery queue ----
app.get('/api/payments', async (req, res) => {
  const payments = await prisma.payment.findMany({ orderBy: { amount: 'desc' } });
  res.json(
    payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      amountRs: Math.round(p.amount / 100),
      customerName: p.customerName,
      // Razorpay error schema
      code: p.errorCode,
      step: p.errorStep,
      reason: p.failureReason,
      failureReason: p.failureReason,
      failureLabel: reasonLabel(p.failureReason),
      diagnosisClass: p.diagnosisClass,
      confidence: p.confidence,
      chosenAction: p.chosenAction,
      status: p.status,
      retriesUsed: p.retriesUsed,
      messagesSent: p.messagesSent,
      recoveredAmount: p.recoveredAmount,
      recoveredVia: p.recoveredVia,
      diagnosisSource: p.diagnosisSource,
    })),
  );
});

// ---- recovery detail (drawer) ----
app.get('/api/payments/:id', async (req, res) => {
  const p = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: 'not found' });
  const events = await prisma.auditEvent.findMany({
    where: { paymentId: p.id },
    orderBy: { id: 'asc' },
  });
  res.json({
    payment: { ...p, amountRs: Math.round(p.amount / 100), code: p.errorCode, step: p.errorStep, reason: p.failureReason, failureLabel: reasonLabel(p.failureReason) },
    events,
  });
});

// ---- audit trail (all events) ----
app.get('/api/audit', async (req, res) => {
  const events = await prisma.auditEvent.findMany({ orderBy: { id: 'desc' }, take: 2000 });
  res.json(events);
});

// CSV export of the full audit trail.
app.get('/api/audit.csv', async (req, res) => {
  const events = await prisma.auditEvent.findMany({ orderBy: { id: 'asc' } });
  const header = ['ts', 'paymentId', 'step', 'decision', 'action', 'outcome', 'retriesUsed', 'wave'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = events.map((e) =>
    [e.ts.toISOString(), e.paymentId, e.step, e.decision, e.action, e.outcome, e.retriesUsed, e.wave]
      .map(esc)
      .join(','),
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sentinel-audit.csv"');
  res.send([header.join(','), ...rows].join('\n'));
});

// ---- rules (view + edit) ----
app.get('/api/rules', async (req, res) => res.json(await getRules()));
app.put('/api/rules', async (req, res) => {
  const current = await getRules();
  const merged = { ...current, ...req.body };
  await setSetting('rules', merged);
  res.json(merged);
});
app.post('/api/rules/reset', async (req, res) => {
  await setSetting('rules', DEFAULT_RULES);
  res.json(DEFAULT_RULES);
});

// ---- settings: model constants + key presence (never returns secret values) ----
app.get('/api/settings', async (req, res) => {
  res.json({
    model: await getModel(),
    keys: {
      // presence only — secrets are read from env and never echoed back
      razorpay: Boolean(process.env.RAZORPAY_KEY_ID),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    },
  });
});
app.put('/api/settings/model', async (req, res) => {
  const current = await getModel();
  // Shallow-merge the editable numeric groups.
  const merged = {
    ...current,
    ...req.body,
    successRates: { ...current.successRates, ...(req.body?.successRates || {}) },
    baselineRetrySuccess: { ...current.baselineRetrySuccess, ...(req.body?.baselineRetrySuccess || {}) },
  };
  await setSetting('model', merged);
  res.json(merged);
});
app.post('/api/settings/model/reset', async (req, res) => {
  await setSetting('model', DEFAULT_MODEL);
  res.json(DEFAULT_MODEL);
});

// ---- serve the built React console from the same origin ----
// After `npm run build`, the whole app is available on ONE localhost URL.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
// Never let the browser cache the HTML shell (prevents stale app after a rebuild);
// hashed JS/CSS assets are immutable and stay cacheable.
app.use(
  express.static(clientDist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
    },
  }),
);
// SPA fallback: any non-/api GET returns index.html so client-side routes work.
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client build not found. Run `npm run build` first.');
  });
});

// Periodically sweep crashed/stale reservation locks → STOP_AND_ESCALATE.
setInterval(() => { sweepStale().catch(() => {}); }, 30_000);

const PORT = process.env.PORT || 4100;
app.listen(PORT, () => {
  console.log(`\n  Sentinel running on  http://localhost:${PORT}`);
  console.log(`  (API + console served from this single origin)`);
  console.log(`  Razorpay: ${process.env.RAZORPAY_KEY_ID ? 'live-test keys' : 'SIMULATED mode'}`);
  console.log(`  Gemini:   ${process.env.GEMINI_API_KEY ? 'enabled' : 'rules fallback'}\n`);
});
