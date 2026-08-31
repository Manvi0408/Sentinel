// Adversarial test suite — proves the concurrency & idempotency guarantees
// against the real reservation-lock guard (guard.js) and a real SQLite DB.
//
//   node src/tests/adversarial.js                       # run all
//   node src/tests/adversarial.js concurrent-webhooks   # run one
//
// Scenarios:
//   🏎️  concurrent-webhooks — 10 identical webhooks at once → exactly 1 executes, 9 read cached
//   🧟 stale-reservation    — a crashed lock is swept & degraded to STOP_AND_ESCALATE
//   👯 duplicate-executor    — a re-dispatch is intercepted by the DB PK constraint

import 'dotenv/config';
import { prisma } from '../db.js';
import { reserve, runOnce, sweepStale, STALE_MS } from '../agent/guard.js';

const uid = () => Math.random().toString(36).slice(2, 10);
const ok = (cond, msg) => {
  console.log(`   ${cond ? '✅ PASS' : '❌ FAIL'} — ${msg}`);
  return cond;
};
const cleanup = (prefix) => prisma.recoveryExecution.deleteMany({ where: { idempotencyKey: { startsWith: prefix } } });

async function concurrentWebhooks() {
  console.log('\n🏎️  concurrent-webhooks');
  const key = `test:webhook:${uid()}`;
  let sideEffects = 0;
  // 10 identical webhooks racing for the same key, "at the exact same millisecond".
  const results = await Promise.all(
    Array.from({ length: 10 }, () => runOnce(key, 'pay_test', async () => { sideEffects += 1; return { recovered: true }; })),
  );
  const won = results.filter((r) => r.executed).length;
  const cached = results.filter((r) => r.cached).length;
  const rows = await prisma.recoveryExecution.count({ where: { idempotencyKey: key } });
  const pass = [
    ok(won === 1, `exactly 1 thread won the lock and executed (won=${won})`),
    ok(cached === 9, `the other 9 gracefully read cached state (cached=${cached})`),
    ok(sideEffects === 1, `the recovery side-effect ran exactly once (ran=${sideEffects})`),
    ok(rows === 1, 'exactly 1 execution row exists in the DB'),
  ].every(Boolean);
  await cleanup(key);
  return pass;
}

async function staleReservation() {
  console.log('\n🧟 stale-reservation');
  const key = `test:stale:${uid()}`;
  await reserve(key, 'pay_test'); // reserved — imagine the process crashes mid-LLM-eval
  await prisma.recoveryExecution.update({ where: { idempotencyKey: key }, data: { reservedAt: new Date(Date.now() - STALE_MS - 5000) } });
  const swept = await sweepStale();
  const mine = swept.find((s) => s.key === key);
  const row = await prisma.recoveryExecution.findUnique({ where: { idempotencyKey: key } });
  const pass = [
    ok(!!mine, 'the abandoned lock was swept'),
    ok(mine?.decision === 'STOP_AND_ESCALATE', 'it safely degraded to STOP_AND_ESCALATE'),
    ok(row?.status === 'escalated', 'the reservation is resolved, not hanging infinitely'),
  ].every(Boolean);
  await cleanup(key);
  return pass;
}

async function duplicateExecutor() {
  console.log('\n👯 duplicate-executor');
  const key = `test:dispatch:${uid()}`;
  const first = await reserve(key, 'pay_test'); // wins → would physically dispatch
  const second = await reserve(key, 'pay_test'); // network-drop retry → must be intercepted
  const rows = await prisma.recoveryExecution.count({ where: { idempotencyKey: key } });
  const pass = [
    ok(first.won === true, 'the first dispatch acquired the PK lock'),
    ok(second.won === false, 'the duplicate dispatch was intercepted before firing'),
    ok(rows === 1, 'the DB PK constraint kept exactly 1 execution row'),
  ].every(Boolean);
  await cleanup(key);
  return pass;
}

const SCENARIOS = {
  'concurrent-webhooks': concurrentWebhooks,
  'stale-reservation': staleReservation,
  'duplicate-executor': duplicateExecutor,
};

const which = process.argv[2];
const toRun = which && SCENARIOS[which] ? [SCENARIOS[which]] : Object.values(SCENARIOS);

let allPass = true;
for (const fn of toRun) allPass = (await fn()) && allPass;
console.log(`\n${allPass ? '✅ ALL SCENARIOS PASSED' : '❌ SOME SCENARIOS FAILED'}\n`);
await prisma.$disconnect();
process.exit(allPass ? 0 : 1);
