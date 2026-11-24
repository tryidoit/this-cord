import React from "react";
import { Check } from "lucide-react";
import { resolveTokens } from "@/lib/uiStyles";
import { cn } from "@/lib/utils";

export default function StyleCard({ style, active, previewDark, onSelect }) {
  const tokens = resolveTokens(style.id, null, previewDark ? "dark" : "light", null);
  const bg = `hsl(${tokens["--background"]})`;
  const card = `hsl(${tokens["--card"]})`;
  const sidebar = `hsl(${tokens["--sidebar-background"]})`;
  const primary = `hsl(${tokens["--primary"]})`;
  const fg = `hsl(${tokens["--foreground"]})`;
  const muted = `hsl(${tokens["--muted-foreground"]})`;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-lg border text-left transition hover:-translate-y-0.5",
        active ? "border-primary ring-2 ring-primary/40" : "border-border"
      )}
    >
      <div className="flex h-20" style={{ background: bg }}>
        <div className="w-1/4" style={{ background: sidebar }} />
        <div className="flex flex-1 flex-col justify-end gap-1 p-2" style={{ background: card }}>
          <div className="h-2 w-3/4 rounded-full" style={{ background: fg, opacity: 0.8 }} />
          <div className="flex gap-1">
            <div className="h-1.5 w-6 rounded-full" style={{ background: primary }} />
            <div className="h-1.5 w-4 rounded-full" style={{ background: muted }} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-1 px-2.5 py-1.5">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium text-foreground">{style.name}</div>
          <div className="truncate text-[9px] text-muted-foreground">{style.fonts.display} / {style.fonts.body}</div>
        </div>
        {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
      </div>
    </button>
  );
}