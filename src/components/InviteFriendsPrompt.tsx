"use client";

import { useEffect, useState } from "react";
import { ShareMenu } from "@/components/ShareMenu";

/**
 * After joining/creating a party, push the viral loop: invite two friends.
 * Only shows when `active` — caller passes the exact party just joined/created.
 */
export function InviteFriendsPrompt({
  inviteUrl,
  partyName,
  movieTitle,
  partyId,
  active,
}: {
  inviteUrl: string;
  partyName: string;
  movieTitle: string;
  partyId: string;
  active: boolean;
}) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!active || !partyId) return;
    try {
      const key = `watchify_invite_prompt_${partyId}`;
      if (sessionStorage.getItem(key)) {
        setHidden(true);
        return;
      }
      setHidden(false);
    } catch {
      setHidden(false);
    }
  }, [active, partyId]);

  if (!active || hidden) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(`watchify_invite_prompt_${partyId}`, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  }

  return (
    <div
      className="fixed bottom-20 left-1/2 z-40 w-[min(420px,92vw)] -translate-x-1/2 rounded-2xl border border-teal/40 bg-ink/95 p-4 shadow-xl backdrop-blur md:bottom-8"
      role="dialog"
      aria-label="Invite friends"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-teal">
        Fill the room
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-white">
        Invite 2 friends
      </p>
      <p className="mt-1 text-xs text-mist/80">
        Share the preview link — they see the party first, then sign in to join.{" "}
        {movieTitle} is better with people.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ShareMenu
          url={inviteUrl}
          title={`${partyName} — Watchify`}
          text={`Join my Watchify party for ${movieTitle}`}
          onShared={dismiss}
        />
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-3 py-2 text-xs text-mist hover:text-white"
        >
          Later
        </button>
      </div>
    </div>
  );
}
