import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Watchify watch party";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: { id: string } };

/**
 * Branded 1200×630 invite card. Edge runtime avoids a Windows Node font-path
 * bug in @vercel/og. Page metadata carries the party-specific title/description.
 */
export default async function Image({ params }: Props) {
  let title = "You're invited";
  let subtitle = "Preview the party, then sign in to join";

  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      "http://127.0.0.1:3344";
    const res = await fetch(`${base}/api/share/party/${encodeURIComponent(params.id)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        name?: string;
        movieTitle?: string;
        hostName?: string;
      };
      if (data.name) title = data.name.slice(0, 60);
      if (data.movieTitle) {
        subtitle = `${data.movieTitle}${data.hostName ? ` · ${data.hostName}` : ""}`.slice(
          0,
          90
        );
      }
    }
  } catch {
    /* branded fallback */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0b1220 0%, #12263a 55%, #0e3d3a 100%)",
          color: "#f4f7fb",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", fontSize: 36, color: "#7dd3c7" }}>
          Watchify
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 28, letterSpacing: 3, color: "#7dd3c7" }}>
            WATCH PARTY
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>
            {title}
          </div>
          <div style={{ fontSize: 30, color: "#c5d0db", maxWidth: 1000 }}>
            {subtitle}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#9fb0c0" }}>
          Preview first · then sign in to join
        </div>
      </div>
    ),
    { ...size }
  );
}
