import React from "react";
import { levelFromXp, rankTitleForLevel, rankColorForLevel } from "@/lib/leveling";
import { Award } from "lucide-react";

export default function RankCard({ username, totalXp, level, rankColor, rankTitle, display_name, avatar_id }) {
  const { level: calcLevel, xpIntoLevel, xpForNext } = levelFromXp(totalXp || 0);
  const lvl = level ?? calcLevel;
  const progress = Math.round((xpIntoLevel / xpForNext) * 100);
  const color = rankColor || rankColorForLevel(lvl);
  const title = rankTitle || rankTitleForLevel(lvl);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-lg" style={{ borderColor: color + "40" }}>
      <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${color} 0%, transparent 60%)` }} />
      <div className="relative z-10 flex items-center gap-4">
        <div className="relative">
          <div className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-bold text-white" style={{ background: color }}>
            {lvl}
          </div>
          <Award className="absolute -bottom-1 -right-1 h-6 w-6" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold text-foreground">{display_name || username}</h3>
          <p className="text-[12px] font-semibold" style={{ color }}>{title}</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Level {lvl}</span>
              <span>{xpIntoLevel} / {xpForNext} XP</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: color }} />
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold" style={{ color }}>{totalXp?.toLocaleString() || 0}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total XP</p>
        </div>
      </div>
    </div>
  );
}