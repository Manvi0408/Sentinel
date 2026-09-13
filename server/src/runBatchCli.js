// CLI: ensure a seeded batch exists, then run the recovery agent over it, then
// disconnect. Used at BUILD time so the deployed snapshot already contains
// recovered data — otherwise Render's ephemeral free tier reverts to a
// seeded-but-unrun DB (₹0 recovered) on every cold start.
import 'dotenv/config';
import { prisma } from './db.js';
import { seedBatch } from './seed.js';
import { runBatch } from './agent/runBatch.js';

const count = Number(process.argv[2]) || 60;

const existing = await prisma.payment.count();
if (existing === 0) {
  const out = await seedBatch(count);
  console.log(`Seeded ${out.count} synthetic at-risk payments.`);
}
await runBatch();
const recovered = await prisma.payment.count({ where: { status: 'recovered' } });
console.log(`Batch run complete — ${recovered} payments recovered.`);
await prisma.$disconnect();
