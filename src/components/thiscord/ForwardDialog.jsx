import React, { useState } from "react";
import { X, Forward, Search } from "lucide-react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { isOnline } from "@/lib/economy";
import { cn } from "@/lib/utils";

// Forward dialog: pick a conversation to forward a message to.
// props: message, conversations, players, nicknameFor, onForward(target), onClose()
export default function ForwardDialog({ conversations = [], players = {}, nicknameFor, onForward, onClose }) {
  const [query, setQuery] = useState("");
  const nickOf = (username, fallback) => (nicknameFor ? nicknameFor(username, fallback) : fallback || username);

  const filtered = conversations.filter((c) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return c.peer_username.toLowerCase().includes(q) || (nickOf(c.peer_username, "")).toLowerCase().includes(q);
  });

  const pick = (conv) => {
    onForward(conv);
  };

  return (
    <div className="fixed inset-0 z-[97] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Forward className="h-4 w-4 text-info" />
            <p className="font-display text-sm font-bold text-foreground">Forward message</p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
          />
        </div>

        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-muted-foreground">No conversations found.</p>
          ) : (
            filtered.map((c) => {
              const player = players[c.peer_username];
              return (
                <button
                  key={c.peer_username}
                  onClick={() => pick(c)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-muted"
                >
                  <span className="relative">
                    <ProfileAvatar avatarId={player?.avatar_id} size={32} />
                    <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card", isOnline(player?.last_seen) ? "bg-online" : "bg-idle")} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {nickOf(c.peer_username, player?.display_name || c.peer_username)}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">@{c.peer_username}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}