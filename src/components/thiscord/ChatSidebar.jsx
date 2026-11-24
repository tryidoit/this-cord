import React, { useMemo, useState } from "react";
import { Search, Plus, MessageSquarePlus, Users, LogOut, Lock, Wrench, Sparkles } from "lucide-react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import ChannelList from "@/components/thiscord/ChannelList";
import { isOnline } from "@/lib/economy";
import { cn } from "@/lib/utils";

export default function ChatSidebar({
  mode,
  serverName,
  conversations,
  channels,
  categories,
  selection,
  players,
  skin,
  onSelectDm,
  onSelectChannel,
  onCreateChannel,
  onCreateCategory,
  onEditChannel,
  onReorderChannels,
  onReorderCategories,
  isAdmin,
  onStartDm,
  nicknameFor,
  onOpenProfile,
  onLeaveServer,
  activeServer,
  voiceChannelId,
  onJoinVoice,
  unreadChannels,
  onMarkChannelRead,
  onOpenNotifSettings,
  onOpenSearch,
  onOpenCommunity,
  onOpenExtra,
}) {
  const [query, setQuery] = useState("");
  const nickOf = (username, fallback) => (nicknameFor ? nicknameFor(username, fallback) : fallback || username);
  const dotFor = (player) => (isOnline(player?.last_seen) ? "bg-online" : "bg-idle");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (!q) return [];
    return Object.values(players)
      .filter((p) => p.username.includes(q) || (p.display_name || "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, players]);

  const startDm = (player) => {
    onStartDm({
      username: player.username,
      user_id: player.created_by_id,
      display_name: player.display_name || player.username,
      avatar_id: player.avatar_id,
    });
    setQuery("");
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-card">
      {skin && (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: skin.layer,
              backgroundSize: skin.size,
              animation: `${skin.motion} ${skin.dur}s ease-in-out infinite`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-background/40" />
        </>
      )}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="flex items-center gap-1.5 font-display text-[13px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {mode === "home" ? "Direct messages" : serverName}
            {activeServer?.invite_only && <Lock className="h-3 w-3 opacity-60" />}
          </h2>
          <div className="flex items-center gap-1">
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                title="Search messages"
                aria-label="Search messages"
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            )}
            {mode === "server" && onLeaveServer && (
              <button
                onClick={() => onLeaveServer(activeServer?.id)}
                title="Leave server"
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-danger/15 hover:text-danger"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
            {mode === "server" && isAdmin && (
              <button
                onClick={() => onCreateChannel(null)}
                title="Create channel"
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
            {mode === "server" && onOpenCommunity && (
              <button
                onClick={onOpenCommunity}
                title="Community tools"
                aria-label="Community tools"
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Wrench className="h-3.5 w-3.5" />
              </button>
            )}
            {onOpenExtra && (
              <button
                onClick={onOpenExtra}
                title="Extra features"
                aria-label="Extra features"
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-primary/15 hover:text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {mode === "home" ? (
          <>
            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a player by username"
                  className="h-9 w-full rounded-lg border border-border bg-background/70 pl-8 pr-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                />
              </div>
              {results.length > 0 && (
                <div className="mt-2 space-y-1 rounded-xl border border-border bg-popover p-1.5">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => startDm(p)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-muted"
                    >
                      <ProfileAvatar avatarId={p.avatar_id} size={24} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-foreground">{nickOf(p.username, p.display_name || p.username)}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">@{p.username}</span>
                      </span>
                      <MessageSquarePlus className="h-3.5 w-3.5 text-primary" />
                    </button>
                  ))}
                </div>
              )}
              {query && results.length === 0 && (
                <p className="mt-2 px-1 text-[11px] text-muted-foreground">No player found with that username.</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {conversations.length === 0 ? (
                <div className="mx-2 mt-6 rounded-2xl border border-dashed border-border p-4 text-center">
                  <Users className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-[12px] text-muted-foreground">No DMs yet. Search a username above to start one.</p>
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.peer_username}
                    onClick={() =>
                      onStartDm({
                        username: c.peer_username,
                        user_id: c.peer_user_id,
                        display_name: players[c.peer_username]?.display_name || c.peer_username,
                        avatar_id: players[c.peer_username]?.avatar_id,
                      })
                    }
                    className={cn(
                      "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition",
                      selection.type === "dm" && selection.peer.username === c.peer_username
                        ? "bg-primary/20"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <span className="relative">
                      <ProfileAvatar avatarId={players[c.peer_username]?.avatar_id} size={32} />
                      <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card", dotFor(players[c.peer_username]))} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {nickOf(c.peer_username, players[c.peer_username]?.display_name || c.peer_username)}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">{c.last}</span>
                    </span>
                    {c.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <ChannelList
            channels={channels}
            categories={categories}
            selection={selection}
            serverId={activeServer?.id}
            isAdmin={isAdmin}
            onSelectChannel={onSelectChannel}
            onCreateChannel={onCreateChannel}
            onCreateCategory={onCreateCategory}
            onEditChannel={onEditChannel}
            onReorderChannels={onReorderChannels}
            onReorderCategories={onReorderCategories}
            voiceChannelId={voiceChannelId}
            onJoinVoice={onJoinVoice}
            unreadChannels={unreadChannels}
            onMarkRead={onMarkChannelRead}
            onOpenNotifSettings={onOpenNotifSettings}
          />
        )}
      </div>
    </div>
  );
}