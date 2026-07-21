"use client";

import { useEffect, useState } from "react";
import { formatPlayhead } from "@/lib/deep-links";
import { copyToClipboard } from "@/lib/share";

const KEY = "watchify_caught_up";

/**
 * Late-joiner catch-up — big scrub panel + “I’m caught up”.
 */
export function PartyCatchUpHero({
  partyId,
  scrubSec,
  serviceName,
  deepLink,
  watchStartedAt,
}: {
  partyId: string;
  scrubSec: number;
  serviceName?: string | null;
  deepLink?: string | null;
  watchStartedAt?: string | null;
}) {
  const [hidden, setHidden] = useState(true);
  const [copied, setCopied] = useState(false);
  const stamp = formatPlayhead(scrubSec);

  useEffect(() => {
    if (!watchStartedAt || scrubSec < 20) {
      setHidden(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(`${KEY}_${partyId}`);
      setHidden(Boolean(raw));
    } catch {
      setHidden(false);
    }
  }, [partyId, watchStartedAt, scrubSec]);

  if (hidden || !watchStartedAt || scrubSec < 20) return null;

  async function copyScrub() {
    const text = `Scrub to ${stamp}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  function caughtUp() {
    try {
      sessionStorage.setItem(`${KEY}_${partyId}`, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  }

  return (
    <div
      className="mt-3 rounded-2xl border border-amber/50 bg-gradient-to-br from-amber/20 to-ink/60 p-4 animate-fade-up"
      role="status"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-soft">
        Late joiner · catch up
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-white md:text-3xl">
        Scrub to {stamp}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-mist/75">
        The party already started. Open the title on your own service, scrub to
        this time, then tap I&apos;m caught up. Watchify never streams paid apps.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {deepLink && serviceName ? (
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink"
          >
            Open on {serviceName}
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => void copyScrub()}
          className="rounded-lg border border-amber/40 px-3 py-2 text-xs font-medium text-amber-soft"
        >
          {copied ? "Copied" : `Copy scrub to ${stamp}`}
        </button>
        <button
          type="button"
          onClick={caughtUp}
          className="rounded-lg bg-amber px-3 py-2 text-xs font-semibold text-ink"
        >
          I&apos;m caught up
        </button>
      </div>
    </div>
  );
}
