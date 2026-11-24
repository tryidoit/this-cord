import React from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export default function StatusBanner({ online, wasOffline, onReconnect }) {
  if (online && !wasOffline) return null;

  if (!online) {
    return (
      <div className="fixed left-0 right-0 top-0 z-[60] flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/15 px-4 py-1.5 backdrop-blur">
        <WifiOff className="h-3.5 w-3.5 text-warning" />
        <p className="text-[11px] font-semibold text-warning">Connection lost — you're offline. Reconnecting…</p>
      </div>
    );
  }

  if (wasOffline) {
    return (
      <div className="fixed left-0 right-0 top-0 z-[60] flex items-center justify-center gap-2 border-b border-success/30 bg-success/15 px-4 py-1.5 backdrop-blur">
        <RefreshCw className="h-3.5 w-3.5 text-success" />
        <p className="text-[11px] font-semibold text-success">Back online! Reconnected.</p>
      </div>
    );
  }

  return null;
}