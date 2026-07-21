"use client";

import { useEffect, useMemo, useState } from "react";
import { isFreePlayable } from "@/lib/free-content";
import { getMovie } from "@/lib/movies";
import { copyToClipboard } from "@/lib/share";
import { partyInviteUrl } from "@/lib/social-graph";
import { useWatchify } from "@/lib/store";
import type { WatchParty } from "@/lib/types";
import { track } from "@/lib/analytics-client";
import { PartyQrInvite } from "./PartyQrInvite";

const KEY = "watchify_lobby_checklist_dismissed";

/**
 * Host “Go live” lobby checklist before the room feels open:
 * title → invite → tracker (own-account) → optional video.
 */
export function HostLobbyChecklist({
  party,
  onGoLive,
}: {
  party: WatchParty;
  onGoLive?: () => void;
}) {
  const {
    currentUserId,
    startPartyWatchTracker,
    state,
  } = useWatchify();
  const [inviteCopied, setInviteCopied] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);

  const isHost =
    party.hostId === currentUserId ||
    Boolean(party.coHostIds?.includes(currentUserId));
  const movie = getMovie(party.movieId);
  const sync = state.partyPlaybackSync.find((p) => p.partyId === party.id);
  const mode = party.syncMode || "social";

  useEffect(() => {
    if (!isHost) return;
    try {
      const raw = localStorage.getItem(`${KEY}_${party.id}`);
      setDismissed(Boolean(raw));
    } catch {
      setDismissed(false);
    }
  }, [party.id, isHost]);

  const steps = useMemo(() => {
    const titleOk = Boolean(movie);
    const inviteOk = inviteCopied || party.memberIds.length > 1;
    const trackerOk =
      mode !== "own_account" || Boolean(sync?.watchStartedAt);
    const videoOptional = true;
    return [
      {
        id: "title",
        done: titleOk,
        label: titleOk
          ? `Title: ${movie?.title}`
          : "Confirm the title for tonight",
      },
      {
        id: "invite",
        done: inviteOk,
        label: inviteOk
          ? "Invite ready (copied or friends joined)"
          : "Copy invite link for friends",
      },
      {
        id: "tracker",
        done: trackerOk,
        label:
          mode === "own_account"
            ? trackerOk
              ? "Own-account tracker armed"
              : "Arm the off-site tracker (optional before Go)"
            : mode === "watchify_free"
              ? "Watchify Free sync — no off-site tracker needed"
              : "Social room — chat ready",
        skip: mode === "social",
      },
      {
        id: "video",
        done: videoOptional,
        label: "Optional: open face video when friends arrive",
        optional: true,
      },
    ];
  }, [movie, inviteCopied, party.memberIds.length, mode, sync?.watchStartedAt]);

  if (!isHost || dismissed || party.status !== "open") return null;

  async function copyInvite() {
    const url = partyInviteUrl(party.id, undefined, {
      inviteCode: party.inviteCode,
    });
    const ok = await copyToClipboard(url);
    if (ok) {
      setInviteCopied(true);
      try {
        localStorage.setItem("watchify_invite_copied", "1");
        const n =
          Number(localStorage.getItem("watchify_invite_share_count") || "0") + 1;
        localStorage.setItem("watchify_invite_share_count", String(n));
      } catch {
        /* ignore */
      }
      track("invite_copied", { partyId: party.id, source: "lobby_checklist" });
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(`${KEY}_${party.id}`, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  async function goLive() {
    setBusy(true);
    try {
      if (!party.isLive) {
        const res = await fetch("/api/parties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "go_live", partyId: party.id }),
        });
        if (!res.ok) {
          /* still allow local checklist complete */
        }
      }
      onGoLive?.();
      track("party_go_live", { partyId: party.id });
      dismiss();
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      className="mt-3 rounded-xl border border-teal/40 bg-teal/10 p-3 animate-fade-up"
      aria-label="Host lobby checklist"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal">
            Go live lobby
          </p>
          <p className="mt-0.5 text-xs text-mist/75">
            Quick host checklist before friends pile in. Watchify never streams
            paid apps — own-account nights use sync cues only.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-mist/60 hover:text-white"
        >
          Skip
        </button>
      </div>
      <ul className="mt-3 space-y-1.5">
        {steps.map((s) => (
          <li
            key={s.id}
            className="flex items-start gap-2 text-xs text-mist"
          >
            <span
              className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                s.done
                  ? "bg-teal text-ink"
                  : "border border-line text-mist/50"
              }`}
            >
              {s.done ? "✓" : s.optional ? "·" : ""}
            </span>
            <span className={s.done ? "text-mist/90" : "text-white"}>
              {s.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyInvite()}
          className="rounded-lg border border-teal/40 px-3 py-1.5 text-xs font-medium text-teal-soft"
        >
          {inviteCopied ? "Invite copied" : "Copy invite"}
        </button>
        {mode === "own_account" && !sync?.watchStartedAt ? (
          <button
            type="button"
            onClick={() => startPartyWatchTracker(party.id, 0)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
          >
            Arm tracker
          </button>
        ) : null}
        {isFreePlayable(movie) ? (
          <span className="rounded-lg bg-panel/60 px-3 py-1.5 text-xs text-mist/70">
            Free title ready
          </span>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void goLive()}
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
        >
          {party.isLive ? "Ready — hide checklist" : "Go live"}
        </button>
      </div>
      <div className="mt-3">
        <PartyQrInvite
          inviteUrl={partyInviteUrl(party.id, undefined, {
            inviteCode: party.inviteCode,
          })}
          compact
        />
      </div>
    </aside>
  );
}
