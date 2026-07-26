import { NextResponse } from "next/server";
import {
  LIVE_CATEGORY_LABELS,
  listLiveChannels,
  type LiveCategory,
} from "@/lib/live-tv";

export const dynamic = "force-dynamic";

function parseCategory(raw: string | null): LiveCategory | "all" {
  if (
    raw === "news" ||
    raw === "science" ||
    raw === "lifestyle" ||
    raw === "public"
  ) {
    return raw;
  }
  return "all";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = parseCategory(searchParams.get("category"));
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  let channels = listLiveChannels(category);
  if (q) {
    channels = channels.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.overview.toLowerCase().includes(q) ||
        c.genres.some((g) => g.toLowerCase().includes(q)) ||
        LIVE_CATEGORY_LABELS[c.liveCategory].toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    channels,
    total: channels.length,
    category,
    categories: Object.entries(LIVE_CATEGORY_LABELS).map(([id, label]) => ({
      id,
      label,
    })),
    note:
      "Free legal live TV from public broadcasters and openly published linear streams. Not cable or paid IPTV.",
  });
}
