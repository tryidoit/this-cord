import React, { useState, useEffect } from "react";
import { Target, Trophy, Check, Loader2, Calendar, Star, Flame, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_DAILY_QUESTS, DEFAULT_WEEKLY_QUESTS, ACHIEVEMENTS, getQuestProgress, isQuestComplete, getEarnedAchievements, getPendingAchievements, loadSeasonalQuests, getStreakBonus, getQuestDateKey } from "@/lib/quests";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/api/client";

export default function QuestsPanel({ profile, applyProfile, config }) {
  const [tab, setTab] = useState("daily");
  const [claiming, setClaiming] = useState(null);
  const [seasonalQuests, setSeasonalQuests] = useState([]);

  useEffect(() => {
    loadSeasonalQuests().then(setSeasonalQuests);
  }, []);

  if (!profile) return null;

  const quests = tab === "daily" ? DEFAULT_DAILY_QUESTS : DEFAULT_WEEKLY_QUESTS;
  const streakBonus = getStreakBonus(profile.daily_streak || 0);
  const earnedAchievements = getEarnedAchievements(profile);
  const pendingAchievements = getPendingAchievements(profile, {
    messages: 0, // would come from server stats
    games_won: profile.games_won || 0,
    coins_earned: profile.points || 0,
    avatars_owned: (profile.owned_avatars || []).length,
  });

  const claimReward = async (quest) => {
    setClaiming(quest.title);
    try {
      const type = quest.quest_type || tab;
      const { profile: updated } = await api.economy.questClaim({
        quest_type: type, metric: quest.metric, title: quest.title, period_key: getQuestDateKey(type),
      });
      applyProfile(updated);
    } catch (err) {
      toast({ title: "Couldn't claim", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-border p-2">
        {[
          { id: "daily", label: "Daily Quests", icon: Calendar },
          { id: "weekly", label: "Weekly Quests", icon: Star },
          { id: "seasonal", label: "Seasonal", icon: Gift },
          { id: "achievements", label: "Achievements", icon: Trophy },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Streak bonus banner */}
        {(profile.daily_streak || 0) > 0 && tab !== "achievements" && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3">
            <Flame className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{profile.daily_streak}-day streak!</p>
              {streakBonus.bonus > 0 && (
                <p className="text-xs text-muted-foreground">{streakBonus.label} active · +{streakBonus.bonus} coins bonus on claims</p>
              )}
            </div>
          </div>
        )}
        {tab === "seasonal" ? (
          <div className="space-y-2">
            {seasonalQuests.length > 0 ? seasonalQuests.map((quest, i) => {
              const progress = getQuestProgress(profile, quest.quest_type || "daily", quest.metric);
              const complete = isQuestComplete(profile, { ...quest, quest_type: quest.quest_type || "daily" });
              const pct = Math.min(100, (progress / quest.goal) * 100);
              return (
                <div key={i} className={cn("rounded-xl border p-3 transition", complete ? "border-success/30 bg-success/5" : "border-border bg-card")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{quest.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{quest.title}</p>
                        <p className="text-xs text-muted-foreground">{progress} / {quest.goal} · {quest.reward_that} coins reward</p>
                        {quest.season_name && <p className="text-[10px] text-primary">{quest.season_name}</p>}
                      </div>
                    </div>
                    {complete ? (
                      <button
                        onClick={() => claimReward(quest)}
                        disabled={claiming === quest.title}
                        className="flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:bg-success/90"
                      >
                        {claiming === quest.title ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Claim
                      </button>
                    ) : (
                      <Target className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center py-12 text-center">
                <Gift className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No seasonal events active.</p>
              </div>
            )}
          </div>
        ) : tab !== "achievements" ? (
          <div className="space-y-2">
            {quests.map((quest, i) => {
              const progress = getQuestProgress(profile, tab, quest.metric);
              const complete = isQuestComplete(profile, { ...quest, quest_type: tab });
              const pct = Math.min(100, (progress / quest.goal) * 100);
              return (
                <div key={i} className={cn("rounded-xl border p-3 transition", complete ? "border-success/30 bg-success/5" : "border-border bg-card")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{quest.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{quest.title}</p>
                        <p className="text-xs text-muted-foreground">{progress} / {quest.goal} · {quest.reward_that} coins reward</p>
                      </div>
                    </div>
                    {complete ? (
                      <button
                        onClick={() => claimReward(quest)}
                        disabled={claiming === quest.title}
                        className="flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:bg-success/90"
                      >
                        {claiming === quest.title ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Claim
                      </button>
                    ) : (
                      <Target className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="pt-2 text-center text-[11px] text-muted-foreground">Resets {tab === "daily" ? "at midnight" : "every Monday"}</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const earned = earnedAchievements.some((e) => e.id === a.id);
              return (
                <div key={a.id} className={cn("rounded-xl border p-3", earned ? "border-warning/30 bg-warning/5" : "border-border bg-card opacity-60")}>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-2xl", !earned && "grayscale")}>{a.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                    </div>
                    {earned && <Trophy className="ml-auto h-4 w-4 text-warning" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}