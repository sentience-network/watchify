import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import {
  createFeedPost,
  loadFeedForUser,
} from "@/lib/server/social-db";
import type { ActivityVisibility } from "@/lib/types";
import { rateLimitDurable } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Live Following / Discover activity feed. */
export async function GET(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const tabRaw = url.searchParams.get("tab") || "following";
  const tab = tabRaw === "discover" ? "discover" : "following";
  const take = Number(url.searchParams.get("take") || "60");
  const since = url.searchParams.get("since") || undefined;

  const activities = await loadFeedForUser(auth.userId, tab, {
    take: Number.isFinite(take) ? take : 60,
    since,
  });

  return NextResponse.json({
    tab,
    activities,
    polledAt: new Date().toISOString(),
  });
}

/** Short watch-related post composer. */
export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const limited = await rateLimitDurable(
    `feed-post:${auth.userId}`,
    8,
    10 * 60_000
  );
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: `Too many posts — try again in ${limited.retryAfterSec}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  let body: {
    text?: string;
    movieId?: string | null;
    visibility?: ActivityVisibility;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await createFeedPost(auth.userId, {
    text: body.text || "",
    movieId: body.movieId,
    visibility: body.visibility,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, activity: result.activity });
}
