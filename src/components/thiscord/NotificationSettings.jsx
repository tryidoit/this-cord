import React, { useState } from "react";
import { Bell, BellOff, BellRing, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MUTE_DURATIONS = [
  { label: "15 minutes", ms: 15 * 60 * 1000 },
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "8 hours", ms: 8 * 60 * 60 * 1000 },
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "Until I turn it back on", ms: null },
];

const LEVELS = [
  { value: "all", label: "All messages", icon: Bell },
  { value: "mentions", label: "Only @mentions", icon: BellRing },
  { value: "none", label: "Nothing", icon: BellOff },
];

export default function NotificationSettings({ open, onClose, target, targetType, currentPrefs, onUpdate }) {
  const [showMuteMenu, setShowMuteMenu] = useState(false);

  if (!open || !target) return null;

  const targetId = targetType === "channel" ? target.id : target.id;
  const scope = targetType === "channel" ? "channels" : "servers";
  const currentLevel = currentPrefs?.[scope]?.[targetId] || "all";
  const mutedKey = targetType === "channel" ? "muted_channels" : "muted_servers";
  const mutedUntil = currentPrefs?.[mutedKey]?.[targetId];
  const isMuted = mutedUntil === "forever" || (mutedUntil && new Date(mutedUntil).getTime() > Date.now());

  const setLevel = (level) => {
    const current = currentPrefs || {};
    const scopeMap = { ...(current[scope] || {}) };
    if (level === "all") {
      delete scopeMap[targetId];
    } else {
      scopeMap[targetId] = level;
    }
    onUpdate({ [scope]: scopeMap });
  };

  const setMute = (ms) => {
    const current = currentPrefs || {};
    const muteMap = { ...(current[mutedKey] || {}) };
    if (ms === null) {
      muteMap[targetId] = "forever";
    } else {
      muteMap[targetId] = new Date(Date.now() + ms).toISOString();
    }
    onUpdate({ [mutedKey]: muteMap });
    setShowMuteMenu(false);
  };

  const unmute = () => {
    const current = currentPrefs || {};
    const muteMap = { ...(current[mutedKey] || {}) };
    delete muteMap[targetId];
    onUpdate({ [mutedKey]: muteMap });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-[14px] font-bold text-foreground">
            Notification Settings
          </h3>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <p className="mb-3 text-[12px] text-muted-foreground">
            {targetType === "channel" ? `#${target.name}` : target.name}
          </p>

          {/* Notification level */}
          <div className="space-y-1">
            {LEVELS.map((lvl) => {
              const Icon = lvl.icon;
              return (
                <button
                  key={lvl.value}
                  onClick={() => setLevel(lvl.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition",
                    currentLevel === lvl.value ? "bg-primary/15" : "hover:bg-muted"
                  )}
                >
                  <Icon className={cn("h-4 w-4", currentLevel === lvl.value ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-[13px] text-foreground">{lvl.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mute */}
          <div className="mt-4 border-t border-border pt-3">
            {isMuted ? (
              <button
                onClick={unmute}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-muted"
              >
                <BellOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] text-foreground">Unmute notifications</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowMuteMenu(!showMuteMenu)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-muted"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] text-foreground">Mute for…</span>
                </button>
                {showMuteMenu && (
                  <div className="mt-1 space-y-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
                    {MUTE_DURATIONS.map((d) => (
                      <button
                        key={d.label}
                        onClick={() => setMute(d.ms)}
                        className="block w-full rounded-md px-3 py-1.5 text-left text-[12px] text-foreground transition hover:bg-muted"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}