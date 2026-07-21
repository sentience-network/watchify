"use client";

import { useMemo, useState } from "react";
import { ScrubToTimeBanner } from "@/components/ScrubToTimeBanner";
import { track } from "@/lib/analytics-client";
import { formatPlayhead } from "@/lib/deep-links";
import { getPartyRealtime } from "@/lib/party-realtime";
import { rememberOpenedService } from "@/lib/service-prefs";
import { getStreamingService } from "@/lib/streaming";
import type { StreamingServiceId } from "@/lib/streaming";
import type { Movie, PartyPresenceMember, WatchParty } from "@/lib/types";

/**
 * One countdown ritual: Ready board → scrub stamp → Open on [Service] → host Go.
 */
export function OwnAccountSyncRitual({
  party,
  movie,
  positionSec,
  joinCueSec,
  presence,
  currentUserId,
  isHostOrCo,
  preferredDeepLink,
  onGo,
}: {
  party: WatchParty;
  movie: Movie;
  positionSec: number;
  joinCueSec: number;
  presence: PartyPresenceMember[];
  currentUserId: string;
  isHostOrCo: boolean;
  preferredDeepLink: {
    name: string;
    deepLink: string;
    id?: string;
  } | null;
  onGo: () => void;
}) {
  const [step, setStep] = useState<"ready" | "scrub" | "open" | "go">("ready");
  const me = presence.find((p) => p.userId === currentUserId);
  const readyCount = presence.filter((p) => p.readyStatus === "ready").length;
  const scrub = joinCueSec || positionSec || 0;
  const serviceId = (party.serviceId || preferredDeepLink?.id) as
    | StreamingServiceId
    | undefined;
  const serviceName =
    preferredDeepLink?.name ||
    (serviceId ? getStreamingService(serviceId)?.name : null) ||
    "your service";

  const steps = useMemo(
    () => [
      {
        id: "ready" as const,
        label: "Mark Ready",
        done: me?.readyStatus === "ready",
      },
      {
        id: "scrub" as const,
        label: `Scrub to ${formatPlayhead(scrub)}`,
        done: me?.readyStatus === "scrubbed" || me?.readyStatus === "ready",
      },
      {
        id: "open" as const,
        label: `Open on ${serviceName}`,
        done: step === "go" || step === "open",
      },
      { id: "go" as const, label: "Host 3–2–1 Go", done: false },
    ],
    [me?.readyStatus, scrub, serviceName, step]
  );

  function markReady() {
    getPartyRealtime(party.id)?.setReadyStatus("ready");
    track("ready_status", { partyId: party.id, status: "ready" });
    setStep("scrub");
  }

  function markScrubbed() {
    getPartyRealtime(party.id)?.setReadyStatus("scrubbed");
    track("ready_status", { partyId: party.id, status: "scrubbed" });
    track("scrub_opened", { partyId: party.id, source: "sync_ritual" });
    setStep("open");
  }

  return (
    <div className="mt-3 rounded-xl border border-amber/35 bg-amber/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-soft">
        Own-account sync ritual
      </p>
      <p className="mt-1 text-[11px] text-mist/75">
        One flow — Ready → scrub timestamp → open {serviceName} → host Go.
        Watchify never streams paid apps.
      </p>
      <ol className="mt-3 space-y-1.5">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={`flex items-center gap-2 text-xs ${
              s.done || step === s.id ? "text-white" : "text-mist/60"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px]">
              {s.done ? "✓" : i + 1}
            </span>
            {s.label}
            {s.id === "ready" && isHostOrCo ? (
              <span className="text-mist/55">
                · {readyCount}/{presence.length || 0} ready
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={markReady}
          className="rounded-lg bg-teal/20 px-3 py-1.5 text-[11px] font-semibold text-teal-soft"
        >
          I&apos;m Ready
        </button>
        <button
          type="button"
          onClick={markScrubbed}
          className="rounded-lg border border-line px-3 py-1.5 text-[11px] text-mist"
        >
          Scrubbed to {formatPlayhead(scrub)}
        </button>
        {preferredDeepLink ? (
          <a
            href={preferredDeepLink.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (serviceId) rememberOpenedService(serviceId);
              track("scrub_opened", { partyId: party.id, source: "open_service" });
              setStep("go");
            }}
            className="rounded-lg bg-amber px-3 py-1.5 text-[11px] font-semibold text-ink"
          >
            Open on {serviceName}
          </a>
        ) : null}
        {isHostOrCo ? (
          <button
            type="button"
            onClick={() => {
              setStep("go");
              onGo();
            }}
            className="rounded-lg bg-teal px-3 py-1.5 text-[11px] font-semibold text-ink"
          >
            3–2–1 Go
          </button>
        ) : null}
      </div>
      {preferredDeepLink ? (
        <ScrubToTimeBanner
          serviceName={preferredDeepLink.name}
          deepLink={preferredDeepLink.deepLink}
          positionSec={scrub}
          serviceId={serviceId}
        />
      ) : (
        <p className="mt-2 text-[11px] text-mist/65">
          No deep link for this title yet — scrub manually to{" "}
          {formatPlayhead(scrub)} on your app, then host hits Go.
        </p>
      )}
      <p className="mt-2 text-[10px] text-mist/55">
        Playing {movie.title} — each person uses their own login.
      </p>
    </div>
  );
}
