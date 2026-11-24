import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { Trophy, MessageSquare, Gamepad2, Users, Coins, Flame, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCoins } from "@/lib/economy";

export default function Wrapped({ profile }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const [myMessages, myServers, myGifts, myDms] = await Promise.all([
          api.entities.ChannelMessage.count({ author_username: profile.username }).catch(() => 0),
          api.entities.Server.filter({ member_user_ids: profile.created_by_id }, { limit: 50 }).catch(() => ({ items: [] })),
          api.entities.CoinGift.filter({ $or: [{ from_username: profile.username }, { to_username: profile.username }] }, { limit: 50 }).catch(() => ({ items: [] })),
          api.entities.DirectMessage.filter({ $or: [{ from_username: profile.username }, { to_username: profile.username }] }, { sort: "-created_date", limit: 50 }).catch(() => ({ items: [] })),
        ]);
        setStats({
          messages: myMessages,
          servers: myServers?.items?.length || 0,
          serverList: myServers?.items || [],
          gifts: myGifts?.items?.length || 0,
          dms: myDms?.items?.length || 0,
          gamesWon: profile.games_won || 0,
          points: profile.points || 0,
          dailyStreak: profile.daily_streak || 0,
          achievements: (profile.achievements || []).length,
          avatars: (profile.owned_avatars || []).length,
        });
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, [profile]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Trophy className="h-6 w-6 animate-pulse text-muted-foreground" /></div>;
  }

  if (!stats) return <div className="p-4 text-sm text-muted-foreground">Unable to load stats.</div>;

  const cards = [
    { label: "Messages Sent", value: stats.messages, icon: MessageSquare, color: "text-primary", bg: "bg-primary/10" },
    { label: "Games Won", value: stats.gamesWon, icon: Gamepad2, color: "text-success", bg: "bg-success/10" },
    { label: "Servers Joined", value: stats.servers, icon: Users, color: "text-warning", bg: "bg-warning/10" },
    { label: "Achievements", value: stats.achievements, icon: Star, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Avatars Owned", value: stats.avatars, icon: Trophy, color: "text-info", bg: "bg-info/10" },
    { label: "Daily Streak", value: stats.dailyStreak, icon: Flame, color: "text-danger", bg: "bg-danger/10" },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      {/* Hero */}
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-600/20 p-5 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground">Your Wrapped</h2>
        <p className="text-sm text-muted-foreground">A look at your ThisCord journey so far</p>
      </div>

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3">
            <div className={cn("mb-2 inline-flex rounded-lg p-1.5", c.bg)}>
              <c.icon className={cn("h-4 w-4", c.color)} />
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{c.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Coin balance */}
      <div className="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-center">
        <Coins className="mx-auto h-6 w-6 text-warning" />
        <p className="mt-1 font-display text-3xl font-bold text-foreground">{formatCoins(profile)} coins</p>
        <p className="text-xs text-muted-foreground">Total balance</p>
      </div>

      {/* Top servers */}
      {stats.serverList.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Your Servers
          </h4>
          <div className="flex flex-wrap gap-2">
            {stats.serverList.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                <span>{s.icon}</span>
                <span className="text-xs text-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fun facts */}
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fun Facts</p>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p>🔥 You've sent an average of {stats.servers > 0 ? Math.round(stats.messages / stats.servers) : stats.messages} messages per server</p>
          <p>🎁 You've been involved in {stats.gifts} coin transfers</p>
          <p>💬 You've exchanged {stats.dms} direct messages</p>
        </div>
      </div>
    </div>
  );
}