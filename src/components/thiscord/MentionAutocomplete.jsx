import React from "react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { isOnline } from "@/lib/economy";
import { cn } from "@/lib/utils";

// Pure presentational dropdown for @mention autocomplete.
// props: matches (array of player objects), selectedIndex, nicknameFor, onPick(player), onHover(index)
export default function MentionAutocomplete({ matches = [], selectedIndex = 0, nicknameFor, onPick, onHover }) {
  if (matches.length === 0) return null;
  const nickOf = (username, fallback) => (nicknameFor ? nicknameFor(username, fallback) : fallback || username);

  return (
    <div
      className="absolute z-50 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
      style={{ bottom: "100%", left: 0, marginBottom: 4 }}
    >
      <p className="border-b border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Mentions — ↑↓ to navigate, ↵ to select
      </p>
      <div className="max-h-52 overflow-y-auto">
        {matches.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onPick?.(p)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left transition",
              i === selectedIndex ? "bg-primary/20" : "hover:bg-muted"
            )}
            onMouseEnter={() => onHover?.(i)}
          >
            <ProfileAvatar avatarId={p.avatar_id} size={24} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{nickOf(p.username, p.display_name || p.username)}</p>
              <p className="truncate text-[10px] text-muted-foreground">@{p.username}</p>
            </div>
            {isOnline(p.last_seen) && <span className="h-2 w-2 shrink-0 rounded-full bg-online" />}
          </button>
        ))}
      </div>
    </div>
  );
}