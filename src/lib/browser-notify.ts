/**
 * Optional browser Notifications for soft-launch alerts.
 * Never required — in-app toasts always work.
 */

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showBrowserNotification(
  title: string,
  opts?: { body?: string; tag?: string; url?: string }
) {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return false;
  }
  try {
    const n = new Notification(title, {
      body: opts?.body,
      tag: opts?.tag,
      icon: "/icons/icon-192.svg",
    });
    if (opts?.url) {
      n.onclick = () => {
        window.focus();
        window.location.href = opts.url!;
        n.close();
      };
    }
    return true;
  } catch {
    return false;
  }
}
