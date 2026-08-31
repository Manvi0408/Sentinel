// Prisma client + settings helpers.
// Settings (stopping rules and model constants) live in the Setting table as JSON
// so they can be edited from the UI and survive restarts.

import { PrismaClient } from '@prisma/client';
import { DEFAULT_RULES, DEFAULT_MODEL } from './config.js';

export const prisma = new PrismaClient();

// Read a JSON setting, seeding it with a default the first time it is requested.
export async function getSetting(key, fallback) {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) {
    await prisma.setting.create({ data: { key, value: JSON.stringify(fallback) } });
    return fallback;
  }
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export async function setSetting(key, value) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
  return value;
}

export const getRules = () => getSetting('rules', DEFAULT_RULES);
export const getModel = () => getSetting('model', DEFAULT_MODEL);
