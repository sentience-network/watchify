"use client";

import Link from "next/link";
import { useState } from "react";
import {
  partyServiceMismatch,
  serviceLabel,
} from "@/lib/service-access";
import { getMovie } from "@/lib/movies";
import type { WatchParty } from "@/lib/types";
import type { StreamingServiceId } from "@/lib/streaming";

export function ServiceMismatchBanner({
  party,
  linkedServices,
  onLink,
}: {
  party: Pick<WatchParty, "syncMode" | "serviceId" | "movieId">;
  linkedServices: StreamingServiceId[];
  onLink?: () => void;
}) {
  const movie = getMovie(party.movieId);
  const check = partyServiceMismatch({ party, linkedServices, movie });
  const [dismissed, setDismissed] = useState(false);

  if (!check.mismatch || !check.message || dismissed) return null;

  return (
    <div
      className="mb-3 rounded-xl border border-amber/35 bg-amber/10 px-3 py-2.5 text-xs leading-relaxed text-mist"
      role="status"
    >
      <p className="font-medium text-amber-soft">
        Service mismatch
        {check.hostService ? ` · ${serviceLabel(check.hostService)}` : ""}
      </p>
      <p className="mt-1 text-mist/80">{check.message}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href="/settings"
          onClick={onLink}
          className="rounded-lg bg-teal/20 px-2.5 py-1 font-semibold text-teal-soft"
        >
          Link services
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg border border-line px-2.5 py-1 text-mist hover:text-white"
        >
          Join anyway
        </button>
      </div>
    </div>
  );
}
