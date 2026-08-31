// Agent toolbelt — the bounded set of tools the recovery agent can call.
//
// Read tools query state; action tools take a bounded step; control tools manage
// the recovery lifecycle. Every state-changing tool writes a timestamped
// AuditEvent, so tool use is fully traceable in the audit trail.

import { prisma, getModel } from '../db.js';
import { createPaymentLink } from './execute.js';
import { reasonLabel } from './rules.js';

const log = (paymentId, decision, action, outcome, detail) =>
  prisma.auditEvent.create({
    data: { paymentId, step: 'tool', decision, action, outcome: outcome || null, detail: detail ? JSON.stringify(detail) : null },
  });

async function must(paymentId) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p) throw new Error(`payment not found: ${paymentId}`);
  return p;
}

export const TOOLS = {
  // ───────────────── read ─────────────────
  async get_customer({ paymentId }) {
    const p = await must(paymentId);
    return { paymentId: p.id, name: p.customerName, email: p.customerEmail };
  },
  async get_payment_status({ paymentId }) {
    const p = await must(paymentId);
    return { status: p.status, retriesUsed: p.retriesUsed, messagesSent: p.messagesSent, recoveredAmount: p.recoveredAmount / 100 };
  },
  async get_invoice({ paymentId }) {
    const p = await must(paymentId);
    return {
      invoiceNo: `INV-${p.id.slice(-6).toUpperCase()}`,
      amount: p.amount / 100,
      currency: 'INR',
      customer: p.customerName,
      status: p.status === 'recovered' ? 'paid' : 'due',
    };
  },
  async get_failed_payment_reason({ paymentId }) {
    const p = await must(paymentId);
    return { failureReason: p.failureReason, label: reasonLabel(p.failureReason), diagnosisClass: p.diagnosisClass, confidence: p.confidence, why: p.diagnosisWhy };
  },
  async get_recovery_history({ paymentId }) {
    const events = await prisma.auditEvent.findMany({ where: { paymentId }, orderBy: { id: 'asc' } });
    return { count: events.length, events: events.map((e) => ({ ts: e.ts, step: e.step, decision: e.decision, outcome: e.outcome })) };
  },

  // ───────────────── actions ─────────────────
  async create_payment_link({ paymentId }) {
    const p = await must(paymentId);
    const link = await createPaymentLink(p);
    await prisma.payment.update({
      where: { id: p.id },
      data: { paymentLinkUrl: link.url, rzpLinkId: link.id || null, rzpLinkStatus: link.real ? 'created' : null },
    });
    await log(p.id, `Tool: create_payment_link → ${link.url}`, 'create_payment_link', link.real ? 'link_created_live' : 'link_created_sim', link);
    return { url: link.url, id: link.id, live: link.real };
  },
  async send_whatsapp({ paymentId, message, to }) {
    const p = await must(paymentId);
    const msg = message || p.recoveryMessageHinglish || p.recoveryMessage || 'Payment reminder';

    // DRY_RUN=true (default) records the send in the audit trail without any
    // external call. DRY_RUN=false + Twilio configured sends a real WhatsApp.
    const dryRun = process.env.DRY_RUN !== 'false';
    const twilioReady = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
    const target = to || process.env.TWILIO_TEST_TO;
    let mode = 'dry-run';
    let outcome = 'sent';

    if (!dryRun && twilioReady && target) {
      try {
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const body = new URLSearchParams({ From: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886', To: target, Body: msg });
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' },
          body,
        });
        mode = r.ok ? 'live' : 'live-failed';
        if (!r.ok) outcome = 'send_failed';
      } catch {
        mode = 'live-failed';
        outcome = 'send_failed';
      }
    }

    await prisma.payment.update({
      where: { id: p.id },
      data: { messagesSent: p.messagesSent + 1, status: ['at_risk', 'diagnosed'].includes(p.status) ? 'link_sent' : p.status },
    });
    const note = mode === 'live' ? 'delivered via Twilio' : mode === 'live-failed' ? 'Twilio send failed' : 'recorded (dry-run, no external send)';
    await log(p.id, `Tool: send_whatsapp → ${note}`, 'send_whatsapp', outcome, { channel: 'whatsapp', mode, to: target || null, message: msg.slice(0, 140) });
    return { sent: outcome === 'sent' || mode === 'live', mode, channel: 'whatsapp', to: target || p.customerEmail };
  },
  async place_call({ paymentId, to }) {
    const p = await must(paymentId);
    const target = to || process.env.DEMO_CALL_TO || process.env.TWILIO_TEST_TO || '';
    // Greet the demo name (e.g. Manvi) when calling the demo number.
    const name = target && target === process.env.DEMO_CALL_TO && process.env.DEMO_CALL_NAME ? process.env.DEMO_CALL_NAME : p.customerName.split(' ')[0];
    const script = `Namaste ${name} ji, Sentinel se call kar rahe hain. Aapka ₹${(p.amount / 100).toLocaleString('en-IN')} ka payment pending hai — kya aap abhi complete karna chahenge? Main aapko secure link bhej deta hoon.`;

    // Real outbound voice call via Twilio only when DRY_RUN=false + voice keys set;
    // otherwise the call is simulated (safe for a live demo).
    const dryRun = process.env.DRY_RUN !== 'false';
    const voiceReady = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_CALLER_ID;
    let mode = 'dry-run';
    let callSid = null;
    let outcome = 'placed';

    if (!dryRun && voiceReady && target) {
      try {
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        // Trial accounts can't pass inline TwiML, so drive the call from a hosted
        // URL (a Twilio TwiML Bin with the Hinglish <Say>). Falls back to Twilio's
        // public demo TwiML so the phone still rings even before a Bin is set up.
        // Upgraded accounts can force inline TwiML with TWILIO_INLINE_TWIML=true.
        const body = new URLSearchParams({ To: target, From: process.env.TWILIO_CALLER_ID });
        if (process.env.TWILIO_INLINE_TWIML === 'true') {
          const esc = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
          body.set('Twiml', `<Response><Say voice="Polly.Aditi" language="hi-IN">${esc(script)}</Say></Response>`);
        } else {
          body.set('Url', process.env.TWILIO_TWIML_URL || 'http://demo.twilio.com/docs/voice.xml');
        }
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls.json`, {
          method: 'POST', headers: { Authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' }, body,
        });
        if (r.ok) { mode = 'live'; callSid = (await r.json()).sid; }
        else { mode = 'live-failed'; outcome = 'call_failed'; }
      } catch {
        mode = 'live-failed'; outcome = 'call_failed';
      }
    }

    await prisma.payment.update({
      where: { id: p.id },
      data: { contactAttempts: p.contactAttempts + 1, status: ['at_risk', 'diagnosed'].includes(p.status) ? 'link_sent' : p.status },
    });
    const note = mode === 'live' ? `real voice call placed via Twilio` : mode === 'live-failed' ? 'voice call failed' : 'voice call simulated (dry-run)';
    await log(p.id, `Tool: place_call → ${note} to ${target || 'customer'}`, 'place_call', outcome, { mode, to: target, callSid, script: script.slice(0, 160) });
    return { placed: mode !== 'live-failed', mode, to: target, callSid, script };
  },
  async retry_payment({ paymentId }) {
    const p = await must(paymentId);
    const model = await getModel();
    const rate = model.successRates[p.chosenAction] ?? 0.4;
    const ok = Math.random() < rate;
    const data = { retriesUsed: p.retriesUsed + 1 };
    if (ok) { data.status = 'recovered'; data.recoveredAmount = p.amount; }
    else if (p.status !== 'recovered') data.status = 'retrying';
    await prisma.payment.update({ where: { id: p.id }, data });
    await log(p.id, `Tool: retry_payment → ${ok ? 'success' : 'failed'} (retry #${p.retriesUsed + 1})`, 'retry_payment', ok ? 'success' : 'failure', { modelledRate: rate });
    return { outcome: ok ? 'success' : 'failure', retriesUsed: p.retriesUsed + 1, recovered: ok };
  },

  // ───────────────── recovery control ─────────────────
  async record_promise_to_pay({ paymentId, date }) {
    const p = await must(paymentId);
    const by = date || new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    await log(p.id, `Tool: record_promise_to_pay → customer promised to pay by ${by}`, 'record_promise_to_pay', 'promise_to_pay', { by });
    return { promised: true, by };
  },
  async stop_recovery({ paymentId, reason }) {
    const p = await must(paymentId);
    const r = reason || 'Recovery stopped by agent';
    await prisma.payment.update({ where: { id: p.id }, data: { status: 'stopped', stopReason: r } });
    await log(p.id, `Tool: stop_recovery → ${r}`, 'stop_recovery', 'stopped', { reason: r });
    return { stopped: true, reason: r };
  },
  async escalate_to_human({ paymentId, note }) {
    const p = await must(paymentId);
    await log(p.id, `Tool: escalate_to_human → routed to human review${note ? ` (${note})` : ''}`, 'escalate_to_human', 'escalated', { note: note || null });
    return { escalated: true, queue: 'human-review' };
  },
};

export async function callTool(name, args) {
  const fn = TOOLS[name];
  if (!fn) throw new Error(`unknown tool: ${name}`);
  return fn(args || {});
}

// Grouped list for the UI toolbelt.
export const TOOL_LIST = [
  { name: 'get_customer', kind: 'read', desc: 'Look up the customer on a payment.' },
  { name: 'get_payment_status', kind: 'read', desc: 'Current status, retries and messages used.' },
  { name: 'get_invoice', kind: 'read', desc: 'Fetch the invoice for this payment.' },
  { name: 'get_failed_payment_reason', kind: 'read', desc: 'Why the payment failed + diagnosis.' },
  { name: 'get_recovery_history', kind: 'read', desc: 'Full audit history for this payment.' },
  { name: 'create_payment_link', kind: 'action', desc: 'Create a Razorpay test-mode payment link.' },
  { name: 'send_whatsapp', kind: 'action', desc: 'Send the recovery message on WhatsApp.' },
  { name: 'place_call', kind: 'action', desc: 'Auto-call the customer (Hinglish voice) with the payment link.' },
  { name: 'retry_payment', kind: 'action', desc: 'Attempt a bounded payment retry.' },
  { name: 'record_promise_to_pay', kind: 'control', desc: 'Log a customer promise-to-pay date.' },
  { name: 'stop_recovery', kind: 'control', desc: 'Stop recovery on this payment.' },
  { name: 'escalate_to_human', kind: 'control', desc: 'Route the case to a human agent.' },
];
