import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, Hash, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";

export default function QuickSwitcher({ open, onClose, servers, channels, conversations, players, selection, onSelectChannel, onSelectDm, onSelectServer }) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef([]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [];
    // Servers
    for (const s of servers || []) {
      if (!q || s.name.toLowerCase().includes(q)) list.push({ type: "server", id: s.id, label: s.name, icon: s.icon, subtext: "Server" });
    }
    // Channels
    for (const c of channels || []) {
      if (!q || c.name.toLowerCase().includes(q)) list.push({ type: "channel", id: c.id, label: c.name, channel: c, subtext: channels?.find((ch) => ch.id === c.id)?.name || "Channel" });
    }
    // DMs
    for (const c of conversations || []) {
      if (!q || c.peer_username.toLowerCase().includes(q)) list.push({ type: "dm", id: c.peer_username, label: c.peer_username, peer: c, subtext: "Direct message" });
    }
    return list.slice(0, 50);
  }, [query, servers, channels, conversations]);

  useEffect(() => { setHighlight(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, items.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = items[highlight];
        if (item) {
          if (item.type === "channel") onSelectChannel(item.channel, item.channel.server_id);
          else if (item.type === "dm") {
            const p = players?.[item.peer.peer_username];
            onSelectDm({
              username: item.peer.peer_username,
              user_id: item.peer.peer_user_id,
              display_name: p?.display_name || item.peer.peer_username,
              avatar_id: p?.avatar_id,
            });
          } else if (item.type === "server") {
            const sv = servers.find((s) => s.id === item.id);
            if (sv) onSelectServer(sv);
          }
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, highlight, players, servers, onSelectChannel, onSelectDm, onSelectServer, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/4 z-50 flex w-[90vw] max-w-md -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Quick switcher — find a channel or conversation"
            className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Quick switcher search"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">No results.</p>
          ) : (
            items.map((item, i) => (
              <button
                key={`${item.type}:${item.id}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => {
                  if (item.type === "channel") onSelectChannel(item.channel, item.channel.server_id);
                  else if (item.type === "dm") {
                    const p = players?.[item.peer.peer_username];
                    onSelectDm({
                      username: item.peer.peer_username,
                      user_id: item.peer.peer_user_id,
                      display_name: p?.display_name || item.peer.peer_username,
                      avatar_id: p?.avatar_id,
                    });
                  } else if (item.type === "server") {
                    const sv = servers.find((s) => s.id === item.id);
                    if (sv) onSelectServer(sv);
                  }
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition",
                  i === highlight ? "bg-primary/20" : "hover:bg-muted"
                )}
              >
                {item.type === "channel" ? (
                  <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : item.type === "server" ? (
                  <span className="text-lg leading-none">{item.icon || "🛰️"}</span>
                ) : (
                  <ProfileAvatar avatarId={players?.[item.peer.peer_username]?.avatar_id} size={28} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-foreground">{item.label}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{item.subtext}</span>
                </span>
                {i === highlight && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}