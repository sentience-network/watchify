"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import { UploadQueueStatus } from "@/components/UploadQueueStatus";
import { UPLOAD_MAX_SIZE_BYTES } from "@/lib/upload-moderation";

export default function UploadPage() {
  const { data: session, status } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [mimeHint, setMimeHint] = useState("");
  const [sizeBytes, setSizeBytes] = useState<number | "">("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setLastId(null);
    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        sourceUrl,
        mimeHint: mimeHint || undefined,
        sizeBytes: sizeBytes === "" ? undefined : Number(sizeBytes),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Upload failed");
      return;
    }
    setMsg(
      data.upload?.status === "approved"
        ? "Approved — your video is live in the community shelf."
        : data.upload?.status === "quarantined"
          ? "Flagged for review — it won’t appear publicly until a moderator clears it."
          : "Submitted — pending a quick safety review."
    );
    setLastId(data.upload?.catalogId || null);
    setTitle("");
    setDescription("");
    setSourceUrl("");
  }

  if (status === "loading") {
    return (
      <AppShell>
        <p className="text-mist">Loading…</p>
      </AppShell>
    );
  }

  if (!session?.user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg py-12 text-center">
          <h1 className="font-display text-2xl font-bold text-white">
            Post a legal video
          </h1>
          <p className="mt-2 text-sm text-mist">
            Sign in to submit Creative Commons, public-domain, or your own
            rights-cleared videos.
          </p>
          <Link
            href="/auth/signin"
            className="mt-6 inline-block rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink"
          >
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-lg pb-10">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal">
          Community uploads
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          Post your legal video
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-mist/80">
          Soft launch accepts HTTPS links (YouTube unlisted, Archive.org, direct
          mp4/webm) — not Netflix rips. Keyword + MIME/size checks block obvious
          porn and illegal content; flagged items go to the mod queue. Binary
          hosting on our servers is a later phase.
        </p>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-6 space-y-4 rounded-2xl border border-line bg-panel/40 p-4"
        >
          <label className="block text-xs font-medium text-mist/70">
            Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-ink/50 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
            />
          </label>
          <label className="block text-xs font-medium text-mist/70">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-line bg-ink/50 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
            />
          </label>
          <label className="block text-xs font-medium text-mist/70">
            Playback URL (https)
            <input
              required
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1.5 w-full rounded-xl border border-line bg-ink/50 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-mist/70">
              MIME (optional)
              <input
                value={mimeHint}
                onChange={(e) => setMimeHint(e.target.value)}
                placeholder="video/mp4"
                className="mt-1.5 w-full rounded-xl border border-line bg-ink/50 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
              />
            </label>
            <label className="block text-xs font-medium text-mist/70">
              Size bytes (optional, max{" "}
              {Math.round(UPLOAD_MAX_SIZE_BYTES / (1024 * 1024))} MB)
              <input
                type="number"
                min={0}
                value={sizeBytes}
                onChange={(e) =>
                  setSizeBytes(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="mt-1.5 w-full rounded-xl border border-line bg-ink/50 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {busy ? "Checking…" : "Submit for safety check"}
          </button>
        </form>

        {msg ? (
          <p className="mt-4 text-sm text-mist" role="status">
            {msg}{" "}
            {lastId ? (
              <Link
                href={`/watch/${lastId}`}
                className="text-teal-soft hover:underline"
              >
                Open title
              </Link>
            ) : null}
          </p>
        ) : null}

        <UploadQueueStatus />

        <p className="mt-6 text-xs text-mist/55">
          By submitting you confirm you have rights to share this media and it
          is not porn, CSAM, or pirated licensed streamer content. See{" "}
          <Link href="/content" className="text-teal-soft hover:underline">
            Content & licensing
          </Link>{" "}
          and{" "}
          <Link href="/safety" className="text-teal-soft hover:underline">
            Safety
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
