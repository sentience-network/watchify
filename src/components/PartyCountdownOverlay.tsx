"use client";

import { formatPlayhead } from "@/lib/deep-links";

/**
 * Full-room 3–2–1 overlay for own-account sync nights.
 */
export function PartyCountdownOverlay({
  count,
  scrubSec,
}: {
  count: number;
  scrubSec: number;
}) {
  if (count <= 0) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-ink/85 backdrop-blur-md"
      role="status"
      aria-live="assertive"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
        Ready?
      </p>
      <p
        key={count}
        className="mt-2 font-display text-[7rem] font-bold leading-none text-white animate-fade-up md:text-[9rem]"
      >
        {count}
      </p>
      <p className="mt-4 text-sm text-mist/80">Press play on your own app</p>
      <p className="mt-2 rounded-xl border border-teal/40 bg-teal/15 px-4 py-2 font-display text-2xl font-semibold text-teal-soft">
        Scrub to {formatPlayhead(scrubSec)}
      </p>
      <p className="mt-3 max-w-xs text-center text-[11px] text-mist/55">
        Watchify does not stream Netflix or other paid apps — each person uses
        their own account; we only sync the cue.
      </p>
    </div>
  );
}
