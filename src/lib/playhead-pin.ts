import { formatPlayhead } from "./deep-links";

const PREFIX = "📌 ";

/** Encode a playhead pin for party chat (durable message text). */
export function encodePlayheadPin(positionSec: number, note?: string) {
  const stamp = formatPlayhead(Math.max(0, Math.round(positionSec)));
  const clean = (note || "").replace(/\s+/g, " ").trim().slice(0, 120);
  return clean ? `${PREFIX}${stamp} — ${clean}` : `${PREFIX}${stamp}`;
}

export function parsePlayheadPin(text: string): {
  positionSec: number;
  stamp: string;
  note: string;
} | null {
  if (!text.startsWith(PREFIX)) return null;
  const rest = text.slice(PREFIX.length);
  const m = rest.match(/^(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*[—-]\s*(.*))?$/);
  if (!m) return null;
  const stamp = m[1];
  const note = (m[2] || "").trim();
  const parts = stamp.split(":").map((n) => Number(n));
  let positionSec = 0;
  if (parts.length === 3) {
    positionSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    positionSec = parts[0] * 60 + parts[1];
  } else return null;
  if (!Number.isFinite(positionSec)) return null;
  return { positionSec, stamp, note };
}

export function isPlayheadPin(text: string) {
  return Boolean(parsePlayheadPin(text));
}
