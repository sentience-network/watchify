import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import { softKvDelete, softKvGet, softKvSet } from "@/lib/server/soft-kv";
import { findUserById } from "@/lib/server/users-db";
import { sanitizeText } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type TvPair = {
  code: string;
  status: "waiting" | "paired";
  tvSessionId: string;
  phoneUserId?: string;
  phoneName?: string;
  commands: { id: string; type: string; payload?: Record<string, string> }[];
  createdAt: string;
};

function pairKey(code: string) {
  return `tvpair:${code.toUpperCase()}`;
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = sanitizeText(url.searchParams.get("code") || "", 8).toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }
  const pair = await softKvGet<TvPair>(pairKey(code));
  if (!pair) {
    return NextResponse.json({ error: "Code expired or invalid" }, { status: 404 });
  }
  return NextResponse.json({ pair });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = rateLimit(`tvpair:${ip}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: {
    action?: "create" | "claim" | "command";
    code?: string;
    type?: string;
    payload?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "create") {
    const code = makeCode();
    const pair: TvPair = {
      code,
      status: "waiting",
      tvSessionId: `tv_${Math.random().toString(36).slice(2, 10)}`,
      commands: [],
      createdAt: new Date().toISOString(),
    };
    await softKvSet(pairKey(code), pair, 15 * 60_000);
    return NextResponse.json({ pair });
  }

  const code = sanitizeText(body.code || "", 8).toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  if (body.action === "claim") {
    const auth = await requireUserId();
    if ("error" in auth) return auth.error;
    const pair = await softKvGet<TvPair>(pairKey(code));
    if (!pair) {
      return NextResponse.json({ error: "Code expired or invalid" }, { status: 404 });
    }
    const user = await findUserById(auth.userId);
    pair.status = "paired";
    pair.phoneUserId = auth.userId;
    pair.phoneName = user?.name || "Phone";
    await softKvSet(pairKey(code), pair, 15 * 60_000);
    return NextResponse.json({ pair });
  }

  if (body.action === "command") {
    const auth = await requireUserId();
    if ("error" in auth) return auth.error;
    const pair = await softKvGet<TvPair>(pairKey(code));
    if (!pair) {
      return NextResponse.json({ error: "Code expired or invalid" }, { status: 404 });
    }
    if (pair.phoneUserId !== auth.userId) {
      return NextResponse.json({ error: "Not paired to this phone" }, { status: 403 });
    }
    const type = sanitizeText(body.type || "", 40);
    if (!type) {
      return NextResponse.json({ error: "type required" }, { status: 400 });
    }
    const payload: Record<string, string> = {};
    if (body.payload) {
      for (const [k, v] of Object.entries(body.payload)) {
        if (typeof v === "string") payload[sanitizeText(k, 40)] = sanitizeText(v, 120);
      }
    }
    pair.commands = [
      ...(pair.commands || []).slice(-19),
      {
        id: `c_${Math.random().toString(36).slice(2, 8)}`,
        type,
        payload,
      },
    ];
    await softKvSet(pairKey(code), pair, 15 * 60_000);
    return NextResponse.json({ ok: true, pair });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/** Optional cleanup — unused export keeps lint quiet if tree-shaken. */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const code = sanitizeText(url.searchParams.get("code") || "", 8).toUpperCase();
  if (code) await softKvDelete(pairKey(code));
  return NextResponse.json({ ok: true });
}
