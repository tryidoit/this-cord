import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { Users, Server, MessageSquare, Flag, Ban, Activity, Coins, TrendingUp, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [users, servers, messages, reports, bans, gifts] = await Promise.all([
          api.entities.Profile.count({}).catch(() => 0),
          api.entities.Server.count({}).catch(() => 0),
          api.entities.ChannelMessage.count({}).catch(() => 0),
          api.entities.MessageReport.count({ status: "pending" }).catch(() => 0),
          api.entities.Profile.count({ is_banned: true }).catch(() => 0),
          api.entities.CoinGift.count({}).catch(() => 0),
        ]);
        setStats({ users, servers, messages, reports, bans, gifts });
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Activity className="h-6 w-6 animate-pulse text-muted-foreground" /></div>;
  }

  const cards = [
    { label: "Total Users", value: stats?.users || 0, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Servers", value: stats?.servers || 0, icon: Server, color: "text-success", bg: "bg-success/10" },
    { label: "Messages", value: stats?.messages || 0, icon: MessageSquare, color: "text-warning", bg: "bg-warning/10" },
    { label: "Pending Reports", value: stats?.reports || 0, icon: Flag, color: "text-danger", bg: "bg-danger/10" },
    { label: "Banned Users", value: stats?.bans || 0, icon: Ban, color: "text-danger", bg: "bg-danger/10" },
    { label: "Coin Transfers", value: stats?.gifts || 0, icon: Coins, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-bold text-foreground">Admin Overview</h3>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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

      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Platform Health
        </div>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p>Avg users per server: {stats?.servers ? Math.round((stats?.users || 0) / stats.servers) : 0}</p>
          <p>Avg messages per user: {stats?.users ? Math.round((stats?.messages || 0) / stats.users) : 0}</p>
          <p>Reports per 1000 messages: {stats?.messages ? Math.round(((stats?.reports || 0) / stats.messages) * 1000) : 0}</p>
          <p>Ban rate: {stats?.users ? (((stats?.bans || 0) / stats.users) * 100).toFixed(1) : 0}%</p>
        </div>
      </div>
    </div>
  );
}