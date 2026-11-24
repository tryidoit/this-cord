import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Gift, Flame, Loader2 } from "lucide-react";
import { api } from "@/api/client";
import { dailyRewardFor, nextDailyStreak, todayKey } from "@/lib/economy";

// Daily login reward — the reward grows by 5 coins for every consecutive day.
export default function DailyReward({ profile, config, onClaimed }) {
  const streak = nextDailyStreak(profile);
  const reward = dailyRewardFor(streak);
  const [saving, setSaving] = useState(false);

  const claim = async () => {
    setSaving(true);
    try {
      const { profile: updated, reward: paid } = await api.economy.daily(todayKey());
      onClaimed?.(updated, paid);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-background/90 px-5 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 210, damping: 20 }}
        className="w-full max-w-sm rounded-3xl border border-amber-300/20 bg-gradient-to-b from-[#16120A] to-[#0B0B12] p-7 text-center shadow-[0_30px_110px_-24px_rgba(251,191,36,0.55)]"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-warning/15 text-warning">
          <Gift className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold text-foreground">Daily reward</h2>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-warning/80">
          <Flame className="h-4 w-4" /> {streak} day streak
        </p>

        <div className="my-6 flex justify-center gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => {
            const day = i + 1;
            const active = day <= streak;
            return (
              <div
                key={day}
                className={`flex h-14 w-9 flex-col items-center justify-center rounded-lg border text-[10px] font-semibold ${
                  active
                    ? "border-warning/60 bg-warning/20 text-warning"
                    : "border-white/10 bg-white/5 text-foreground/35"
                }`}
              >
                <span>{day}</span>
                <span className="mt-0.5 text-[11px]">{day * 5}</span>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-foreground/60">
          Claim <span className="font-bold text-warning">+{reward} coins</span> — come back tomorrow for {reward + 5}.
        </p>

        <Button
          onClick={claim}
          disabled={saving}
          className="mt-5 h-12 w-full bg-gradient-to-r from-amber-300 to-amber-500 font-bold text-black hover:opacity-90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Claim ${reward} That`}
        </Button>
        <button
          onClick={() => onClaimed?.(null, 0)}
          className="mt-3 text-xs text-foreground/30 transition hover:text-foreground/60"
        >
          later
        </button>
      </motion.div>
    </div>
  );
}