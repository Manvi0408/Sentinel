// Gemini layer — diagnosis + action choice + recovery copy.
//
// When GEMINI_API_KEY is set, Sentinel asks Google Gemini to classify the
// failure, choose the bounded action, and write both an English and a Hinglish
// recovery message. If the key is missing OR the call fails/returns junk, we
// return null and the caller falls back to the deterministic rules engine.
// This keeps the AI in the loop without ever making the app depend on it.

import { CLASSES, CLASS_TO_ACTION, FAILURE_REASONS } from '../config.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

export function geminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

const VALID_ACTIONS = new Set(Object.values(CLASS_TO_ACTION));

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
- action must be one of: smart_retry (transient/gateway), delayed_retry (insufficient funds), update_card_link (expired/bad card — NEVER retry), represent_mandate (mandate failure), recovery_link (abandoned checkout)
- Choose the action that matches the class. Bad/expired cards must use update_card_link, never a retry.
- confidence is 0..1.
- messages: warm, concise, one or two sentences. English + a natural Hinglish (Roman-script Hindi) version.

Respond with ONLY a JSON object, no markdown:
{"class":"...","confidence":0.0,"why":"one sentence","action":"...","message":"...","messageHinglish":"..."}`;
}

// Free-form Hinglish reply for the landing voice widget. Given the customer's
// spoken line (and a short history), returns a short spoken Hinglish reply.
export async function geminiChat(userText, history = []) {
  if (!geminiEnabled()) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const sys = `You are Sentinel, a warm, polite Indian payment-recovery voice agent on a call with a customer whose ₹12,499 payment failed (insufficient funds). Talk like a real, fluent native Hindi speaker from India — natural, respectful ("aap", "ji"), short (ONE or TWO sentences). You can offer to send a secure payment link, tell the pending amount (₹12,499), reschedule a reminder, or answer simply.
Return ONLY strict JSON with two fields:
{"display":"<your reply in HINGLISH — Hindi words in Roman/Latin script mixed naturally with English>","speak":"<the EXACT SAME reply written in proper Devanagari (Hindi) script, numbers spelled naturally>"}
No extra text, no markdown.`;
  const convo = history.slice(-6).map((m) => `${m.who === 'agent' ? 'Agent' : 'Customer'}: ${m.text}`).join('\n');
  const prompt = `${sys}\n\n${convo ? convo + '\n' : ''}Customer: ${userText}\nAgent JSON:`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1024, responseMimeType: 'application/json' } }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    try {
      const j = JSON.parse(text);
      const display = String(j.display || j.speak || '').slice(0, 300);
      const speak = String(j.speak || j.display || '').slice(0, 300);
      return display ? { display, speak } : null;
    } catch {
      const t = text.trim().replace(/^["']|["']$/g, '').slice(0, 300);
      return t ? { display: t, speak: t } : null;
    }
  } catch {
    return null;
  }
}

export async function geminiAnalyze(payment) {
  if (!geminiEnabled()) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(payment) }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);

    // Validate — never trust the model blindly for a money decision.
    if (!CLASSES.includes(parsed.class)) return null;
    // Force the action to match the class (guardrail against the model retrying a dead card).
    const action = CLASS_TO_ACTION[parsed.class];
    if (!VALID_ACTIONS.has(action)) return null;

    return {
      class: parsed.class,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7)),
      why: String(parsed.why || '').slice(0, 400),
      action,
      message: String(parsed.message || '').slice(0, 600),
      messageHinglish: String(parsed.messageHinglish || '').slice(0, 600),
      source: 'gemini',
    };
  } catch {
    return null; // any failure -> rules fallback
  }
}
