import { prisma } from "@/lib/db";

function isMissingTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /SoftKv|soft_kv|does not exist|no such table/i.test(msg);
}

export async function softKvGet<T>(key: string): Promise<T | null> {
  try {
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
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new Error(
        "TV pairing storage is not ready (SoftKv). Redeploy so schema push/migrate runs."
      );
    }
    throw error;
  }
}

export async function softKvSet(
  key: string,
  value: unknown,
  ttlMs?: number
) {
  const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : null;
  try {
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
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new Error(
        "TV pairing storage is not ready (SoftKv). Redeploy so schema push/migrate runs."
      );
    }
    throw error;
  }
}

export async function softKvDelete(key: string) {
  await prisma.softKv.delete({ where: { key } }).catch(() => undefined);
}
