import React from "react";
import { X, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReplyBar({ target, onPing, pingEnabled, onTogglePing, onCancel }) {
  if (!target) return null;
  return (
    <div className="flex items-center gap-2 rounded-t-xl border border-border border-b-0 bg-card px-3 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">
          Replying to <span className="font-semibold text-foreground">{target.name || target.username}</span>
        </p>
        <p className="truncate text-[12px] text-muted-foreground">{target.content || "(attachment)"}</p>
      </div>
      <button
        onClick={onTogglePing}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition",
          pingEnabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
        )}
        title={pingEnabled ? "Will ping the user" : "Won't ping the user"}
      >
        {pingEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
        {pingEnabled ? "Ping on" : "Ping off"}
      </button>
      <button
        onClick={onCancel}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}