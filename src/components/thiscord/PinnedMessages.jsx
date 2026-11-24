import React, { useEffect, useState } from "react";
import { Pin, X, Loader2 } from "lucide-react";
import { api } from "@/api/client";

export default function PinnedMessages({ open, onClose, scope, isDm, onJumpTo }) {
  const [pinned, setPinned] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !scope) return;
    setLoading(true);
    (async () => {
      try {
        if (isDm) {
          const page = await api.entities.DirectMessage.filter({ thread_key: scope, pinned: true }, { sort: "-created_date", limit: 50 });
          setPinned(page?.items || []);
        } else {
          const page = await api.entities.ChannelMessage.filter({ channel_id: scope, pinned: true }, { sort: "-created_date", limit: 50 });
          setPinned(page?.items || []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [open, scope, isDm]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-border bg-card shadow-2xl">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Pin className="h-4 w-4 text-warning" />
        <h3 className="flex-1 text-sm font-bold text-foreground">Pinned messages</h3>
        <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pinned.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <Pin className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-[12px] text-muted-foreground">No pinned messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pinned.map((msg) => (
              <button
                key={msg.id}
                onClick={() => onJumpTo?.(msg)}
                className="block w-full rounded-xl border border-border bg-background/50 p-3 text-left transition hover:border-primary/40"
              >
                <p className="mb-1 text-[10px] text-muted-foreground">
                  {msg.from_username || msg.author_username} · {new Date(msg.created_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                </p>
                <p className="line-clamp-3 text-[12px] text-foreground">{msg.content || "(attachment)"}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}