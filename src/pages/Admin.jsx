import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Search, ShieldCheck, Coins, Users, Ban, Zap, Infinity as InfinityIcon,
  Settings2, Crown, Sparkles, MessageSquare, Wrench, ArrowLeftRight, AtSign,
  TrendingUp, Activity, Server, Trash2, Send, SortDesc, Radio, UserCheck, AlertTriangle, Trophy, Flag, Wifi, Monitor
} from "lucide-react";
import { useProfile } from "@/lib/ProfileContext";
import { api } from "@/api/client";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import PlayerEditor from "@/components/admin/PlayerEditor";
import { formatPoints, hasCheat, isOnline } from "@/lib/economy";
import { formatLocalDateTime, formatLocalDate } from "@/lib/time";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const SORTS = [
  { key: "-created_date", label: "Newest" },
  { key: "-points", label: "Richest" },
  { key: "-games_won", label: "Top winners" },
  { key: "-daily_streak", label: "Best streak" },
];

export default function Admin() {
  const { profile, config, isAdmin } = useProfile();
  const [players, setPlayers] = useState([]);
  const [servers, setServers] = useState([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("-created_date");
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(null);
  const [cfg, setCfg] = useState(config);
  const [welcomeDraft, setWelcomeDraft] = useState(config?.welcome_message || "");
  const [globalLimit, setGlobalLimit] = useState(config?.global_transfer_limit || 50000);
  const [maintenanceDraft, setMaintenanceDraft] = useState(config?.maintenance_message || "");
  const [broadcast, setBroadcast] = useState("");
  const [busy, setBusy] = useState("");
  const [reports, setReports] = useState([]);
  const [turnUrls, setTurnUrls] = useState(config?.turn_urls || "");
  const [turnUser, setTurnUser] = useState(config?.turn_username || "");
  const [turnCred, setTurnCred] = useState(config?.turn_credential || "");
  const [deviceBans, setDeviceBans] = useState([]);

  const logAction = async (action, targetUsername, details) => {
    try {
      await api.entities.AuditLog.create({
        actor_username: profile?.username,
        action,
        target_username: targetUsername || "",
        details: details || "",
      });
    } catch { /* audit log is best-effort */ }
  };

  useEffect(() => {
    setCfg(config);
    setTurnUrls(config?.turn_urls || "");
    setTurnUser(config?.turn_username || "");
    setTurnCred(config?.turn_credential || "");
    setWelcomeDraft(config?.welcome_message || "");
    setGlobalLimit(config?.global_transfer_limit || 50000);
    setMaintenanceDraft(config?.maintenance_message || "");
  }, [config]);

  const load = async () => {
    const page = await api.entities.Profile.filter({}, { sort: "-created_date", limit: 500 });
    setPlayers(page?.items || []);
    const srvPage = await api.entities.Server.filter({}, { sort: "-created_date", limit: 200 });
    setServers(srvPage?.items || []);
    try {
      const repPage = await api.entities.MessageReport.filter({ status: "pending" }, { sort: "-created_date", limit: 100 });
      setReports(repPage?.items || []);
    } catch { /* reports unavailable */ }
    try {
      const banPage = await api.entities.DeviceBan.filter({ active: true }, { sort: "-banned_at", limit: 200 });
      setDeviceBans(banPage?.items || []);
    } catch { /* device bans unavailable */ }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.username.includes(q) || (p.display_name || "").toLowerCase().includes(q));
  }, [players, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const key = sort.replace(/^-/, "");
    const desc = sort.startsWith("-");
    list.sort((a, b) => {
      const av = (a[key] || 0);
      const bv = (b[key] || 0);
      if (typeof av === "string") return desc ? bv.localeCompare(av) : av.localeCompare(bv);
      return desc ? bv - av : av - bv;
    });
    return list;
  }, [filtered, sort]);

  const patch = async (player, changes) => {
    try {
      const updated = await api.entities.Profile.update(player.id, changes);
      setPlayers((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      setEditing((cur) => (cur?.id === updated.id ? updated : cur));
      // Audit log for privileged moderation actions
      if (changes.is_banned !== undefined) {
        await logAction(changes.is_banned ? "ban" : "unban", player.username, changes.is_banned ? (changes.ban_reason || "Banned") : "Unbanned");
      }
      if (changes.muted_until !== undefined) {
        await logAction("mute", player.username, `Muted until ${changes.muted_until || "cleared"}`);
      }
      if (changes.kicked_at !== undefined) {
        await logAction("kick", player.username, `Kicked at ${changes.kicked_at}`);
      }
      if (changes.transfer_limit !== undefined) {
        await logAction("set_transfer_limit", player.username, `Transfer limit set to ${changes.transfer_limit}`);
      }
      return updated;
    } catch {
      toast({ title: "Action blocked", description: "Your account does not have permission to change that player." });
      return null;
    }
  };

  const toggleDouble = async () => {
    if (!cfg) return;
    const updated = await api.entities.AppConfig.update(cfg.id, { double_points: !cfg.double_points });
    setCfg(updated);
    toast({ title: updated.double_points ? "2× Coins enabled" : "2× Coins disabled" });
  };

  const saveWelcome = async () => {
    if (!cfg) return;
    const updated = await api.entities.AppConfig.update(cfg.id, { welcome_message: welcomeDraft.trim() });
    setCfg(updated);
    toast({ title: "Welcome message saved" });
  };

  const saveGlobalLimit = async () => {
    if (!cfg) return;
    const updated = await api.entities.AppConfig.update(cfg.id, { global_transfer_limit: Math.max(0, Math.round(Number(globalLimit) || 0)) });
    setCfg(updated);
    toast({ title: "Global transfer limit saved" });
  };

  const toggleMaintenance = async () => {
    if (!cfg) return;
    const updated = await api.entities.AppConfig.update(cfg.id, { maintenance_mode: !cfg.maintenance_mode });
    setCfg(updated);
    await logAction("toggle_maintenance", "", updated.maintenance_mode ? "Maintenance mode ON" : "Maintenance mode OFF");
    toast({ title: updated.maintenance_mode ? "Maintenance mode on" : "Maintenance mode off" });
  };

  const saveTurnConfig = async () => {
    if (!cfg) return;
    const updated = await api.entities.AppConfig.update(cfg.id, {
      turn_urls: turnUrls.trim(),
      turn_username: turnUser.trim(),
      turn_credential: turnCred.trim(),
    });
    setCfg(updated);
    await logAction("update_turn_config", "", "Updated TURN relay credentials");
    toast({ title: "TURN config saved" });
  };

  const saveMaintenanceMsg = async () => {
    if (!cfg) return;
    const updated = await api.entities.AppConfig.update(cfg.id, { maintenance_message: maintenanceDraft.trim() });
    setCfg(updated);
    toast({ title: "Maintenance message saved" });
  };

  const resetHandle = async (player) => {
    const newName = window.prompt("New handle for @" + player.username, player.username);
    if (!newName) return;
    const clean = newName.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    if (clean.length < 3) return toast({ title: "Too short" });
    await patch(player, { username: clean });
    await logAction("reset_handle", player.username, `Changed from @${player.username} to @${clean}`);
    toast({ title: "Handle reset", description: `Now @${clean}` });
  };

  const massGift = async (amount) => {
    if (!window.confirm(`Gift ${amount} coins to every player (${players.length})?`)) return;
    setBusy("mass");
    let count = 0;
    for (const p of players) {
      try {
        await api.entities.Profile.update(p.id, { points: (p.points || 0) + amount });
        count += 1;
      } catch { /* skip */ }
    }
    setBusy("");
    await logAction("mass_gift", "", `Gifted ${amount} coins to ${count} players`);
    toast({ title: `Gifted ${amount} coins`, description: `${count} players received it.` });
    load();
  };

  const sendBroadcast = async () => {
    const msg = broadcast.trim();
    if (!msg) return;
    setBusy("broadcast");
    // Create a DM to each player from the admin
    let count = 0;
    for (const p of players) {
      if (p.created_by_id === profile?.created_by_id) continue;
      try {
        const threadKey = [profile.username, p.username].sort().join("__");
        await api.entities.DirectMessage.create({
          thread_key: threadKey,
          from_user_id: profile.created_by_id,
          to_user_id: p.created_by_id,
          from_username: profile.username,
          to_username: p.username,
          content: `📢 ${msg}`,
        });
        count += 1;
      } catch { /* skip */ }
    }
    setBusy("");
    setBroadcast("");
    toast({ title: "Broadcast sent", description: `${count} players received the message.` });
  };

  const deleteServer = async (srv) => {
    if (!window.confirm(`Delete server "${srv.name}"? This cannot be undone.`)) return;
    try {
      await api.entities.Server.delete(srv.id);
      await logAction("delete_server", srv.owner_username, `Deleted server "${srv.name}"`);
      setServers((list) => list.filter((s) => s.id !== srv.id));
      toast({ title: "Server deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
        <ShieldCheck className="h-8 w-8 text-danger" />
        <h1 className="font-display text-xl font-bold">Admins only</h1>
        <p className="max-w-xs text-sm text-muted-foreground">This panel is reserved for the owner and the admins they keep.</p>
        <Link to="/" className="mt-2 rounded-xl bg-muted px-4 py-2 text-sm">Back to chat</Link>
      </div>
    );
  }

  const totalCoins = players.reduce((sum, p) => sum + (p.points || 0), 0);
  const totalWins = players.reduce((sum, p) => sum + (p.games_won || 0), 0);
  const onlineNow = players.filter((p) => isOnline(p.last_seen)).length;
  const bannedCount = players.filter((p) => p.is_banned).length;
  const vipCount = players.filter((p) => p.vip).length;
  const modCount = players.filter((p) => p.moderator).length;
  const adminCount = players.filter((p) => p.is_admin).length;

  const stats = [
    { icon: Users, label: "Players", value: players.length, color: "text-info" },
    { icon: Activity, label: "Online now", value: onlineNow, color: "text-success" },
    { icon: Coins, label: "Coins in play", value: totalCoins.toLocaleString(), color: "text-warning" },
    { icon: Trophy, label: "Games won", value: totalWins.toLocaleString(), color: "text-primary" },
    { icon: ShieldCheck, label: "Admins", value: adminCount, color: "text-primary" },
    { icon: Sparkles, label: "Moderators", value: modCount, color: "text-info" },
    { icon: Crown, label: "VIPs", value: vipCount, color: "text-warning" },
    { icon: Ban, label: "Banned", value: bannedCount, color: "text-danger" },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold leading-tight">Admin Control Center</h1>
            <p className="text-[11px] text-muted-foreground">Signed in as @{profile?.username}</p>
          </div>
          <button
            onClick={toggleDouble}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition",
              cfg?.double_points
                ? "border-warning/50 bg-warning/20 text-warning"
                : "border-border bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="h-3.5 w-3.5" /> 2× Coins {cfg?.double_points ? "on" : "off"}
          </button>
        </div>
        {/* Tabs */}
        <div className="mx-auto flex max-w-6xl gap-1 px-4 pb-2">
          {[
            { id: "overview", label: "Overview", icon: TrendingUp },
            { id: "players", label: "Players", icon: Users },
            { id: "servers", label: "Servers", icon: Server },
            { id: "reports", label: `Reports${reports.length ? ` (${reports.length})` : ""}`, icon: AlertTriangle },
            { id: "devices", label: `Devices${deviceBans.length ? ` (${deviceBans.length})` : ""}`, icon: Monitor },
            { id: "settings", label: "Settings", icon: Settings2 },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition",
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* Overview Tab */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-3">
                  <s.icon className={cn("h-4 w-4", s.color)} />
                  <p className="mt-1.5 font-display text-lg font-bold">{s.value}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Quick actions</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[100, 500, 1000, 5000].map((n) => (
                  <button
                    key={n}
                    onClick={() => massGift(n)}
                    disabled={busy === "mass"}
                    className="rounded-xl border border-border bg-muted/40 py-2.5 text-[12px] font-semibold text-foreground transition hover:border-primary/50 hover:bg-primary/10"
                  >
                    +{n} coins to all
                  </button>
                ))}
              </div>
            </div>

            {/* Broadcast */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold">Broadcast message</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Sends a DM to every player from you.</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={broadcast}
                  onChange={(e) => setBroadcast(e.target.value)}
                  maxLength={200}
                  placeholder="Type a message to all players…"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                />
                <button
                  onClick={sendBroadcast}
                  disabled={busy === "broadcast" || !broadcast.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 text-[12px] font-bold text-primary-foreground disabled:opacity-50"
                >
                  {busy === "broadcast" ? "Sending…" : <><Send className="h-3.5 w-3.5" /> Send</>}
                </button>
              </div>
            </div>

            {/* Recently joined */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-success" />
                <p className="text-sm font-semibold">Recently joined</p>
              </div>
              <div className="mt-3 space-y-1.5">
                {[...players].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2">
                    <ProfileAvatar avatarId={p.avatar_id} size={32} glow={false} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{p.display_name || p.username}</p>
                      <p className="truncate text-[10px] text-muted-foreground">@{p.username}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {formatLocalDate(p.created_date, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Players Tab */}
        {tab === "players" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search players by handle or name"
                  className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-1.5">
                <SortDesc className="h-3.5 w-3.5 text-muted-foreground" />
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={cn(
                      "rounded-lg px-2 py-1 text-[11px] font-medium transition",
                      sort === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              {sorted.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 transition hover:border-primary/30"
                >
                  <ProfileAvatar avatarId={player.avatar_id} size={38} glow={false} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
                      {player.display_name || player.username}
                      {player.is_admin && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                      {player.moderator && !player.is_admin && <Sparkles className="h-3.5 w-3.5 text-info" />}
                      {player.vip && <Crown className="h-3.5 w-3.5 text-warning" />}
                      {player.is_banned && <Ban className="h-3.5 w-3.5 text-danger" />}
                      {isOnline(player.last_seen) && <span className="h-2 w-2 rounded-full bg-online" />}
                      {hasCheat(player, "infinite_coins") && <InfinityIcon className="h-3.5 w-3.5 text-info" />}
                      {hasCheat(player, "double_coins") && <Zap className="h-3.5 w-3.5 text-warning" />}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      @{player.username} · {player.daily_streak || 0}d streak · {player.games_won || 0} wins
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-warning/10 px-2 py-1 text-[11px] font-bold text-warning">{formatPoints(player)}</span>
                  <button
                    onClick={() => resetHandle(player)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
                    title="Change handle"
                  >
                    <AtSign className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setEditing(player)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
                    title="Manage player"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      const reason = window.prompt(`Ban @${player.username}'s device? Enter a reason:`);
                      if (reason === null) return;
                      try {
                        await api.entities.DeviceBan.create({
                          banned_user_id: player.user_id || player.created_by_id,
                          banned_username: player.username,
                          reason: reason || "Banned by admin",
                          banned_at: new Date().toISOString(),
                          active: true,
                        });
                        await logAction("device_ban", player.username, reason || "Banned by admin");
                        toast({ title: "Device banned", description: `@${player.username}'s device is now blocked.` });
                        load();
                      } catch {
                        toast({ title: "Failed to ban device", variant: "destructive" });
                      }
                    }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-danger/10 text-danger transition hover:bg-danger/20"
                    title="Ban device"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {sorted.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No players found.</p>}
            </div>
          </div>
        )}

        {/* Servers Tab */}
        {tab === "servers" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 pb-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">{servers.length} servers</p>
            </div>
            {servers.map((srv) => (
              <div key={srv.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-xl">{srv.icon || "🛰️"}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{srv.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    Owner: @{srv.owner_username || "—"} · Join cost: {srv.join_cost || 0} coins
                  </p>
                </div>
                <button
                  onClick={() => deleteServer(srv)}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-danger/10 text-danger transition hover:bg-danger/20"
                  title="Delete server"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {servers.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No servers yet.</p>}
          </div>
        )}

        {/* Reports Tab */}
        {tab === "reports" && (
          <div className="space-y-2">
            {reports.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <AlertTriangle className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No pending reports.</p>
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-warning" />
                      <span className="text-[13px] font-semibold text-foreground">{r.reason}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatLocalDateTime(r.created_date)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Reported by @{r.reporter_username} · Author: @{r.author_username || "unknown"} · Type: {r.message_type}
                  </p>
                  {r.content_snapshot && (
                    <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-[12px] text-foreground">
                      "{r.content_snapshot}"
                    </div>
                  )}
                  {r.details && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">Details: {r.details}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        await api.entities.MessageReport.update(r.id, { status: "resolved" });
                        setReports((list) => list.filter((x) => x.id !== r.id));
                        toast({ title: "Report resolved" });
                      }}
                      className="rounded-lg bg-success/15 px-3 py-1.5 text-[11px] font-semibold text-success hover:bg-success/25"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={async () => {
                        await api.entities.MessageReport.update(r.id, { status: "dismissed" });
                        setReports((list) => list.filter((x) => x.id !== r.id));
                        toast({ title: "Report dismissed" });
                      }}
                      className="rounded-lg bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted/70"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Device Bans Tab */}
        {tab === "devices" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 pb-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">{deviceBans.length} active device bans</p>
            </div>
            {deviceBans.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Monitor className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No active device bans.</p>
              </div>
            ) : (
              deviceBans.map((ban) => (
                <div key={ban.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-mono text-foreground">{ban.device_fingerprint}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        @{ban.banned_username || "—"} · {ban.reason || "No reason"}
                      </p>
                      {ban.banned_at && (
                        <p className="text-[10px] text-muted-foreground">{formatLocalDateTime(ban.banned_at)}</p>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        await api.entities.DeviceBan.update(ban.id, { active: false });
                        setDeviceBans((list) => list.filter((b) => b.id !== ban.id));
                        toast({ title: "Device ban revoked" });
                      }}
                      className="shrink-0 rounded-lg bg-success/15 px-3 py-1.5 text-[11px] font-semibold text-success hover:bg-success/25"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <div className="space-y-3">
            {/* Welcome message */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Welcome message</p>
              </div>
              <textarea
                value={welcomeDraft}
                onChange={(e) => setWelcomeDraft(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Shown to new players on their first visit"
                className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
              <button onClick={saveWelcome} className="mt-2 rounded-lg bg-muted px-3 py-1.5 text-[11px] font-bold hover:bg-muted/70">
                Save message
              </button>
            </div>

            {/* Transfer limit */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Global transfer limit</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Default per-gift cap for all players. 0 = no limit.</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  value={globalLimit}
                  onChange={(e) => setGlobalLimit(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
                />
                <button onClick={saveGlobalLimit} className="rounded-lg bg-primary px-4 text-[12px] font-bold text-primary-foreground">
                  Set
                </button>
              </div>
            </div>

            {/* Maintenance mode */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Maintenance mode</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Temporarily restricts the app. Shows the message below to players.</p>
              <button
                onClick={toggleMaintenance}
                className={cn(
                  "mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-[12px] font-bold transition",
                  cfg?.maintenance_mode
                    ? "bg-danger/20 text-danger"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Wrench className="h-3.5 w-3.5" /> {cfg?.maintenance_mode ? "Maintenance ON" : "Maintenance OFF"}
              </button>
              {cfg?.maintenance_mode && (
                <>
                  <input
                    value={maintenanceDraft}
                    onChange={(e) => setMaintenanceDraft(e.target.value)}
                    maxLength={200}
                    placeholder="Maintenance message for players"
                    className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                  />
                  <button onClick={saveMaintenanceMsg} className="mt-1.5 w-full rounded-lg bg-muted py-1.5 text-[11px] font-bold hover:bg-muted/70">
                    Save message
                  </button>
                </>
              )}
            </div>

            {/* TURN relay config */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">TURN relay (optional)</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Off by default. Add TURN credentials to improve call reliability on restricted networks (school/corporate Wi-Fi). Free unlimited TURN does not exist.
              </p>
              <input
                value={turnUrls}
                onChange={(e) => setTurnUrls(e.target.value)}
                placeholder="turn:turn.example.com:3478,turn:turn.example.com:3478?transport=tcp"
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  value={turnUser}
                  onChange={(e) => setTurnUser(e.target.value)}
                  placeholder="TURN username"
                  className="h-10 rounded-lg border border-border bg-background px-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                />
                <input
                  value={turnCred}
                  onChange={(e) => setTurnCred(e.target.value)}
                  type="password"
                  placeholder="TURN credential"
                  className="h-10 rounded-lg border border-border bg-background px-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                />
              </div>
              <button onClick={saveTurnConfig} className="mt-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-primary-foreground">
                Save TURN config
              </button>
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl border border-danger/20 bg-danger/[0.03] p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <p className="text-sm font-semibold text-danger">Danger zone</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Admin actions are permanent. Player deletions and server removals cannot be undone.
              </p>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <PlayerEditor
          player={editing}
          onPatch={patch}
          onClose={() => setEditing(null)}
          onDelete={async (player) => {
            try {
              await api.entities.Profile.delete(player.id);
              setPlayers((list) => list.filter((p) => p.id !== player.id));
              setEditing(null);
              toast({ title: "Account deleted", description: `@${player.username} is gone.` });
            } catch {
              toast({ title: "Action blocked", description: "Deleting accounts needs platform admin rights.", variant: "destructive" });
            }
          }}
        />
      )}
    </div>
  );
}