import React, { useState, useEffect } from "react";
import { X, Loader2, ShieldCheck, Ban, DoorOpen, Trash2, Crown, Sparkles, MicOff, Coins, Check, ArrowLeftRight, Trash, Pencil, Monitor, Mail, Hash } from "lucide-react";
import { api } from "@/api/client";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { CHEAT_CODES, hasCheat, formatCoins, TRANSFER_LIMIT_DEFAULT, transferLimitFor } from "@/lib/economy";
import { cn } from "@/lib/utils";

const MUTE_OPTIONS = [
  { label: "10m", minutes: 10 },
  { label: "1h", minutes: 60 },
  { label: "1d", minutes: 1440 },
  { label: "7d", minutes: 10080 },
];

export default function PlayerEditor({ player, onPatch, onDelete, onClose }) {
  const [name, setName] = useState(player.display_name || "");
  const [username, setUsername] = useState(player.username || "");
  const [points, setPoints] = useState(player.points || 0);
  const [transferLimit, setTransferLimit] = useState(player.transfer_limit || TRANSFER_LIMIT_DEFAULT);
  const [banReason, setBanReason] = useState(player.ban_reason || "");
  const [busy, setBusy] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [deviceBans, setDeviceBans] = useState([]);

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy("");
    }
  };

  const toggleCheat = (code) =>
    run(`cheat-${code}`, async () => {
      const list = Array.isArray(player.cheat_codes) ? [...player.cheat_codes] : [];
      const next = list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
      await onPatch(player, { cheat_codes: next });
    });

  const mute = (minutes) =>
    run("mute", async () => {
      const until = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : "";
      await onPatch(player, { muted_until: until });
    });

  const muted = player.muted_until && new Date(player.muted_until) > new Date();

  useEffect(() => {
    const uid = player.user_id || player.created_by_id;
    if (!uid) return;
    (async () => {
      try {
        const page = await api.entities.User.filter({ _id: uid }, { limit: 1 });
        setUserEmail(page?.items?.[0]?.email || "");
      } catch { /* best-effort */ }
      try {
        const bans = await api.entities.DeviceBan.filter({ banned_user_id: uid, active: true }, { limit: 50 });
        setDeviceBans(bans?.items || []);
      } catch { /* best-effort */ }
    })();
  }, [player.user_id, player.created_by_id]);

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl"
      >
        <div className="flex items-center gap-3">
          <ProfileAvatar avatarId={player.avatar_id} size={44} glow={false} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-foreground">{player.display_name || player.username}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              @{player.username} · {formatCoins(player)} coins
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Account info: email + user ID (admin only) */}
        <div className="mt-2 rounded-xl border border-border bg-muted/30 p-2.5 space-y-1.5">
          <div className="flex items-center gap-2 text-[11px]">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span className="truncate font-medium text-foreground">{userEmail || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">User ID:</span>
            <span className="truncate font-mono text-[10px] text-foreground">{player.user_id || player.created_by_id || "—"}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
              className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => run("save", () => onPatch(player, { display_name: name.trim().slice(0, 24), username: username.trim() || player.username }))}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-muted py-2 text-[12px] font-semibold text-foreground transition hover:bg-muted/70"
        >
          {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save name & username
        </button>

        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Coins className="h-3 w-3" /> Coin balance
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => run("points", () => onPatch(player, { points: Math.round(Number(points) || 0) }))}
              className="rounded-lg bg-warning px-3 text-[12px] font-bold text-warning-foreground"
            >
              {busy === "points" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Set"}
            </button>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {[100, 1000, 5000].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => run(`gift-${n}`, () => onPatch(player, { points: (player.points || 0) + n }))}
                className="flex-1 rounded-lg bg-white/[0.06] py-1 text-[10.5px] font-semibold text-muted-foreground hover:text-foreground"
              >
                +{n}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">Ranks</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {[
            { key: "is_admin", label: "Admin", icon: ShieldCheck, on: player.is_admin },
            { key: "moderator", label: "Mod", icon: Sparkles, on: player.moderator },
            { key: "vip", label: "VIP", icon: Crown, on: player.vip },
          ].map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => run(r.key, () => onPatch(player, { [r.key]: !r.on }))}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[11px] font-semibold transition",
                r.on ? "border-primary bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <r.icon className="h-3.5 w-3.5" /> {r.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">Message permissions</p>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => run("del-msg", () => onPatch(player, { can_delete_messages: !player.can_delete_messages }))}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[11px] font-semibold transition",
              player.can_delete_messages ? "border-danger/50 bg-danger/10 text-danger" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Trash className="h-3.5 w-3.5" /> Delete any
          </button>
          <button
            type="button"
            onClick={() => run("edit-msg", () => onPatch(player, { can_edit_messages: !player.can_edit_messages }))}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[11px] font-semibold transition",
              player.can_edit_messages ? "border-info/50 bg-info/10 text-info" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit any
          </button>
        </div>

        <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">Power-ups</p>
        <div className="mt-1.5 space-y-1.5">
          {CHEAT_CODES.map((cheat) => (
            <button
              key={cheat.id}
              type="button"
              onClick={() => toggleCheat(cheat.id)}
              className={cn(
                "flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left transition",
                hasCheat(player, cheat.id) ? "border-info/50 bg-info/10" : "border-border hover:bg-muted/60"
              )}
            >
              <span
                className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  hasCheat(player, cheat.id) ? "bg-info" : "bg-muted-foreground/40"
                )}
              />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold text-foreground">{cheat.label}</span>
                <span className="block text-[11px] leading-snug text-muted-foreground">{cheat.description}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">Moderation</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {MUTE_OPTIONS.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => mute(m.minutes)}
              className="flex items-center gap-1 rounded-lg bg-warning/10 px-2.5 py-1.5 text-[11px] font-semibold text-warning hover:bg-warning/20"
            >
              <MicOff className="h-3 w-3" /> {m.label}
            </button>
          ))}
          {muted && (
            <button
              type="button"
              onClick={() => mute(0)}
              className="rounded-lg bg-success/15 px-2.5 py-1.5 text-[11px] font-semibold text-success"
            >
              unmute
            </button>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <ArrowLeftRight className="h-3 w-3" /> Transfer limit
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="number"
              value={transferLimit}
              onChange={(e) => setTransferLimit(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => run("limit", () => onPatch(player, { transfer_limit: Math.max(0, Math.round(Number(transferLimit) || 0)) }))}
              className="rounded-lg bg-primary px-3 text-[12px] font-bold text-primary-foreground"
            >
              {busy === "limit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Set"}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Current limit: {transferLimitFor(player).toLocaleString()} coins per gift · 0 = no limit</p>
          <div className="mt-1.5 flex gap-1.5">
            {[0, 100000, 500000].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => run(`lim-${n}`, () => onPatch(player, { transfer_limit: n }))}
                className="flex-1 rounded-lg bg-white/[0.06] py-1 text-[10.5px] font-semibold text-muted-foreground hover:text-foreground"
              >
                {n === 0 ? "∞" : n.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => run("kick", () => onPatch(player, { kicked_at: new Date().toISOString() }))}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-orange-500/15 py-2 text-[11.5px] font-semibold text-orange-300 hover:bg-orange-500/25"
          >
            <DoorOpen className="h-3.5 w-3.5" /> Kick
          </button>
          <button
            type="button"
            onClick={() => run("ban", () => onPatch(player, { is_banned: !player.is_banned, ban_reason: !player.is_banned ? banReason || "Banned by admin" : "" }))}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11.5px] font-semibold",
              player.is_banned ? "bg-success/15 text-success hover:bg-success/25" : "bg-danger/15 text-danger hover:bg-danger/25"
            )}
          >
            <Ban className="h-3.5 w-3.5" /> {player.is_banned ? "Unban" : "Ban"}
          </button>
        </div>

        {player.is_banned && (
          <div className="mt-1.5">
            <input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Ban reason (optional)"
              maxLength={120}
              className="h-9 w-full rounded-lg border border-rose-500/20 bg-background px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-rose-500/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => run("reason", () => onPatch(player, { ban_reason: banReason.trim() }))}
              className="mt-1 w-full rounded-lg bg-muted py-1.5 text-[10.5px] font-semibold text-muted-foreground hover:text-foreground"
            >
              {busy === "reason" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save reason"}
            </button>
          </div>
        )}

        <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Monitor className="h-3 w-3" /> Device bans
        </p>
        <div className="mt-1.5 space-y-1.5">
          {deviceBans.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No active device bans for this player.</p>
          ) : (
            deviceBans.map((ban) => (
              <div key={ban.id} className="rounded-lg border border-danger/30 bg-danger/[0.04] px-2.5 py-2">
                <p className="truncate text-[10.5px] font-mono text-foreground">{ban.device_fingerprint}</p>
                <p className="text-[10px] text-muted-foreground">{ban.reason || "No reason"} · {new Date(ban.banned_at).toLocaleDateString()}</p>
                <button
                  type="button"
                  onClick={() => run(`unban-dev-${ban.id}`, async () => {
                    await api.entities.DeviceBan.update(ban.id, { active: false });
                    setDeviceBans((list) => list.filter((b) => b.id !== ban.id));
                  })}
                  className="mt-1 rounded-lg bg-success/15 px-2.5 py-1 text-[10.5px] font-semibold text-success hover:bg-success/25"
                >
                  Revoke ban
                </button>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(`Delete @${player.username} permanently? This cannot be undone.`)) return;
            setBusy("delete");
            try {
              await onDelete?.(player);
              onClose();
            } finally {
              setBusy("");
            }
          }}
          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-danger/30 py-2 text-[11.5px] font-semibold text-danger transition hover:bg-danger/15"
        >
          {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete account
        </button>
      </div>
    </div>
  );
}