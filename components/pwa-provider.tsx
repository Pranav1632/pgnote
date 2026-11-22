"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator !== "undefined") {
      return !navigator.onLine;
    }
    return false;
  });

  useEffect(() => {
    // 1. Service Worker registration
    if (
      "serviceWorker" in navigator &&
      (window.location.protocol === "https:" || window.location.hostname === "localhost")
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener("statechange", () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New content available
                }
              });
            }
          });
        })
        .catch(() => {
          // SW registration failed silently
        });
    }

    // 2. Offline / Online event listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {isOffline && (
        <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/90 px-3 py-1.5 font-mono text-xs text-amber-300 shadow-xl backdrop-blur-md">
          <WifiOff className="h-3.5 w-3.5 text-amber-400" />
          <span>OFFLINE - Running in local cache mode</span>
        </div>
      )}
      {children}
    </>
  );
}
