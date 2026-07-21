"use client";

import { useState } from "react";
import {
  TIMESTAMP_LIMIT_COPY,
  formatPlayhead,
} from "@/lib/deep-links";
import { copyToClipboard } from "@/lib/share";
import type { MovieProvider } from "@/lib/types";

type Props = {
  serviceName: string;
  deepLink: string;
  positionSec: number;
  /** When true, show stronger free-player messaging instead */
  freeSync?: boolean;
};

/** Honest scrub helper for paid streamers that can't seek via URL. */
export function ScrubToTimeBanner({
  serviceName,
  deepLink,
  positionSec,
  freeSync,
}: Props) {
  const [copied, setCopied] = useState(false);
  const stamp = formatPlayhead(positionSec);

  if (freeSync) return null;

  async function copyStamp() {
    const ok = await copyToClipboard(stamp);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-amber/30 bg-amber/10 p-3 text-xs leading-relaxed text-mist">
      <p className="font-medium text-amber-soft">Sync playhead · {stamp}</p>
      <p className="mt-1 text-mist/75">{TIMESTAMP_LIMIT_COPY}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-teal/20 px-3 py-1.5 font-semibold text-teal-soft hover:bg-teal/30"
        >
          Open on {serviceName}
        </a>
        <button
          type="button"
          onClick={() => void copyStamp()}
          className="rounded-lg border border-line px-3 py-1.5 text-mist hover:text-white"
        >
          {copied ? "Timestamp copied" : `Copy scrub to ${stamp}`}
        </button>
      </div>
    </div>
  );
}

type ProviderLinksProps = {
  providers: MovieProvider[];
  label?: string;
  /** stream → "On Netflix"; rent → "Rent on Amazon"; buy → "Buy on …" */
  mode?: "stream" | "rent" | "buy";
};

export function ProviderDeepLinks({
  providers,
  label,
  mode = "stream",
}: ProviderLinksProps) {
  if (!providers.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {label && (
        <span className="w-full text-[11px] uppercase tracking-wider text-mist/55">
          {label}
        </span>
      )}
      {providers.map((p) => {
        const prefix =
          mode === "rent" ? "Rent on" : mode === "buy" ? "Buy on" : "On";
        return (
          <a
            key={`${mode}-${p.id}`}
            href={p.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className={
              mode === "stream"
                ? "rounded-lg border border-line bg-panel/60 px-2.5 py-1 text-xs text-mist hover:border-teal/40 hover:text-teal-soft"
                : "rounded-lg border border-teal/35 bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal-soft hover:bg-teal/20"
            }
            title={
              p.titleSpecific
                ? `Open ${p.name} title page`
                : `${prefix} ${p.name}`
            }
          >
            {prefix} {p.name}
          </a>
        );
      })}
    </div>
  );
}
