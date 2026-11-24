import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { api } from "@/api/client";
import { useProfile } from "@/lib/ProfileContext";
import { THEMES, DEFAULT_THEME, themeSwatch } from "@/lib/themes";
import { cn } from "@/lib/utils";

export default function Customize() {
  const { profile, setProfile } = useProfile();
  const [busy, setBusy] = useState(false);

  const save = async (patch) => {
    if (!profile || busy) return;
    setBusy(true);
    try {
      const updated = await api.entities.Profile.update(profile.id, patch);
      setProfile(updated);
    } finally {
      setBusy(false);
    }
  };

  const activeId = profile?.theme_id || DEFAULT_THEME.id;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Themes</h1>
            <p className="text-[12px] text-muted-foreground">
              {THEMES.length} distinct themes · each changes the whole app look
            </p>
          </div>
          <button
            onClick={() => save({ theme_id: DEFAULT_THEME.id })}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] text-muted-foreground transition hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {THEMES.map((theme) => {
            const active = activeId === theme.id;
            const swatch = themeSwatch(theme);
            const sidebar = theme.sidebarStyle;
            return (
              <button
                key={theme.id}
                onClick={() => save({ theme_id: theme.id })}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5",
                  active ? "border-primary ring-2 ring-primary/40" : "border-border"
                )}
              >
                {/* Mini sidebar preview */}
                <div className="flex h-24">
                  <div
                    className="w-1/3 shrink-0"
                    style={{
                      backgroundImage: sidebar?.layer,
                      backgroundSize: sidebar?.size,
                      animation: sidebar ? `${sidebar.motion} ${sidebar.dur}s ease-in-out infinite` : undefined,
                    }}
                  />
                  <div className="flex flex-1 flex-col justify-end gap-1 p-2" style={{ background: swatch[0] }}>
                    <div className="h-3 w-3/4 rounded-full" style={{ background: swatch[1] }} />
                    <div className="flex gap-1">
                      <div className="h-2 w-8 rounded-full" style={{ background: swatch[2] }} />
                      <div className="h-2 w-5 rounded-full" style={{ background: swatch[3] }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                  <span className="truncate text-[11px] font-medium text-foreground">{theme.name}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}