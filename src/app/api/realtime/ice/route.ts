import { NextResponse } from "next/server";
import { openRelayTurnEnabled } from "@/lib/features";
import { requireUserId } from "@/lib/server/session";

type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

async function meteredIceServers(): Promise<IceServer[] | null> {
  const domain = process.env.METERED_DOMAIN?.replace(/^https?:\/\//, "").replace(
    /\/$/,
    ""
  );
  const apiKey = process.env.METERED_TURN_API_KEY;
  if (!domain || !apiKey) return null;
  try {
    const res = await fetch(
      `https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as IceServer[];
    return Array.isArray(data) && data.length ? data : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const metered = await meteredIceServers();
  if (metered) {
    return NextResponse.json({
      iceServers: metered,
      turnConfigured: true,
      provider: "metered",
    });
  }

  const iceServers: IceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  if (process.env.TURN_URL && process.env.TURN_USER && process.env.TURN_PASS) {
    iceServers.push({
      urls: [
        process.env.TURN_URL,
        `${process.env.TURN_URL}?transport=tcp`,
        "turn:global.relay.metered.ca:443",
        "turns:global.relay.metered.ca:443?transport=tcp",
      ],
      username: process.env.TURN_USER,
      credential: process.env.TURN_PASS,
    });
  } else if (openRelayTurnEnabled()) {
    // Public Open Relay credentials for local/NAT soft-launch (replace with your TURN in prod).
    iceServers.push({
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    });
  }

  return NextResponse.json({
    iceServers,
    turnConfigured: iceServers.length > 1,
    provider: iceServers.length > 1 ? "static" : "stun-only",
  });
}
