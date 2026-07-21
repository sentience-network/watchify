"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/** Register web push when VAPID is configured (server reminders when phone closed). */
export function PushReminderOptIn() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    void fetch("/api/push/subscribe")
      .then((r) => r.json())
      .then((d) => setPublicKey(d.publicKey || null))
      .catch(() => undefined);
  }, [session?.user]);

  if (!session?.user || !publicKey) return null;

  async function enable() {
    setStatus(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("This browser doesn’t support web push.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("Notifications blocked — enable in browser settings.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey!),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) {
        setStatus("Could not save push subscription");
        return;
      }
      setStatus("Push reminders on — T−24h / T−1h / live even if the tab is closed.");
    } catch {
      setStatus("Push setup failed — email reminders still work if Resend/SMTP is set.");
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-ink/30 p-3">
      <p className="text-xs font-medium text-white">Phone-closed reminders</p>
      <p className="mt-1 text-[11px] text-mist/70">
        Optional web push (VAPID). Email reminders also fire when Resend/SMTP is
        configured.
      </p>
      <button
        type="button"
        onClick={() => void enable()}
        className="mt-2 rounded-lg bg-teal/20 px-3 py-1.5 text-[11px] font-semibold text-teal-soft"
      >
        Enable push reminders
      </button>
      {status ? (
        <p className="mt-2 text-[11px] text-mist/80" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
