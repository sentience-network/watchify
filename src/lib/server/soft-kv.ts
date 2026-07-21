import { prisma } from "@/lib/db";

export async function softKvGet<T>(key: string): Promise<T | null> {
  const row = await prisma.softKv.findUnique({ where: { key } });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < new Date()) {
    await prisma.softKv.delete({ where: { key } }).catch(() => undefined);
    return null;
  }
  try {
    return JSON.parse(row.valueJson) as T;
  } catch {
    return null;
  }
}

export async function softKvSet(
  key: string,
  value: unknown,
  ttlMs?: number
) {
  const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : null;
  await prisma.softKv.upsert({
    where: { key },
    create: {
      key,
      valueJson: JSON.stringify(value),
      expiresAt,
    },
    update: {
      valueJson: JSON.stringify(value),
      expiresAt,
    },
  });
}

export async function softKvDelete(key: string) {
  await prisma.softKv.delete({ where: { key } }).catch(() => undefined);
}
