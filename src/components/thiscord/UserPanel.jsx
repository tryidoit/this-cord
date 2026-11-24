import React, { useEffect, useState } from "react";
import { Coins, Settings2, LogOut, Timer } from "lucide-react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { formatPoints, minutesUntilSessionReward, isInfinite, hasCheat } from "@/lib/economy";
import { api } from "@/api/client";

function countdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function UserPanel({ profile, onOpenProfile }) {
  const [seconds, setSeconds] = useState(minutesUntilSessionReward(profile));

  useEffect(() => {
    setSeconds(minutesUntilSessionReward(profile));
    const timer = setInterval(() => setSeconds(minutesUntilSessionReward(profile)), 1000);
    return () => clearInterval(timer);
  }, [profile]);

  const logout = async () => {
    await api.auth.logout();
    window.location.href = "/login";
  };

  return (
    <div className="relative z-10 border-t border-border bg-card/95 p-2.5 backdrop-blur">
      <div className="mb-2 flex items-center justify-between rounded-xl bg-muted/70 px-2.5 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-warning">
          <Coins className="h-3.5 w-3.5" />
          {formatPoints(profile)}
        </span>
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground" title="Next presence reward">
          <Timer className="h-3 w-3" />
          {seconds > 0 ? countdown(seconds) : "claiming"}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-muted/60">
        <button onClick={onOpenProfile} className="relative shrink-0">
          <ProfileAvatar avatarId={profile?.avatar_id} size={36} />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-online" />
        </button>
        <button onClick={onOpenProfile} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-foreground">
            {profile?.display_name || profile?.username}
            {hasCheat(profile, "vip_badge") && <span className="ml-1.5 text-[10px] font-bold text-warning">VIP</span>}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">@{profile?.username}</p>
        </button>
        <button onClick={onOpenProfile} title="Settings" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <Settings2 className="h-4 w-4" />
        </button>
        <button onClick={logout} title="Log out" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-danger/15 hover:text-danger">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      {isInfinite(profile) && (
        <p className="mt-1 px-2 text-[10px] uppercase tracking-widest text-info/70">infinite That active</p>
      )}
    </div>
  );
}