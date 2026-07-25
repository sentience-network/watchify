"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useWatchify } from "@/lib/store";
import { getMovie } from "@/lib/movies";
import type { ActivityVisibility } from "@/lib/types";

const MAX = 180;

type Props = {
  onPosted?: () => void;
};

export function FeedComposer({ onPosted }: Props) {
  const { state, currentUserId } = useWatchify();
  const [text, setText] = useState("");
  const [visibility, setVisibility] =
    useState<ActivityVisibility>("friends");
  const [attachTitle, setAttachTitle] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const watchingId = state.currentlyWatchingId;
  const watching = watchingId ? getMovie(watchingId) : undefined;

  useEffect(() => {
    if (!ok) return;
    const t = window.setTimeout(() => setOk(false), 2200);
    return () => window.clearTimeout(t);
  }, [ok]);

  if (!currentUserId) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setError("Say a little more (2+ characters).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          movieId: attachTitle && watchingId ? watchingId : null,
          visibility,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not post.");
        return;
      }
      setText("");
      setOk(true);
      onPosted?.();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-2xl border border-line bg-panel/60 p-4 animate-fade-up"
    >
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-mist/70">
          Share a watch moment
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX))}
          rows={2}
          maxLength={MAX}
          placeholder={
            watching
              ? `Just started ${watching.title}…`
              : "Just finished something great…"
          }
          className="mt-2 w-full resize-none rounded-xl border border-line bg-stage/80 px-3 py-2.5 text-sm text-white placeholder:text-mist/40 focus:border-teal/40 focus:outline-none"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-mist/80">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="radio"
              name="feed-vis"
              checked={visibility === "friends"}
              onChange={() => setVisibility("friends")}
              className="accent-teal"
            />
            Following
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="radio"
              name="feed-vis"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
              className="accent-teal"
            />
            Discover
          </label>
          {watching && (
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={attachTitle}
                onChange={(e) => setAttachTitle(e.target.checked)}
                className="accent-teal"
              />
              Tag {watching.title}
            </label>
          )}
          <span className="tabular-nums text-mist/50">
            {text.length}/{MAX}
          </span>
        </div>
        <button
          type="submit"
          disabled={busy || text.trim().length < 2}
          className="rounded-lg bg-teal px-4 py-1.5 text-xs font-semibold text-ink hover:bg-teal-soft disabled:opacity-40"
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-amber-soft">{error}</p>}
      {ok && (
        <p className="mt-2 text-xs text-teal-soft animate-fade-up">
          Posted to the live feed.
        </p>
      )}
    </form>
  );
}
