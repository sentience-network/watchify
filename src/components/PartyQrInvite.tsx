"use client";

import { useMemo, useState } from "react";
import { copyToClipboard } from "@/lib/share";

/**
 * Soft-launch QR for couch seating — phone camera → invite URL.
 * Uses a public QR image API (no npm dep); URL still copyable if image fails.
 */
export function PartyQrInvite({
  inviteUrl,
  compact = false,
}: {
  inviteUrl: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const qrSrc = useMemo(() => {
    if (!inviteUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=${
      compact ? 120 : 160
    }x${compact ? 120 : 160}&margin=8&data=${encodeURIComponent(inviteUrl)}`;
  }, [inviteUrl, compact]);

  if (!inviteUrl) return null;

  async function copy() {
    const ok = await copyToClipboard(inviteUrl);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${
        compact ? "" : "rounded-xl border border-line/70 bg-ink/40 p-3"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrSrc}
        alt="QR code to join this Watchify party"
        width={compact ? 120 : 160}
        height={compact ? 120 : 160}
        className="rounded-lg border border-line bg-white p-1"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal">
          Scan to join
        </p>
        <p className="mt-1 text-xs leading-relaxed text-mist/75">
          Point a phone camera at this code — opens the invite (each person uses
          their own streaming login when it&apos;s an own-account night).
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-2 rounded-lg border border-teal/40 px-2.5 py-1 text-[11px] font-medium text-teal-soft"
        >
          {copied ? "Link copied" : "Copy invite link"}
        </button>
      </div>
    </div>
  );
}
