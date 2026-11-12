"use client";

import { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { getSocket } from "../lib/socket";

export default function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      try {
        const socket = getSocket();
        if (socket && !socket.connected) socket.connect();
      } catch {}
      window.dispatchEvent(new CustomEvent("app:resumed"));
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        try {
          const socket = getSocket();
          if (socket && !socket.connected) socket.connect();
        } catch {}
        window.dispatchEvent(new CustomEvent("app:resumed"));
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      style={{
        background: "#b45309",
        color: "#ffffff",
        padding: "8px 16px",
        fontSize: "12px",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        zIndex: 9999,
        flexShrink: 0,
      }}
    >
      <WifiOff size={14} />
      <span>You are offline. Drafts are saved locally and will sync automatically when reconnected.</span>
      <RefreshCw size={13} className="animate-spin" />
    </div>
  );
}
