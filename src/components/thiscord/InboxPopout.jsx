import React, { useState, useEffect, useMemo } from "react";
import { AtSign, Inbox, Reply, X, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";

const TABS = [
  { id: "mentions", label: "Mentions", icon: AtSign },
  { id: "unreads", label: "Unreads", icon: Inbox },
  { id: "replies", label: "Replies", icon: Reply },
];

export default function InboxPopout({ open, onClose, mentionMessages, replyMessages, unreadChannels, conversations, players, channels, servers, onSelectChannel, onSelectDm, onMarkAllRead }) {
  const [tab, setTab] = useState("mentions");

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const unreads = useMemo(() => {
    const items = [];
    // Channel unreads
    for (const [cid, info] of Object.entries(unreadChannels || {})) {
      const ch = channels?.find((c) => c.id === cid);
      const server = servers?.find((s) => s.id === info.serverId);
      items.push({
        type: "channel",
        channelId: cid,
        channelName: ch?.name || "unknown",
        serverName: server?.name || "Server",
        count: info.count,
        mention: info.mention,
      });
    }
    // DM unreads
    for (const c of conversations || []) {
      if (c.unread) {
        items.push({
          type: "dm",
          peerUsername: c.peer_username,
          peerUserId: c.peer_user_id,
          count: 1,
          last: c.last,
        });
      }
    }
    return items.sort((a, b) => b.count - a.count);
  }, [unreadChannels, channels, servers, conversations]);

  const messages = tab === "mentions" ? mentionMessages : tab === "replies" ? replyMessages : [];

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-border bg-popover shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-[14px] font-bold text-foreground">Inbox</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Mark all as read"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close inbox"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-border">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count = t.id === "mentions" ? (mentionMessages?.length || 0) : t.id === "unreads" ? unreads.length : (replyMessages?.length || 0);
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition",
                  tab === t.id ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {count > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {tab === "unreads" ? (
            unreads.length === 0 ? (
              <EmptyState text="You're all caught up!" />
            ) : (
              unreads.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (item.type === "channel") {
                      const ch = channels?.find((c) => c.id === item.channelId);
                      if (ch) onSelectChannel(ch, item.serverId);
                    } else {
                      onSelectDm({
                        username: item.peerUsername,
                        user_id: item.peerUserId,
                        display_name: players?.[item.peerUsername]?.display_name || item.peerUsername,
                        avatar_id: players?.[item.peerUsername]?.avatar_id,
                      });
                    }
                    onClose();
                  }}
                  className="mb-1 flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition hover:bg-muted"
                >
                  {item.type === "channel" ? (
                    <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ProfileAvatar avatarId={players?.[item.peerUsername]?.avatar_id} size={28} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {item.type === "channel" ? item.channelName : item.peerUsername}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.type === "channel" ? item.serverName : item.last}
                    </span>
                  </span>
                  {item.mention && <span className="h-2 w-2 shrink-0 rounded-full bg-mention" />}
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {item.count}
                  </span>
                </button>
              ))
            )
          ) : messages.length === 0 ? (
            <EmptyState text={tab === "mentions" ? "No mentions yet." : "No replies yet."} />
          ) : (
            messages.map((msg, i) => (
              <button
                key={i}
                onClick={() => {
                  if (msg._type === "channel") {
                    const ch = channels?.find((c) => c.id === msg.channel_id);
                    if (ch) onSelectChannel(ch, msg.server_id);
                  } else {
                    const peerId = msg.from_user_id;
                    onSelectDm({
                      username: msg.from_username,
                      user_id: peerId,
                      display_name: players?.[msg.from_username]?.display_name || msg.from_username,
                      avatar_id: players?.[msg.from_username]?.avatar_id,
                    });
                  }
                  onClose();
                }}
                className="mb-1 w-full rounded-lg p-2 text-left transition hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <ProfileAvatar avatarId={msg.author_avatar} size={24} />
                  <span className="text-[12px] font-semibold text-foreground">
                    {msg.author_name || msg.author_username || msg.from_username || "Unknown"}
                  </span>
                  {msg._type === "channel" && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Hash className="h-2.5 w-2.5" />
                      {channels?.find((c) => c.id === msg.channel_id)?.name || "channel"}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
                  {msg.content || (msg.attachment_url ? "Sent an attachment" : "")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Inbox className="h-8 w-8 text-muted-foreground/40" />
      <p className="mt-2 text-[12px] text-muted-foreground">{text}</p>
    </div>
  );
}