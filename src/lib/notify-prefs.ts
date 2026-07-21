/**
 * Client-side notification preferences.
 * Browser Notifications are optional; in-app toasts always work unless muted.
 */

export type NotifyMode = "all" | "invites" | "muted";

const KEY = "watchify_notify_prefs_v1";

export type NotifyPrefs = {
  mode: NotifyMode;
  /** User dismissed / answered the permission prompt flow. */
  promptHandled: boolean;
};

const DEFAULTS: NotifyPrefs = {
  mode: "all",
  promptHandled: false,
};

export function loadNotifyPrefs(): NotifyPrefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<NotifyPrefs>;
    const mode =
      parsed.mode === "invites" || parsed.mode === "muted" || parsed.mode === "all"
        ? parsed.mode
        : "all";
    return {
      mode,
      promptHandled: Boolean(parsed.promptHandled),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveNotifyPrefs(prefs: Partial<NotifyPrefs>) {
  if (typeof window === "undefined") return;
  const next = { ...loadNotifyPrefs(), ...prefs };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}

/** Whether in-app toasts / browser alerts of this kind should fire. */
export function notifyAllows(
  kind: "invite" | "live" | "watching" | "reminder",
  prefs?: NotifyPrefs
): boolean {
  const p = prefs || loadNotifyPrefs();
  if (p.mode === "muted") return false;
  if (p.mode === "invites") return kind === "invite" || kind === "reminder";
  return true;
}
