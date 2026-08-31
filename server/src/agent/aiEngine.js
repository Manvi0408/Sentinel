// Effective-AI resolver.
//
// A key can be present but unusable (e.g. Anthropic with no credits). To avoid
// making a failing call on every one of ~60 payments, we probe once at startup
// and cache the engine that actually works: anthropic → gemini → rules.

import { anthropicAnalyze } from './anthropic.js';
import { geminiAnalyze } from './gemini.js';
import { rulesAnalyze } from './rules.js';

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

// Diagnose one payment with the effective engine (with safe fallbacks).
export async function analyze(payment) {
  const eng = await getEffectiveEngine();
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
