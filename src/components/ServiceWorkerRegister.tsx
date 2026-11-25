"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable (PWA) —
// required for the Play Store TWA wrapper. Silent failure: if the
// browser does not support it, the app works exactly as before.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
