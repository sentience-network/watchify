/** Local + abbreviated timezone for scheduled rooms (friend-visible). */
export function formatScheduledWhen(
  iso: string | null | undefined,
  isLive: boolean
): { primary: string; detail?: string } {
  if (isLive || !iso) return { primary: "Live now" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { primary: "Scheduled" };

  const local = d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  let tz = "";
  try {
    tz =
      new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(d)
        .find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    tz = "";
  }

  const utc = d.toLocaleString("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  return {
    primary: tz ? `${local} ${tz}` : local,
    detail: `Your local time · ${utc}`,
  };
}
