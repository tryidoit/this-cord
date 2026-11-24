import React, { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TEXT_REACTION_PRESETS = ["lol", "W", "L", "gg", "fr", "rip", "+1", "ok", "no way"];

export default function ReactionBar({ reactions = [], currentUserId, onReact, onTextReact, onSuperReact, canSuperReact }) {
  const [showTextPicker, setShowTextPicker] = useState(false);
  const [textInput, setTextInput] = useState("");

  // Group reactions by emoji/text
  const grouped = {};
  reactions.forEach((r) => {
    const key = r.emoji;
    if (!grouped[key]) grouped[key] = { emoji: r.emoji, type: r.reaction_type, users: [], count: 0, mine: false };
    grouped[key].users.push(r.username);
    grouped[key].count++;
    if (r.user_id === currentUserId) grouped[key].mine = true;
  });

  const groupedArr = Object.values(grouped).sort((a, b) => b.count - a.count);

  const sendTextReaction = (text) => {
    const trimmed = text.trim().slice(0, 16);
    if (!trimmed) return;
    if (!/^[a-zA-Z0-9\s!?.+-]+$/.test(trimmed)) return;
    onTextReact?.(trimmed);
    setShowTextPicker(false);
    setTextInput("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {groupedArr.map((g) => (
        <button
          key={g.emoji}
          onClick={() => onReact?.(g.emoji, g.type)}
          title={g.users.join(", ")}
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] transition",
            g.mine ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80",
            g.type === "super" && "ring-1 ring-warning"
          )}
        >
          {g.type === "text" ? (
            <span className="font-semibold">{g.emoji}</span>
          ) : (
            <span>{g.emoji}</span>
          )}
          <span className="font-medium">{g.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowTextPicker((v) => !v)}
          className="grid h-6 w-6 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
          title="Add reaction"
        >
          <Plus className="h-3 w-3" />
        </button>
        {showTextPicker && (
          <div className="absolute bottom-8 left-0 z-50 w-48 rounded-xl border border-border bg-popover p-2 shadow-xl">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick reactions</p>
            <div className="mb-2 flex flex-wrap gap-1">
              {TEXT_REACTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => sendTextReaction(preset)}
                  className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground transition hover:bg-primary/20 hover:text-primary"
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value.slice(0, 16))}
                onKeyDown={(e) => e.key === "Enter" && sendTextReaction(textInput)}
                placeholder="Type a reaction…"
                maxLength={16}
                className="h-7 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
              <button
                onClick={() => sendTextReaction(textInput)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {canSuperReact && (
              <button
                onClick={() => { onSuperReact?.("⭐"); setShowTextPicker(false); }}
                className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-warning transition hover:bg-warning/10"
              >
                <Sparkles className="h-3 w-3" /> Super reaction (50 That)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}