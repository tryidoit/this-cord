import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Flame, Gamepad2, Trophy } from "lucide-react";
import { api } from "@/api/client";
import { useProfile } from "@/lib/ProfileContext";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { formatPoints } from "@/lib/economy";
import { cn } from "@/lib/utils";

const MEDALS = ["from-amber-300 to-amber-500", "from-slate-200 to-slate-400", "from-orange-300 to-orange-600"];

export default function Leaderboard() {
  const { profile } = useProfile();
  const [rows, setRows] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const page = await api.entities.Profile.filter({}, { sort: "-points", limit: 50 });
        if (!alive) return;
        setRows((page?.items || []).filter((p) => !p.is_banned));
        if (profile) {
          try {
            const ahead = await api.entities.Profile.count({ points: { $gt: profile.points || 0 } });
            if (alive) setMyRank(ahead + 1);
          } catch {
            setMyRank(null);
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [profile?.id]);

  const top = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.16),transparent_55%)]" />
        <div className="relative mx-auto flex max-w-3xl items-center gap-3 px-5 py-5">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 font-display text-xl font-bold">
              <Trophy className="h-5 w-5 text-warning" /> Coin leaderboard
            </h1>
            <p className="text-[12px] text-muted-foreground">The richest players on This-Cord right now</p>
          </div>
          {myRank && (
            <div className="rounded-2xl border border-border bg-card px-4 py-2 text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Your rank</p>
              <p className="font-display text-lg font-bold text-warning">#{myRank}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No players ranked yet.</p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-3 items-end gap-2 sm:gap-3">
              {top.map((p, i) => (
                <div key={p.id} className={cn("rounded-2xl border border-border bg-card p-3 text-center", i === 0 && "pb-5")}>
                  <div className={cn("mx-auto grid w-fit place-items-center rounded-full bg-gradient-to-br p-[2px]", MEDALS[i])}>
                    <ProfileAvatar avatarId={p.avatar_id} size={i === 0 ? 62 : 50} glow={false} />
                  </div>
                  <p className="mt-2 truncate text-[13px] font-semibold">{p.display_name || p.username}</p>
                  <p className="truncate text-[10px] text-muted-foreground">@{p.username}</p>
                  <p className="mt-1 flex items-center justify-center gap-1 text-[12px] font-bold text-warning">
                    <Crown className="h-3 w-3" /> {formatPoints(p)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              {rest.map((p, i) => {
                const isMe = p.id === profile?.id;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition",
                      isMe ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:bg-muted/60"
                    )}
                  >
                    <span className="w-7 text-center font-display text-[13px] font-bold text-muted-foreground">{i + 4}</span>
                    <ProfileAvatar avatarId={p.avatar_id} size={36} glow={false} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">
                        {p.display_name || p.username} {isMe && <span className="text-[10px] text-primary">you</span>}
                      </p>
                      <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="truncate">@{p.username}</span>
                        <span className="flex items-center gap-0.5">
                          <Flame className="h-2.5 w-2.5" /> {p.daily_streak || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Gamepad2 className="h-2.5 w-2.5" /> {p.games_won || 0}
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-[13px] font-bold text-warning">{formatPoints(p)}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}