import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/api/client";
import { Search, X, Hash, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { parseSearchQuery, buildSearchFilter, buildDmSearchFilter } from "@/lib/searchParser";
import { cn } from "@/lib/utils";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";

const FILTER_HINTS = [
  { label: "from:", desc: "user" },
  { label: "in:", desc: "channel" },
  { label: "has:link", desc: "" },
  { label: "has:image", desc: "" },
  { label: "mentions:", desc: "user" },
  { label: "before:", desc: "date" },
  { label: "after:", desc: "date" },
  { label: "during:today", desc: "" },
  { label: "pinned:true", desc: "" },
];

export default function MessageSearch({ open, onClose, channels, servers, players, userId, onJumpToChannel }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState("all"); // all, channels, dms
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const parsed = parseSearchQuery(q);
      const allResults = [];

      if (scope === "all" || scope === "channels") {
        const channelFilter = buildSearchFilter(parsed);
        if (Object.keys(channelFilter).length > 0 || parsed.text) {
          const page = await api.entities.ChannelMessage.filter(channelFilter, { sort: "-created_date", limit: 25 });
          for (const msg of page?.items || []) {
            const ch = channels?.find((c) => c.id === msg.channel_id);
            const sv = servers?.find((s) => s.id === msg.server_id);
            allResults.push({ ...msg, _type: "channel", channelName: ch?.name || "unknown", serverName: sv?.name || "Server" });
          }
        }
      }

      if (scope === "all" || scope === "dms") {
        const dmFilter = buildDmSearchFilter(parsed);
        if (Object.keys(dmFilter).length > 0 || parsed.text) {
          const dmPage = await api.entities.DirectMessage.filter(
            { ...dmFilter, $or: [{ from_user_id: userId }, { to_user_id: userId }] },
            { sort: "-created_date", limit: 25 }
          );
          for (const msg of dmPage?.items || []) {
            const isMine = msg.from_user_id === userId;
            const peerUsername = isMine ? msg.to_username : msg.from_username;
            allResults.push({ ...msg, _type: "dm", peerUsername });
          }
        }
      }

      allResults.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setResults(allResults.slice(0, 50));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [scope, channels, servers, userId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 flex h-[70vh] w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
        {/* Search header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages…  (from:  in:  has:link  mentions:  before:  after:  pinned:true)"
              className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Search messages"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scope tabs */}
          <div className="mt-3 flex gap-1">
            {["all", "channels", "dms"].map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition",
                  scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Filter hints */}
          <div className="mt-2 flex flex-wrap gap-1">
            {FILTER_HINTS.map((h) => (
              <button
                key={h.label}
                onClick={() => setQuery((q) => (q.endsWith(" ") || !q ? `${q}${h.label} ` : `${q} ${h.label} `))}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-[12px] text-muted-foreground">
                {query.trim() ? "No results found." : "Type to search messages across all your conversations."}
              </p>
            </div>
          ) : (
            results.map((msg, i) => (
              <button
                key={i}
                onClick={() => {
                  if (msg._type === "channel") {
                    const ch = channels?.find((c) => c.id === msg.channel_id);
                    if (ch) onJumpToChannel(ch, msg.server_id, msg.id);
                  }
                  onClose();
                }}
                className="mb-1 flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition hover:bg-muted"
              >
                <ProfileAvatar avatarId={msg.author_avatar || msg.from_user_id} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-foreground">
                      {msg.author_name || msg.author_username || msg.from_username || "Unknown"}
                    </span>
                    {msg._type === "channel" ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Hash className="h-2.5 w-2.5" />
                        {msg.channelName}
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <MessageSquare className="h-2.5 w-2.5" />
                        DM with {msg.peerUsername}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {new Date(msg.created_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                    {msg.content || (msg.attachment_url ? "Sent an attachment" : "")}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}