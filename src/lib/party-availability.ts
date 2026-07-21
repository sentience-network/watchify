export type PartyAvailabilityStatus = "free" | "solo" | "dnd";

export type PartyAvailability = {
  status: PartyAvailabilityStatus;
  /** ISO — optional window end */
  until?: string | null;
  note?: string;
};

export const AVAILABILITY_LABELS: Record<PartyAvailabilityStatus, string> = {
  free: "Free tonight",
  solo: "Solo night",
  dnd: "Do not disturb",
};

export function parsePartyAvailability(raw: unknown): PartyAvailability {
  if (!raw || typeof raw !== "object") return { status: "solo" };
  const o = raw as Record<string, unknown>;
  const status =
    o.status === "free" || o.status === "solo" || o.status === "dnd"
      ? o.status
      : "solo";
  const until = typeof o.until === "string" ? o.until : null;
  const note = typeof o.note === "string" ? o.note.slice(0, 80) : undefined;
  return { status, until, note };
}

export function availabilityIsActive(a: PartyAvailability, now = Date.now()) {
  if (a.until) {
    const t = Date.parse(a.until);
    if (Number.isFinite(t) && t < now) return false;
  }
  return true;
}

export function availabilityChip(a: PartyAvailability | null | undefined) {
  if (!a || !availabilityIsActive(a)) return null;
  return AVAILABILITY_LABELS[a.status];
}
