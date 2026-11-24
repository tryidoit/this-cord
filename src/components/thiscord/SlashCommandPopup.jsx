import React, { useState, useEffect } from "react";
import { SLASH_COMMANDS, SLASH_CATEGORIES } from "@/lib/slashCommands";
import { api } from "@/api/client";
import { cn } from "@/lib/utils";

export default function SlashCommandPopup({ query, onPick, position, serverId }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [customCommands, setCustomCommands] = useState([]);

  useEffect(() => {
    if (!serverId) { setCustomCommands([]); return; }
    let cancelled = false;
    api.entities.ServerCommand.filter({ server_id: serverId, enabled: true }, { limit: 50 })
      .then((r) => { if (!cancelled) setCustomCommands((r.items || []).map((c) => ({ cmd: "/" + c.command_name, desc: c.description || "Custom command", usage: "/" + c.command_name, category: "Custom" }))); })
      .catch(() => { if (!cancelled) setCustomCommands([]); });
    return () => { cancelled = true; };
  }, [serverId]);

  if (!query.startsWith("/")) return null;
  const q = query.toLowerCase();
  const allCommands = [...SLASH_COMMANDS, ...customCommands];
  const matches = allCommands.filter((c) => c.cmd.startsWith(q) || (q.length > 1 && c.cmd.includes(q.slice(1))));
  if (matches.length === 0) return null;

  const grouped = activeCategory
    ? matches.filter((c) => c.category === activeCategory)
    : matches;

  return (
    <div
      className="absolute z-50 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
      style={{ bottom: position?.bottom || "100%", left: position?.left || 0, marginBottom: 4 }}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Commands</p>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium transition", !activeCategory ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            All
          </button>
          {customCommands.length > 0 && (
            <button
              onClick={() => setActiveCategory("Custom")}
              className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium transition", activeCategory === "Custom" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Custom
            </button>
          )}
          {SLASH_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium transition", activeCategory === cat ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto">
        {grouped.slice(0, 12).map((cmd) => (
          <button
            key={cmd.cmd}
            onClick={() => onPick(cmd)}
            className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition hover:bg-muted"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-primary">{cmd.cmd}</span>
              <span className="rounded bg-muted px-1 py-0.5 text-[8px] font-medium uppercase tracking-wider text-muted-foreground">{cmd.category}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{cmd.desc}</span>
            <span className="text-[10px] text-muted-foreground/70">{cmd.usage}</span>
          </button>
        ))}
      </div>
    </div>
  );
}