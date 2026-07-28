/** Registers a minimal service worker for installable PWA shell (cache app shell only). */
"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let pollId = 0;

    const onControllerChange = () => {
      // New SW claimed — reload once so clients drop stale shells.
      const key = "watchify-sw-reloaded-v7";
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const onLoad = () => {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          void reg.update();
          pollId = window.setInterval(() => {
            void reg.update();
          }, 60_000);
        })
        .catch(() => undefined);
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);

    return () => {
      if (pollId) window.clearInterval(pollId);
      window.removeEventListener("load", onLoad);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);
  return null;
}
