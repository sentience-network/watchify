type EventProperties = Record<string, string | number | boolean | null>;

function sessionId() {
  const key = "watchify_analytics_session";
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem(key, value);
  }
  return value;
}

/** Content-free, provider-neutral funnel event. PostHog may be added only after consent. */
export function track(name: string, properties?: EventProperties) {
  if (typeof window === "undefined") return;
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, properties, sessionId: sessionId() }),
    keepalive: true,
  }).catch(() => undefined);
}
