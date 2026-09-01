// Effective-AI resolver.
//
// A key can be present but unusable (e.g. Anthropic with no credits). To avoid
// making a failing call on every one of ~60 payments, we probe once at startup
// and cache the engine that actually works: anthropic → gemini → rules.

import { anthropicAnalyze } from './anthropic.js';
import { geminiAnalyze } from './gemini.js';
import { rulesAnalyze } from './rules.js';
import { classifySource } from '../config.js';

let effective = null; // resolved once, then cached
let resolving = null;

async function probe() {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 4, messages: [{ role: 'user', content: 'ping' }] }),
      });
      if (r.ok) return 'anthropic';
    } catch {
      /* fall through */
    }
  }
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return 'rules';
}

export async function getEffectiveEngine() {
  if (effective) return effective;
  if (!resolving) resolving = probe().then((e) => (effective = e));
  return resolving;
}

// Cost & latency gate (opt-in via LLM_GATE=exact). At Razorpay scale, running a
// heavy LLM prompt on every failed payment is expensive and slow. When the gate
// is on, an unambiguous failure — one that matched a known Razorpay reason
// verbatim — is diagnosed by the zero-cost rules engine and never touches the
// LLM; only the ambiguous long tail (keyword/heuristic matches, unseen reasons)
// spends an LLM call. Default OFF, so the full-batch demo still shows the LLM
// diagnosing every case.
function gateAllowsRules(payment) {
  if (process.env.LLM_GATE !== 'exact') return false;
  return classifySource({ code: payment.errorCode, step: payment.errorStep, reason: payment.failureReason }) === 'exact';
}

// Diagnose one payment with the effective engine (with safe fallbacks).
export async function analyze(payment) {
  const eng = await getEffectiveEngine();
  // Cheap, deterministic path for unambiguous failures — skip the LLM entirely.
  if (gateAllowsRules(payment)) return { ...rulesAnalyze(payment), gatedByRules: true };
  if (eng === 'anthropic') {
    const r = await anthropicAnalyze(payment);
    if (r) return r;
  }
  if (eng === 'anthropic' || eng === 'gemini') {
    const r = await geminiAnalyze(payment);
    if (r) return r;
  }
  return rulesAnalyze(payment);
}
