import React, { useState } from "react";
import { X, Mic, Volume2, Keyboard, Sparkles, Crown } from "lucide-react";
import { getVoiceEffects } from "@/lib/voiceEffects";
import { cn } from "@/lib/utils";

export default function VoiceSettingsPanel({
  voiceEffect,
  pushToTalkKey,
  inputDevices,
  outputDevices,
  selectedInput,
  selectedOutput,
  inputVolume,
  isPrioritySpeaker,
  onChangeVoiceEffect,
  onChangeInputDevice,
  onChangeOutputDevice,
  onChangeInputVolume,
  onSetPushToTalkKey,
  onTogglePrioritySpeaker,
  onClose,
}) {
  const [capturingKey, setCapturingKey] = useState(false);
  const effects = getVoiceEffects();

  const captureKey = (e) => {
    e.preventDefault();
    if (e.code === "Escape") {
      setCapturingKey(false);
      onSetPushToTalkKey?.(null);
      return;
    }
    onSetPushToTalkKey?.(e.code);
    setCapturingKey(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-[75] w-80 rounded-xl border border-border bg-card p-4 shadow-2xl">
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-primary" />
        <span className="flex-1 text-[13px] font-semibold text-foreground">Voice & Video Settings</span>
        <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted/60">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Input device */}
      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-foreground">
            <Mic className="h-3 w-3" /> Input device
          </label>
          <select
            value={selectedInput}
            onChange={(e) => onChangeInputDevice?.(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground"
          >
            <option value="">Default microphone</option>
            {inputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>
            ))}
          </select>
        </div>

        {/* Input volume */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-foreground">
            <Volume2 className="h-3 w-3" /> Input volume: {inputVolume}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={inputVolume}
            onChange={(e) => onChangeInputVolume?.(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {/* Output device */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-foreground">
            <Volume2 className="h-3 w-3" /> Output device
          </label>
          <select
            value={selectedOutput}
            onChange={(e) => onChangeOutputDevice?.(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground"
          >
            <option value="">Default speakers</option>
            {outputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || "Speaker"}</option>
            ))}
          </select>
        </div>

        {/* Push-to-talk */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-foreground">
            <Keyboard className="h-3 w-3" /> Push to talk
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCapturingKey(true);
                if (!capturingKey) {
                  window.addEventListener("keydown", captureKey, { once: true });
                }
              }}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition",
                capturingKey ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
              )}
            >
              {capturingKey ? "Press a key…" : pushToTalkKey ? pushToTalkKey : "Set keybind"}
            </button>
            {pushToTalkKey && (
              <button
                onClick={() => onSetPushToTalkKey?.(null)}
                className="rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/70"
              >
                Off
              </button>
            )}
          </div>
        </div>

        {/* Voice effects */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-foreground">
            <Sparkles className="h-3 w-3" /> Voice effects (off by default)
          </label>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(effects).map(([id, eff]) => (
              <button
                key={id}
                onClick={() => onChangeVoiceEffect?.(id)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-[11px] font-medium transition",
                  voiceEffect === id ? "bg-primary/20 text-primary ring-1 ring-primary/40" : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                )}
              >
                {eff.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            Voice effects use the Web Audio API and are applied to your outgoing audio only.
          </p>
        </div>

        {/* Priority speaker */}
        <button
          onClick={onTogglePrioritySpeaker}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium transition",
            isPrioritySpeaker ? "bg-warning/20 text-warning" : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
          )}
        >
          <Crown className="h-3 w-3" />
          Priority speaker {isPrioritySpeaker ? "(on)" : "(off)"}
        </button>
      </div>
    </div>
  );
}