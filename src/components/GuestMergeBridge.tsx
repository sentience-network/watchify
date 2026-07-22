"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

const GUEST_UID_KEY = "watchify_guest_uid";

/** After OAuth / full sign-in, claim a prior guest session stored in sessionStorage. */
export function GuestMergeBridge() {
  const { data: session, status, update } = useSession();
  const busy = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    if (session.user.isGuest || session.user.email?.endsWith("@guest.watchify.local")) {
      return;
    }
    let guestId = "";
    try {
      guestId = sessionStorage.getItem(GUEST_UID_KEY) || "";
    } catch {
      return;
    }
    if (!guestId || !guestId.startsWith("g_") || guestId === session.user.id) {
      return;
    }
    if (busy.current) return;
    busy.current = true;
    void fetch("/api/auth/guest-convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "claim", guestId }),
    })
      .then(async (res) => {
        try {
          sessionStorage.removeItem(GUEST_UID_KEY);
          sessionStorage.removeItem("watchify_guest_convert");
        } catch {
          /* ignore */
        }
        if (res.ok) {
          await update();
        }
      })
      .finally(() => {
        busy.current = false;
      });
  }, [session?.user?.id, session?.user?.isGuest, session?.user?.email, status, update]);

  return null;
}

export function rememberGuestUid(userId: string) {
  try {
    if (userId.startsWith("g_")) {
      sessionStorage.setItem(GUEST_UID_KEY, userId);
    }
  } catch {
    /* ignore */
  }
}

export function clearGuestUid() {
  try {
    sessionStorage.removeItem(GUEST_UID_KEY);
  } catch {
    /* ignore */
  }
}
