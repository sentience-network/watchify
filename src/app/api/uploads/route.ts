import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createUserUpload, listApprovedUploadMovies } from "@/lib/server/uploads-db";
import { sanitizeText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET() {
  const movies = await listApprovedUploadMovies(24);
  return NextResponse.json({ movies });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const limited = rateLimit(`upload:${session.user.id}`, 8, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Upload rate limited — try again later" },
      { status: 429 }
    );
  }

  const contentType = req.headers.get("content-type") || "";
  let title = "";
  let description = "";
  let sourceUrl = "";
  let mimeHint = "";
  let sizeBytes: number | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    title = String(form.get("title") || "");
    description = String(form.get("description") || "");
    sourceUrl = String(form.get("sourceUrl") || "");
    mimeHint = String(form.get("mimeHint") || "");
    const sizeRaw = form.get("sizeBytes");
    if (sizeRaw != null && String(sizeRaw) !== "") {
      sizeBytes = Number(sizeRaw);
    }
    // Soft launch: we do not persist binary blobs on Render's ephemeral disk.
    // Clients may send file metadata for MIME/size checks alongside a host URL.
    const file = form.get("file");
    if (file && typeof file === "object" && "type" in file) {
      const f = file as File;
      if (f.size > 0 && !sourceUrl) {
        return NextResponse.json(
          {
            error:
              "Binary hosting is not enabled yet. Host your legal video (YouTube unlisted, Archive.org, or HTTPS mp4) and paste the URL.",
          },
          { status: 400 }
        );
      }
      if (!mimeHint && f.type) mimeHint = f.type;
      if (sizeBytes == null && f.size) sizeBytes = f.size;
    }
  } else {
    let body: {
      title?: string;
      description?: string;
      sourceUrl?: string;
      mimeHint?: string;
      sizeBytes?: number;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    title = body.title || "";
    description = body.description || "";
    sourceUrl = body.sourceUrl || "";
    mimeHint = body.mimeHint || "";
    sizeBytes = body.sizeBytes ?? null;
  }

  const result = await createUserUpload({
    ownerId: session.user.id,
    title: sanitizeText(title, 120),
    description: sanitizeText(description, 2000),
    sourceUrl: sanitizeText(sourceUrl, 2000),
    mimeHint: sanitizeText(mimeHint, 80),
    sizeBytes,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error, flags: "flags" in result ? result.flags : undefined },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}
