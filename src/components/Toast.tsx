"use client";

import { useEffect, useState } from "react";

type ToastItem = { id: number; text: string };

let nextId = 1;

/** Show a short confirmation toast anywhere in the app. */
export function showToast(text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<string>("actorverse-toast", { detail: text }),
  );
}

/** Renders toasts sent via showToast(). Mounted once in the root layout. */
export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const text = (e as CustomEvent<string>).detail;
      if (!text) return;
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-2), { id, text }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    }
    window.addEventListener("actorverse-toast", onToast);
    return () => window.removeEventListener("actorverse-toast", onToast);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast" role="status">
          <span className="toast-check" aria-hidden="true">✓</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
