import { prisma } from "./db";

type RateResult = { ok: true } | { ok: false; retryAfterSec: number };

/** In-memory fallback (fast path / when DB briefly unavailable). */
type MemBucket = { count: number; resetAt: number };
const memBuckets = new Map<string, MemBucket>();

function memRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateResult {
  const now = Date.now();
  const existing = memBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  existing.count += 1;
  return { ok: true };
}

/**
 * Soft-launch rate limit: tries durable SQLite bucket, falls back to memory.
 * Use for auth/billing sensitive routes.
 */
export async function rateLimitDurable(
  key: string,
  limit = 20,
  windowMs = 60_000
): Promise<RateResult> {
  const now = new Date();
  try {
    const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });
    if (!existing || existing.resetAt <= now) {
      await prisma.rateLimitBucket.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          resetAt: new Date(now.getTime() + windowMs),
        },
        update: {
          count: 1,
          resetAt: new Date(now.getTime() + windowMs),
        },
      });
      return { ok: true };
    }
    if (existing.count >= limit) {
      return {
        ok: false,
        retryAfterSec: Math.ceil(
          (existing.resetAt.getTime() - now.getTime()) / 1000
        ),
      };
    }
    await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: existing.count + 1 },
    });
    return { ok: true };
  } catch {
    return memRateLimit(key, limit, windowMs);
  }
}

/** Sync in-memory limiter (kept for low-sensitivity routes). */
export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): RateResult {
  return memRateLimit(key, limit, windowMs);
}
