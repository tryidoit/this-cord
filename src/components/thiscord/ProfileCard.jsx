import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Phone, Video, Gift, X, ShieldCheck, Crown, Check, Pencil, Sparkles, UserPlus, Link2, Clock } from "lucide-react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { useProfile } from "@/lib/ProfileContext";
import { formatCoins, isVip, isOnline } from "@/lib/economy";
import { cn } from "@/lib/utils";

export default function ProfileCard({ player, onClose, onDm, onCall, onGift, onAddFriend, friendshipStatus }) {
  const { profile, nicknameFor, setNickname, isAdmin } = useProfile();
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState(nicknameFor(player.username, ""));
  const [saving, setSaving] = useState(false);

  if (!player) return null;
  const mine = player.created_by_id === profile?.created_by_id;
  const online = isOnline(player.last_seen) && player.presence_status !== "invisible";
  const nick = profile?.nicknames?.[player.username];
  const display = nick || player.display_name || player.username;
  const memberSince = player.created_date ? new Date(player.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  const statusText = player.custom_status || player.status_text;

  const saveNick = async () => {
    setSaving(true);
    try {
      await setNickname(player.username, nickDraft);
      setEditingNick(false);
    } finally {
      setSaving(false);
    }
  };

  const renderPresenceDot = () => {
    const status = online ? (player.presence_status || "online") : "offline";
    const color = { online: "bg-online", idle: "bg-idle", dnd: "bg-danger", invisible: "bg-muted", offline: "bg-muted" }[status] || "bg-muted";
    return <span className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card", color)} />;
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[21rem] overflow-hidden rounded-[26px] border border-border bg-card shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)]"
      >
        {/* Banner */}
        <div className="relative h-20 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.55),transparent_60%),linear-gradient(120deg,hsl(var(--accent)),hsl(var(--card)))]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-background/30 text-foreground/80 transition hover:bg-background/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="-mt-8 flex items-end justify-between">
            <div className="relative">
              <ProfileAvatar avatarId={player.avatar_id} size={64} className="ring-4 ring-card" />
              {renderPresenceDot()}
            </div>
            <span className="mb-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {online ? (player.presence_status || "online") : "offline"}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <p className="truncate font-display text-lg font-bold text-foreground">{display}</p>
            {player.is_admin && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />}
            {player.moderator && !player.is_admin && <Sparkles className="h-3.5 w-3.5 shrink-0 text-info" />}
            {isVip(player) && <Crown className="h-3.5 w-3.5 shrink-0 text-warning" />}
          </div>
          <p className="truncate text-[12px] text-muted-foreground">
            @{player.username}
            {player.pronouns && <span className="ml-1.5 text-[10px] text-muted-foreground/70">· {player.pronouns}</span>}
            {nick && <span className="ml-1 text-[10px] text-primary">· your nickname</span>}
          </p>

          {statusText && (
            <p className="mt-1 text-[11px] italic text-muted-foreground">{statusText}</p>
          )}

          {player.rich_presence && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Playing {player.rich_presence}
            </div>
          )}

          {(player.about_me || player.bio) ? (
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/60 px-3 py-2 text-[12.5px] leading-relaxed text-foreground/90">
              {player.about_me || player.bio}
            </p>
          ) : (
            <p className="mt-3 text-[12px] italic text-muted-foreground">No bio yet.</p>
          )}

          {/* Links */}
          {player.links && player.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {player.links.slice(0, 4).map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Link2 className="h-3 w-3" /> {link.label || link.url}
                </a>
              ))}
            </div>
          )}

          {/* Badges */}
          {player.badges && player.badges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {player.badges.map((badge, i) => (
                <span key={i} className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">{badge}</span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="font-semibold text-warning">{formatCoins(player)} coins</span>
            <span>·</span>
            <span>{player.games_won || 0} wins</span>
            <span>·</span>
            <span>{player.daily_streak || 0}d streak</span>
          </div>

          {memberSince && (
            <p className="mt-1 text-[10px] text-muted-foreground">Member since {memberSince}</p>
          )}

          {/* Action buttons */}
          {!mine && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onDm?.(player)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-[12px] font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.98]"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Message
                </button>
                <button
                  type="button"
                  onClick={() => onGift?.(player)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-warning/15 py-2 text-[12px] font-semibold text-warning transition hover:bg-warning/25 active:scale-[0.98]"
                >
                  <Gift className="h-3.5 w-3.5" /> Gift
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onCall?.(player, "voice")}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-success/15 py-2 text-[12px] font-semibold text-success transition hover:bg-success/25 active:scale-[0.98]"
                >
                  <Phone className="h-3.5 w-3.5" /> Voice
                </button>
                <button
                  type="button"
                  onClick={() => onCall?.(player, "video")}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-info/15 py-2 text-[12px] font-semibold text-info transition hover:bg-info/25 active:scale-[0.98]"
                >
                  <Video className="h-3.5 w-3.5" /> Video
                </button>
              </div>
              {/* Add friend / friend status */}
              {friendshipStatus === "accepted" ? (
                <div className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-success/10 py-2 text-[12px] font-semibold text-success">
                  <Check className="h-3.5 w-3.5" /> Friends
                </div>
              ) : friendshipStatus === "pending" ? (
                <div className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-muted py-2 text-[12px] font-semibold text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Pending
                </div>
              ) : friendshipStatus !== "blocked" && (
                <button
                  type="button"
                  onClick={() => onAddFriend?.(player.username)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-muted/60 py-2 text-[12px] font-semibold text-foreground transition hover:bg-muted active:scale-[0.98]"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add Friend
                </button>
              )}
            </>
          )}

          {/* Nickname editor */}
          <div className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
            {editingNick ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nickDraft}
                  onChange={(e) => setNickDraft(e.target.value)}
                  placeholder="Nickname only you see"
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={saveNick}
                  disabled={saving}
                  className="grid h-6 w-6 place-items-center rounded-lg bg-primary text-primary-foreground"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingNick(true)}
                className="flex w-full items-center gap-1.5 text-left text-[11px] text-muted-foreground transition hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
                {nick ? `Nickname: ${nick}` : "Set a nickname only you can see"}
              </button>
            )}
          </div>

          {isAdmin && (
            <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
              {player.is_banned ? "banned" : player.muted_until && new Date(player.muted_until) > new Date() ? "muted" : "active"}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}