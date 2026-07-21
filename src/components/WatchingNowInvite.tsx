"use client";

import { useState } from "react";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";
import { getMovie } from "@/lib/movies";

/**
 * From the party room: invite friends who are publicly watching now.
 */
export function WatchingNowInvite({
  inviteUrl,
  partyName,
  movieTitle,
}: {
  inviteUrl: string;
  partyName: string;
  movieTitle: string;
}) {
  const { publicWatching, state, currentUserId } = useWatchify();
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const candidates = publicWatching.filter(
    (row) =>
      row.userId !== currentUserId &&
      (row.isFriend || state.friendIds.includes(row.userId))
  );

  if (!currentUserId || candidates.length === 0) return null;

  async function invite(friendId: string) {
    setBusyId(friendId);
    setStatus(null);
    try {
      const open = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      const opened = await open.json();
      if (!open.ok) {
        setStatus(opened.error || "Could not open chat");
        return;
      }
      const friend = getUser(friendId);
      const watching = getMovie(
        publicWatching.find((r) => r.userId === friendId)?.movieId || ""
      );
      const text = watching
        ? `Saw you’re on ${watching.title} — jump into my Watchify party “${partyName}” for ${movieTitle}?`
        : `Join my Watchify party “${partyName}” for ${movieTitle}`;
      const send = await fetch(`/api/messages/${opened.conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, linkUrl: inviteUrl }),
      });
      const sent = await send.json();
      if (!send.ok) {
        setStatus(sent.error || "Could not send invite");
        return;
      }
      setStatus(`Invite sent to ${friend?.name || "friend"}`);
    } catch {
      setStatus("Network error — try Share instead");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-line/70 bg-ink/30 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal">
        Watching now → this party
      </p>
      <p className="mt-1 text-[11px] text-mist/70">
        Friends already sharing what they&apos;re watching — nudge them into
        tonight&apos;s room.
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {candidates.slice(0, 8).map((row) => {
          const u = getUser(row.userId);
          const m = getMovie(row.movieId);
          if (!u) return null;
          return (
            <li key={row.userId}>
              <button
                type="button"
                disabled={busyId === row.userId}
                onClick={() => void invite(row.userId)}
                className="rounded-lg border border-teal/35 bg-teal/10 px-2.5 py-1.5 text-left text-[11px] text-teal-soft disabled:opacity-50"
              >
                <span className="font-semibold text-white">{u.name}</span>
                {m ? (
                  <span className="mt-0.5 block text-mist/65">
                    on {m.title} · Invite
                  </span>
                ) : (
                  <span className="mt-0.5 block text-mist/65">Invite</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {status ? (
        <p className="mt-2 text-[11px] text-mist/80" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
