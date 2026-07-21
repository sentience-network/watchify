import { softKvGet, softKvSet } from "@/lib/server/soft-kv";

export type PushSubscriptionJSON = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | null;
};

type StoredSubs = { subscriptions: PushSubscriptionJSON[] };

function vapidConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function subKey(userId: string) {
  return `push_subs:${userId}`;
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionJSON
) {
  if (!subscription?.endpoint) return { error: "Invalid subscription" };
  const existing = (await softKvGet<StoredSubs>(subKey(userId))) || {
    subscriptions: [],
  };
  const next = [
    subscription,
    ...existing.subscriptions.filter((s) => s.endpoint !== subscription.endpoint),
  ].slice(0, 5);
  await softKvSet(subKey(userId), { subscriptions: next }, 90 * 86_400_000);
  return { ok: true as const };
}

export async function removePushSubscription(userId: string, endpoint: string) {
  const existing = (await softKvGet<StoredSubs>(subKey(userId))) || {
    subscriptions: [],
  };
  await softKvSet(
    subKey(userId),
    {
      subscriptions: existing.subscriptions.filter((s) => s.endpoint !== endpoint),
    },
    90 * 86_400_000
  );
  return { ok: true as const };
}

export async function sendWebPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ sent: number; skipped: string }> {
  if (!vapidConfigured()) {
    return { sent: 0, skipped: "vapid_unset" };
  }
  const stored = await softKvGet<StoredSubs>(subKey(userId));
  if (!stored?.subscriptions?.length) {
    return { sent: 0, skipped: "no_subscription" };
  }

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    let sent = 0;
    const keep: PushSubscriptionJSON[] = [];
    for (const sub of stored.subscriptions) {
      try {
        await webpush.sendNotification(
          sub as import("web-push").PushSubscription,
          JSON.stringify(payload)
        );
        keep.push(sub);
        sent += 1;
      } catch (err) {
        const status =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        // Keep non-gone subscriptions
        if (status !== 404 && status !== 410) keep.push(sub);
      }
    }
    await softKvSet(subKey(userId), { subscriptions: keep }, 90 * 86_400_000);
    return { sent, skipped: sent ? "" : "all_failed" };
  } catch (err) {
    console.error("[watchify:web-push]", err);
    return { sent: 0, skipped: "send_error" };
  }
}
