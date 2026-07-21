import type { WatchParty } from "@/lib/types";

const prefix = "watchify_party_snap_";

/** Snapshot open parties you're in so joiners can show a recap after End. */
export function rememberPartySnapshot(party: WatchParty) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${prefix}${party.id}`, JSON.stringify(party));
  } catch {
    /* ignore */
  }
}

export function readPartySnapshot(partyId: string): WatchParty | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${prefix}${partyId}`);
    if (!raw) return null;
    return JSON.parse(raw) as WatchParty;
  } catch {
    return null;
  }
}

export function clearPartySnapshot(partyId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(`${prefix}${partyId}`);
  } catch {
    /* ignore */
  }
}
