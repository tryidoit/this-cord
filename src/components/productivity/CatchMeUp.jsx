import React, { useState, useEffect } from "react";
import { buildDigest } from "@/lib/productivity";
import { Users, AtSign, Pin, Link2, ArrowDown, X, Flame } from "lucide-react";

export default function CatchMeUp({ messages, profile, currentUserId, reactions = [], onJumpToMessage, onClose }) {
  const [digest, setDigest] = useState(null);

  useEffect(() => {
    if (messages?.length) {
      setDigest(buildDigest(messages, currentUserId, profile, reactions));
    }
  }, [messages, currentUserId, profile]);

  if (!digest) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">No unread messages to catch up on. You're all caught up! ✨</p>
        {onClose && (
          <button onClick={onClose} className="mt-4 text-xs text-muted-foreground hover:text-foreground">
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex max-h-[60vh] flex-col overflow-y-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Catch me up</h3>
          <p className="text-xs text-muted-foreground">{digest.count} messages in the last 24 hours</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Active users */}
        {digest.topUsers.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Who was active
            </div>
            <div className="flex flex-wrap gap-2">
              {digest.topUsers.map(([user, count]) => (
                <span key={user} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                  @{user} · {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mentions */}
        {digest.mentioned.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
              <AtSign className="h-3.5 w-3.5" /> Mentions you ({digest.mentioned.length})
            </div>
            <div className="space-y-1.5">
              {digest.mentioned.slice(0, 5).map((m) => (
                <div key={m.id} className="cursor-pointer rounded-lg p-1.5 hover:bg-muted/50" onClick={() => onJumpToMessage?.(m.id)}>
                  <span className="text-xs font-medium text-foreground">@{m.author_username || m.from_username}:</span>{" "}
                  <span className="text-xs text-muted-foreground">{(m.content || "").slice(0, 80)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pinned */}
        {digest.pinned.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Pin className="h-3.5 w-3.5" /> Pinned ({digest.pinned.length})
            </div>
            <div className="space-y-1.5">
              {digest.pinned.slice(0, 3).map((m) => (
                <div key={m.id} className="cursor-pointer rounded-lg p-1.5 hover:bg-muted/50" onClick={() => onJumpToMessage?.(m.id)}>
                  <span className="text-xs font-medium text-foreground">@{m.author_username || m.from_username}:</span>{" "}
                  <span className="text-xs text-muted-foreground">{(m.content || "").slice(0, 80)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shared links */}
        {digest.links.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" /> Shared links ({digest.links.length})
            </div>
            <div className="space-y-1">
              {digest.links.slice(0, 5).map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">
                  {l.url}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Top reacted */}
        {digest.topReacted && digest.topReacted.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Flame className="h-3.5 w-3.5" /> Top Reacted
            </div>
            <div className="space-y-1.5">
              {digest.topReacted.map((m) => (
                <div key={m.id} className="cursor-pointer rounded-lg p-1.5 hover:bg-muted/50" onClick={() => onJumpToMessage?.(m.id)}>
                  <span className="text-xs font-medium text-foreground">@{m.author_username || m.from_username}:</span>{" "}
                  <span className="text-xs text-muted-foreground">{(m.content || "").slice(0, 80)}</span>
                  <span className="ml-1 text-[10px] text-warning">🔥{m._reactCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Jump to first unread */}
        {digest.firstUnread && (
          <button
            onClick={() => onJumpToMessage?.(digest.firstUnread.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <ArrowDown className="h-4 w-4" /> Jump to first unread
          </button>
        )}
      </div>
    </div>
  );
}