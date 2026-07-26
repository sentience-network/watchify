import { NextResponse } from "next/server";
import { isAllowlistedHlsUrl } from "@/lib/live-tv";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy for allowlisted public HLS playlists/segments.
 * Used when a CDN blocks browser Origin/CORS; never open-proxy.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  if (!target || !isAllowlistedHlsUrl(target)) {
    return NextResponse.json(
      { error: "URL not allowlisted for live HLS proxy" },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: {
        Accept: "*/*",
        // Avoid forwarding our Origin so Akamai edge keys that 403 on Origin still work.
        "User-Agent": "WatchifyLiveTV/1.0",
      },
      cache: "no-store",
      redirect: "follow",
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream live stream unreachable" },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status}` },
      { status: 502 }
    );
  }

  const contentType =
    upstream.headers.get("content-type") || "application/vnd.apple.mpegurl";
  const body = Buffer.from(await upstream.arrayBuffer());

  // Rewrite absolute playlist URIs that point at allowlisted hosts through the proxy
  // so segment fetches stay same-origin when needed.
  const isPlaylist =
    contentType.includes("mpegurl") ||
    contentType.includes("m3u8") ||
    target.includes(".m3u8");

  if (isPlaylist) {
    const text = body.toString("utf8");
    const base = new URL(target);
    const rewritten = text
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          // Rewrite URI="..." attributes in EXT-X tags when present
          if (trimmed.includes("URI=\"")) {
            return trimmed.replace(/URI="([^"]+)"/g, (_m, uri: string) => {
              const abs = resolveAgainst(base, uri);
              if (!abs || !isAllowlistedHlsUrl(abs)) return `URI="${uri}"`;
              return `URI="${proxyUrl(req, abs)}"`;
            });
          }
          return line;
        }
        const abs = resolveAgainst(base, trimmed);
        if (!abs || !isAllowlistedHlsUrl(abs)) return line;
        return proxyUrl(req, abs);
      })
      .join("\n");

    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function resolveAgainst(base: URL, ref: string): string | null {
  try {
    return new URL(ref, base).toString();
  } catch {
    return null;
  }
}

function proxyUrl(req: Request, absolute: string): string {
  const origin = new URL(req.url).origin;
  return `${origin}/api/live/hls?url=${encodeURIComponent(absolute)}`;
}
