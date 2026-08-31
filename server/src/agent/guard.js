// Concurrency + idempotency guard.
//
// The database's UNIQUE constraint on RecoveryExecution.idempotencyKey is the
// lock. Exactly one caller can create a row for a given key; every concurrent
// duplicate hits the constraint and reads the already-reserved row instead of
// executing again. This underpins three guarantees:
//   • concurrent webhooks  → 1 winner executes, the rest read cached state
//   • duplicate executor   → a re-dispatch is intercepted before it fires
//   • stale reservation    → a crashed lock is swept & degraded to STOP_AND_ESCALATE

import { prisma } from '../db.js';

export const STALE_MS = 10_000; // a 'reserved' row older than this is treated as a crash

// Try to win the lock for `key`. Returns { won, exec|cached }.
export async function reserve(key, paymentId = 'n/a') {
  try {
    const exec = await prisma.recoveryExecution.create({
      data: { idempotencyKey: key, paymentId, status: 'reserved' },
    });
    return { won: true, exec };
  } catch (e) {
    // Prisma P2002 = unique constraint violation → someone else already holds it.
    const cached = await prisma.recoveryExecution.findUnique({ where: { idempotencyKey: key } });
    return { won: false, cached };
  }
}

// Mark a reservation completed and cache its result.
export async function complete(key, result, status = 'executed') {
  return prisma.recoveryExecution.update({
    where: { idempotencyKey: key },
    data: { status, result: result ? JSON.stringify(result) : null, executedAt: new Date() },
  });
}

// Run an action exactly once for `key`. If we win the lock we run `fn` and cache
// its result; if not, we return the cached result without running.
export async function runOnce(key, paymentId, fn) {
  const res = await reserve(key, paymentId);
  if (!res.won) {
    return { executed: false, cached: true, result: res.cached?.result ? JSON.parse(res.cached.result) : null };
  }
  try {
    const result = await fn();
    await complete(key, result, 'executed');
    return { executed: true, cached: false, result };
  } catch (e) {
    await complete(key, { error: String(e.message || e) }, 'escalated');
    throw e;
  }
}

// Sweep stale 'reserved' locks (e.g. a crash mid-LLM-eval): degrade them to
// STOP_AND_ESCALATE instead of hanging forever.
export async function sweepStale(ttlMs = STALE_MS) {
  const cutoff = new Date(Date.now() - ttlMs);
  const stale = await prisma.recoveryExecution.findMany({ where: { status: 'reserved', reservedAt: { lt: cutoff } } });
  const swept = [];
  for (const s of stale) {
    await prisma.recoveryExecution.update({ where: { id: s.id }, data: { status: 'escalated', result: JSON.stringify({ decision: 'STOP_AND_ESCALATE', reason: 'stale reservation swept' }) } });
    swept.push({ key: s.idempotencyKey, paymentId: s.paymentId, decision: 'STOP_AND_ESCALATE' });
  }
  return swept;
}
