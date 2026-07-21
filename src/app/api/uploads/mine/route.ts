import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadCatalogId } from "@/lib/server/uploads-db";

export const dynamic = "force-dynamic";

/** Submitter view of upload queue SLA (pending / live / rejected). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const rows = await prisma.userUpload.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    uploads: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      catalogId: r.status === "approved" ? uploadCatalogId(r.id) : undefined,
      flagReasons: (() => {
        try {
          return JSON.parse(r.flagReasonsJson) as string[];
        } catch {
          return [];
        }
      })(),
    })),
  });
}
