"use client";

import { useMemo } from "react";
import { getMovie } from "@/lib/movies";
import { copyToClipboard, nativeShare, partyShareUrl } from "@/lib/share";
import { getUser } from "@/lib/users";
import type { WatchParty } from "@/lib/types";
import { ShareMenu } from "./ShareMenu";
import { track } from "@/lib/analytics-client";

export type PartyRecap = {
  party: WatchParty;
  endedAt: string;
  nextStartsAt?: string;
};

/**
 * End-of-party shareable recap: title, who was there, next week?
 */
export function PartyRecapCard({
  recap,
  onClose,
}: {
  recap: PartyRecap;
  onClose: () => void;
}) {
  const movie = getMovie(recap.party.movieId);
  const host = getUser(recap.party.hostId);
  const members = useMemo(() => {
    const ids = Array.from(
      new Set([recap.party.hostId, ...recap.party.memberIds])
    );
    return ids
      .map((id) => getUser(id))
      .filter(Boolean)
      .slice(0, 12);
  }, [recap.party.hostId, recap.party.memberIds]);

  const shareUrl = partyShareUrl(recap.party.id);
  const title = `${recap.party.name} — Watchify recap`;
  const names = members.map((m) => m!.name).join(", ");
  const text = movie
    ? `We watched ${movie.title} together on Watchify. ${names ? `There: ${names}. ` : ""}${
        recap.nextStartsAt
          ? `Next week: ${new Date(recap.nextStartsAt).toLocaleString()}. `
          : "Same time next week? "
      }${shareUrl}`
    : `Watchify party wrap. ${shareUrl}`;

  async function shareNative() {
    const result = await nativeShare({ title, text, url: shareUrl });
    if (result === "unavailable") {
      await copyToClipboard(text);
    }
    track("party_recap_shared", { partyId: recap.party.id });
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/80 p-4 backdrop-blur-sm md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Party recap"
    >
      <div className="w-full max-w-md rounded-2xl border border-teal/40 bg-panel p-5 shadow-2xl animate-fade-up">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal">
          Party recap
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">
          {recap.party.name}
        </h2>
        {movie ? (
          <p className="mt-1 text-sm text-mist">
            {movie.title} ({movie.year})
            {host ? ` · hosted by ${host.name}` : ""}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-mist/70">Who was there</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {members.map((m) => (
            <li
              key={m!.id}
              className="rounded-md border border-line/70 bg-ink/40 px-2 py-0.5 text-xs text-mist"
            >
              {m!.name}
            </li>
          ))}
          {!members.length ? (
            <li className="text-xs text-mist/60">Just you this round.</li>
          ) : null}
        </ul>
        <p className="mt-4 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-amber-soft">
          {recap.nextStartsAt
            ? `Next week? Already scheduled for ${new Date(
                recap.nextStartsAt
              ).toLocaleString()}.`
            : "Same time next week? Share this recap and lock a night."}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-mist/60">
          Shareable wrap-up for friends — chat memories + the title you queued,
          not a paid-app stream recording.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void shareNative()}
            className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink"
          >
            Share recap
          </button>
          <ShareMenu
            compact
            url={shareUrl}
            title={title}
            text={text.replace(shareUrl, "").trim()}
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3 py-2 text-xs text-mist"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
