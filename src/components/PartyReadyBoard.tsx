"use client";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import { getPartyRealtime } from "@/lib/party-realtime";
import type { PartyPresenceMember, PartyReadyStatus, User } from "@/lib/types";
import { partyUserLabel } from "@/lib/users";

const STATUSES: { id: PartyReadyStatus; label: string }[] = [
  { id: "opened", label: "Opened app" },
  { id: "scrubbed", label: "Scrubbed" },
  { id: "ready", label: "Ready" },
];

function statusRank(s: PartyReadyStatus | null | undefined) {
  if (s === "ready") return 3;
  if (s === "scrubbed") return 2;
  if (s === "opened") return 1;
  return 0;
}

function lightClass(s: PartyReadyStatus | null | undefined) {
  if (s === "ready") return "bg-teal shadow-[0_0_8px_rgba(45,212,191,0.55)]";
  if (s === "scrubbed") return "bg-amber";
  if (s === "opened") return "bg-sky-400";
  return "bg-mist/25";
}

/**
 * Joiner check-in board — host sees green lights before Go.
 */
export function PartyReadyBoard({
  partyId,
  presence,
  currentUserId,
  directoryUsers,
  isHostOrCo,
}: {
  partyId: string;
  presence: PartyPresenceMember[];
  currentUserId: string;
  directoryUsers: User[];
  isHostOrCo: boolean;
}) {
  const me = presence.find((p) => p.userId === currentUserId);
  const readyCount = presence.filter((p) => p.readyStatus === "ready").length;
  const allReady =
    presence.length > 0 && presence.every((p) => p.readyStatus === "ready");

  function setStatus(status: PartyReadyStatus) {
    getPartyRealtime(partyId)?.setReadyStatus(status);
  }

  return (
    <div className="mt-3 rounded-xl border border-teal/30 bg-teal/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal">
            Ready board
          </p>
          <p className="mt-0.5 text-[11px] text-mist/70">
            {isHostOrCo
              ? allReady
                ? "Everyone is ready — hit Go when you are."
                : `${readyCount}/${presence.length || 0} ready`
              : "Tell the host where you are — Opened app → Scrubbed → Ready."}
          </p>
        </div>
      </div>

      {!isHostOrCo || me ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = me?.readyStatus === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  active
                    ? "bg-teal text-ink"
                    : "border border-line text-mist hover:border-teal/40 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {presence.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {[...presence]
            .sort(
              (a, b) => statusRank(b.readyStatus) - statusRank(a.readyStatus)
            )
            .map((m) => {
              const label = partyUserLabel(m.userId, directoryUsers, m);
              const user = directoryUsers.find((u) => u.id === m.userId);
              return (
                <li
                  key={m.userId}
                  className="flex items-center justify-between gap-2 text-xs text-mist"
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${lightClass(
                        m.readyStatus
                      )}`}
                      title={m.readyStatus || "not set"}
                    />
                    {user ? (
                      <ProfileAvatar
                        name={user.name}
                        hue={user.avatarHue}
                        avatarUrl={user.avatarUrl}
                        frame={user.avatarFrame}
                        ringColor={user.accentColor || "#2dd4bf"}
                        size="sm"
                      />
                    ) : null}
                    <span className="truncate text-white">
                      {label.name}
                      {m.userId === currentUserId ? " (you)" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-mist/55">
                    {m.readyStatus === "ready"
                      ? "Ready"
                      : m.readyStatus === "scrubbed"
                        ? "Scrubbed"
                        : m.readyStatus === "opened"
                          ? "Opened app"
                          : "—"}
                  </span>
                </li>
              );
            })}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-mist/60">
          Waiting for friends to come online…
        </p>
      )}
    </div>
  );
}
