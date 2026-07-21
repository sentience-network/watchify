"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppToast = {
  id: string;
  title: string;
  body?: string;
  href?: string;
  cta?: string;
};

type ToastCtx = {
  toasts: AppToast[];
  pushToast: (toast: Omit<AppToast, "id"> & { id?: string }) => void;
  dismissToast: (id: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AppToast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<AppToast, "id"> & { id?: string }) => {
      const id = toast.id || `t_${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        return [...prev.slice(-4), { ...toast, id }];
      });
      window.setTimeout(() => dismissToast(id), 9000);
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({ toasts, pushToast, dismissToast }),
    [toasts, pushToast, dismissToast]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-[calc(10rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[60] flex w-[min(420px,92vw)] -translate-x-1/2 flex-col gap-2 md:bottom-32"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-2xl border border-teal/40 bg-ink/95 p-3 shadow-xl backdrop-blur animate-fade-up"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-white">
                  {t.title}
                </p>
                {t.body ? (
                  <p className="mt-0.5 text-xs text-mist/80">{t.body}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="shrink-0 text-xs text-mist/60 hover:text-white"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
            {t.href ? (
              <Link
                href={t.href}
                onClick={() => dismissToast(t.id)}
                className="mt-2 inline-flex rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
              >
                {t.cta || "Open"}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToasts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToasts requires ToastProvider");
  return ctx;
}
