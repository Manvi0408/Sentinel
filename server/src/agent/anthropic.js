// Anthropic (Claude) layer — preferred AI when ANTHROPIC_API_KEY is set.
//
// Same contract as the Gemini layer: classify the failure, choose the bounded
// action, and write the English + Hinglish recovery copy. Returns null when the
// key is missing or the call fails, so the caller falls back to Gemini or the
// deterministic rules engine.

import { CLASSES, CLASS_TO_ACTION, FAILURE_REASONS } from '../config.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const VALID_ACTIONS = new Set(Object.values(CLASS_TO_ACTION));

export function anthropicEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function buildPrompt(payment) {
  const amt = `₹${(payment.amount / 100).toLocaleString('en-IN')}`;
  return `You are Sentinel, a revenue-recovery agent for the Indian merchant "Acme Store".
A payment failed. Classify it, choose ONE bounded recovery action, and write two short customer messages.

Payment:
- amount: ${amt}
- customer: ${payment.customerName}
- Razorpay error code: ${payment.errorCode || 'n/a'}
- Razorpay failed step: ${payment.errorStep || 'n/a'}
- Razorpay error reason: ${payment.failureReason} (${FAILURE_REASONS[payment.failureReason] || 'interpret from the reason/code/step above'})

Rules:
- class must be one of: ${CLASSES.join(', ')}
- action must match the class: smart_retry (transient/gateway), delayed_retry (insufficient funds), update_card_link (expired/bad card — NEVER retry), represent_mandate (mandate failure), recovery_link (abandoned checkout)
- confidence is 0..1.
- messages: warm, concise, one or two sentences. English + a natural Hinglish (Roman-script Hindi) version.

Respond with ONLY a JSON object, no markdown, no prose:
{"class":"...","confidence":0.0,"why":"one sentence","action":"...","message":"...","messageHinglish":"..."}`;
}

export async function anthropicAnalyze(payment) {
  if (!anthropicEnabled()) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: 'user', content: buildPrompt(payment) }],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    let text = data?.content?.[0]?.text || '';
    // strip accidental code fences
    text = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    if (!CLASSES.includes(parsed.class)) return null;
    const action = CLASS_TO_ACTION[parsed.class]; // force action to match class (guardrail)
    if (!VALID_ACTIONS.has(action)) return null;

    return {
      class: parsed.class,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7)),
      why: String(parsed.why || '').slice(0, 400),
      action,
      message: String(parsed.message || '').slice(0, 600),
      messageHinglish: String(parsed.messageHinglish || '').slice(0, 600),
      source: 'anthropic',
    };
  } catch {
    return null;
  }
}
