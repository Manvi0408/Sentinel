// CLI: seed a fresh synthetic batch, then disconnect.
import 'dotenv/config';
import { prisma } from './db.js';
import { seedBatch } from './seed.js';

const count = Number(process.argv[2]) || 60;
const out = await seedBatch(count);
console.log(`Seeded ${out.count} synthetic at-risk payments.`);
await prisma.$disconnect();
