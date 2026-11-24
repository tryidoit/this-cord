import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";
import { Users, MessageSquare, Hash, TrendingUp, Activity, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ServerAnalytics({ serverId, server }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!serverId) return;
    setLoading(true);
    try {
      const [memberCount, msgCount, channelCount, levels, gifts] = await Promise.all([
        api.entities.ServerMember.count({ server_id: serverId }).catch(() => 0),
        api.entities.ChannelMessage.count({ server_id: serverId }).catch(() => 0),
        api.entities.Channel.count({ server_id: serverId }).catch(() => 0),
        api.entities.Level.filter({ server_id: serverId }, { sort: "-total_xp", limit: 5 }).catch(() => ({ items: [] })),
        api.entities.CoinGift.count({}).catch(() => 0),
      ]);
      setStats({
        members: memberCount,
        messages: msgCount,
        channels: channelCount,
        topUsers: levels?.items || [],
        gifts,
      });
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, [serverId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Activity className="h-6 w-6 animate-pulse text-muted-foreground" /></div>;
  }

  const cards = [
    { label: "Members", value: stats?.members || 0, icon: Users, color: "text-primary" },
    { label: "Messages", value: stats?.messages || 0, icon: MessageSquare, color: "text-success" },
    { label: "Channels", value: stats?.channels || 0, icon: Hash, color: "text-warning" },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <h3 className="mb-4 font-display text-lg font-bold text-foreground">{server?.name || "Server"} Analytics</h3>

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <c.icon className={cn("mx-auto h-5 w-5", c.color)} />
            <p className="mt-1 font-display text-xl font-bold text-foreground">{c.value.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Top users by XP */}
      <div className="mb-4">
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" /> Top Members by XP
        </h4>
        <div className="space-y-1.5">
          {(stats?.topUsers || []).map((u, i) => (
            <div key={u.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                i === 0 ? "bg-warning text-white" : i === 1 ? "bg-muted text-foreground" : "bg-muted text-muted-foreground")}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-foreground">@{u.username}</span>
              <span className="text-xs text-muted-foreground">Lv {u.level} · {u.total_xp?.toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity summary */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Activity Summary
        </div>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p>Avg messages per member: {stats?.members ? Math.round((stats?.messages || 0) / stats.members) : 0}</p>
          <p>Avg channels per member: {stats?.members ? ((stats?.channels || 0) / stats.members).toFixed(1) : 0}</p>
          <p>Messages per channel: {stats?.channels ? Math.round((stats?.messages || 0) / stats.channels) : 0}</p>
        </div>
      </div>
    </div>
  );
}