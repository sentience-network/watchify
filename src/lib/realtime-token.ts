import { createHmac, timingSafeEqual } from "crypto";

export type RealtimeRoomToken = {
  userId: string;
  partyId: string;
  name: string;
  handle: string;
  exp: number;
};

function secret() {
  return (
    process.env.REALTIME_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-only-watchify-secret-change-me"
  );
}

function b64url(buf: Buffer | string) {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/** Short-lived HMAC room token for Socket.io handshake (no paid keys). */
export function signRealtimeToken(
  payload: Omit<RealtimeRoomToken, "exp">,
  ttlSec = 60 * 60
): string {
  const full: RealtimeRoomToken = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const body = b64url(JSON.stringify(full));
  const sig = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyRealtimeToken(token: string): RealtimeRoomToken | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(createHmac("sha256", secret()).update(body).digest());
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(
      fromB64url(body).toString("utf8")
    ) as RealtimeRoomToken;
    if (!payload.userId || !payload.partyId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function realtimePublicUrl() {
  return (
    process.env.NEXT_PUBLIC_REALTIME_URL ||
    process.env.REALTIME_URL ||
    "http://localhost:3345"
  );
}
