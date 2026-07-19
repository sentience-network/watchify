"use client";

import { useEffect, useState } from "react";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";

/**
 * Invite Watchify friends into a party via in-app DM (link) + optional copy.
 */
export function InviteFriendsInApp({
  inviteUrl,
  partyName,
  movieTitle,
}: {
  inviteUrl: string;
  partyName: string;
  movieTitle: string;
}) {
  const { state, currentUserId } = useWatchify();
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  useEffect(() => {
    setFriendIds(state.friendIds || []);
  }, [state.friendIds]);

  if (!currentUserId || friendIds.length === 0) {
    return (
      <p className="text-xs text-mist/70">
        Add friends on Watchify to invite them here in one tap — or use Share for social apps.
      </p>
    );
  }

  async function inviteFriend(friendId: string) {
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
      const text = `Join my Watchify party “${partyName}” for ${movieTitle}`;
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
      const friend = getUser(friendId);
      setStatus(`Invite sent to ${friend?.name || "friend"}`);
    } catch {
      setStatus("Network error — try Share instead");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-mist">Invite Watchify friends</p>
      <div className="flex flex-wrap gap-2">
        {friendIds.slice(0, 12).map((id) => {
          const u = getUser(id);
          if (!u) return null;
          return (
            <button
              key={id}
              type="button"
              disabled={busyId === id}
              onClick={() => void inviteFriend(id)}
              className="flex items-center gap-2 rounded-full border border-line bg-panel/60 py-1 pl-1 pr-3 text-xs text-mist hover:border-teal/40 hover:text-white disabled:opacity-50"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-ink"
                style={{ background: `hsl(${u.avatarHue} 70% 55%)` }}
              >
                {u.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              {busyId === id ? "Sending…" : u.name.split(" ")[0]}
            </button>
          );
        })}
      </div>
      {status && <p className="text-[11px] text-teal-soft">{status}</p>}
    </div>
  );
}
