import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { pitchMetrics } from "@/lib/server/analytics";
import { isStaffRole } from "@/lib/roles";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Moderator or admin access required" }, { status: 403 });
  }
  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86_400_000);
  const { counts, metrics, roomsCreated, roomsMulti } = await pitchMetrics(since);
  const format = url.searchParams.get("format");

  if (format === "csv" || format === "json") {
    const exportPayload = {
      days,
      since: since.toISOString(),
      generatedAt: new Date().toISOString(),
      pitchMetrics: metrics,
      roomsCreated,
      roomsMulti,
      counts,
    };
    if (format === "json") {
      return NextResponse.json(exportPayload, {
        headers: {
          "Content-Disposition": `attachment; filename="watchify-pitch-metrics-${days}d.json"`,
        },
      });
    }
    const lines = [
      "metric,value,target,hit,numerator,denominator,note",
      `invite_to_join_pct,${metrics.inviteToJoin.valuePct},${metrics.inviteToJoin.targetPct},${metrics.inviteToJoin.hit},${metrics.inviteToJoin.numerator},${metrics.inviteToJoin.denominator},"${metrics.inviteToJoin.note}"`,
      `rooms_multi_pct,${metrics.roomsMulti.valuePct},${metrics.roomsMulti.targetPct},${metrics.roomsMulti.hit},${metrics.roomsMulti.numerator},${metrics.roomsMulti.denominator},"${metrics.roomsMulti.note}"`,
      `d1_return_pct,${metrics.d1Return.valuePct},${metrics.d1Return.targetPct},${metrics.d1Return.hit},${metrics.d1Return.numerator},${metrics.d1Return.denominator},"${metrics.d1Return.note}"`,
      `invite_depth_max,${metrics.inviteDepth.value},${metrics.inviteDepth.target},${metrics.inviteDepth.hit},,,"${metrics.inviteDepth.note}"`,
      "",
      "event,count",
      ...Object.entries(counts).map(([k, v]) => `${k},${v}`),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="watchify-pitch-metrics-${days}d.csv"`,
      },
    });
  }

  return NextResponse.json({
    days,
    counts,
    pitch: metrics,
    roomsCreated,
    roomsMulti,
    targetsDoc: "docs/LAUNCH_2_WEEKS.md",
  });
}
