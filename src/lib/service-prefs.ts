/**
 * Client prefs for which streamer you last opened from Watchify.
 * Not OAuth — just remembers which deep-link home you prefer next time.
 */

import type { StreamingServiceId } from "./streaming";
import { isStreamingServiceId } from "./streaming";

const KEY = "watchify_service_prefs_v1";

export type ServicePrefs = {
  /** Last streamer deep-linked from a title page / party. */
  lastOpenedServiceId: StreamingServiceId | null;
};

const DEFAULTS: ServicePrefs = {
  lastOpenedServiceId: null,
};

export function loadServicePrefs(): ServicePrefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<ServicePrefs>;
    const id = parsed.lastOpenedServiceId;
    return {
      lastOpenedServiceId:
        typeof id === "string" && isStreamingServiceId(id) ? id : null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function rememberOpenedService(serviceId: StreamingServiceId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ lastOpenedServiceId: serviceId } satisfies ServicePrefs)
    );
  } catch {
    /* quota */
  }
}

/**
 * Sort stream offers so Linked + last-opened services come first.
 * Does not invent providers — only reorders what TMDB/catalog already returned.
 */
export function prioritizeLinkedProviders<T extends { id: string }>(
  providers: T[],
  linkedServices: StreamingServiceId[],
  lastOpened?: StreamingServiceId | null
): T[] {
  if (!providers.length) return providers;
  const linked = new Set(linkedServices);
  const rank = (id: string) => {
    if (lastOpened && id === lastOpened) return 0;
    if (linked.has(id as StreamingServiceId)) return 1;
    return 2;
  };
  return [...providers].sort((a, b) => rank(a.id) - rank(b.id));
}
