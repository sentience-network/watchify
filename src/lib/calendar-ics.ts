import type { WatchParty } from "./types";

/** Escape text for iCalendar TEXT values. */
function icsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcsUtc(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Build a minimal .ics for a scheduled Watchify party (no paid-stream claims).
 */
export function buildPartyIcs(opts: {
  party: WatchParty;
  movieTitle: string;
  url: string;
  durationMinutes?: number;
}): string {
  const { party, movieTitle, url } = opts;
  const startIso = party.startsAt || new Date().toISOString();
  const durationMs = (opts.durationMinutes || 120) * 60_000;
  const endIso = new Date(new Date(startIso).getTime() + durationMs).toISOString();
  const uid = `${party.id}@watchify.app`;
  const stamp = toIcsUtc(new Date().toISOString());
  const summary = icsText(`${party.name} — ${movieTitle}`);
  const description = icsText(
    `Watchify party for ${movieTitle}. Chat + sync cues on Watchify — each person uses their own streaming account when needed.\n\nJoin: ${url}`
  );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Watchify//Party//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsUtc(startIso)}`,
    `DTEND:${toIcsUtc(endIso)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadPartyIcs(opts: {
  party: WatchParty;
  movieTitle: string;
  url: string;
  durationMinutes?: number;
}) {
  const body = buildPartyIcs(opts);
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `watchify-${opts.party.id.slice(0, 8)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}

/** Google Calendar template link (opens in browser). */
export function googleCalendarUrl(opts: {
  party: WatchParty;
  movieTitle: string;
  url: string;
  durationMinutes?: number;
}) {
  const startIso = opts.party.startsAt || new Date().toISOString();
  const durationMs = (opts.durationMinutes || 120) * 60_000;
  const endIso = new Date(new Date(startIso).getTime() + durationMs).toISOString();
  const dates = `${toIcsUtc(startIso)}/${toIcsUtc(endIso)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${opts.party.name} — ${opts.movieTitle}`,
    dates,
    details: `Watchify party. Join: ${opts.url}`,
    location: opts.url,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
