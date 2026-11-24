// Quest and achievement system — no AI, all rule-based

import { api } from "@/api/client";

import { DEFAULT_DAILY_QUESTS, DEFAULT_WEEKLY_QUESTS, ACHIEVEMENTS } from "@/lib/questDefs";
export { DEFAULT_DAILY_QUESTS, DEFAULT_WEEKLY_QUESTS, ACHIEVEMENTS };

// Streak bonus: bonus coins for maintaining daily streaks
export const STREAK_BONUSES = [
  { streak: 3, bonus: 25, label: "3-day streak" },
  { streak: 7, bonus: 75, label: "Week streak" },
  { streak: 14, bonus: 150, label: "Fortnight streak" },
  { streak: 30, bonus: 400, label: "Monthly streak" },
];

export function getStreakBonus(streak) {
  let bonus = 0;
  let label = "";
  for (const b of STREAK_BONUSES) {
    if (streak >= b.streak) { bonus = b.bonus; label = b.label; }
  }
  return { bonus, label };
}

// Periods are UTC so they match the server, which counts quest progress itself.
export function getQuestDateKey(type) {
  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (type === "weekly") day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return type === "daily" || type === "weekly" ? day.toISOString().slice(0, 10) : "";
}

export function getQuestProgress(profile, questType, metric) {
  if (!profile?.quest_progress) return 0;
  const dateKey = getQuestDateKey(questType);
  const key = `${questType}:${dateKey}:${metric}`;
  return profile.quest_progress[key] || 0;
}

export function isQuestComplete(profile, quest) {
  const progress = getQuestProgress(profile, quest.quest_type || "daily", quest.metric);
  return progress >= quest.goal;
}

export function getEarnedAchievements(profile) {
  const earned = profile?.achievements || [];
  return ACHIEVEMENTS.filter((a) => earned.includes(a.id));
}

export function getPendingAchievements(profile, stats) {
  return ACHIEVEMENTS.filter((a) => {
    if ((profile?.achievements || []).includes(a.id)) return false;
    const val = stats?.[a.metric] || 0;
    return val >= a.goal;
  });
}

// Load seasonal/admin-defined quests from the Quest entity
export async function loadSeasonalQuests() {
  try {
    const page = await api.entities.Quest.filter({ seasonal: true, enabled: true }, { limit: 20 });
    return (page?.items || []).map((q) => ({
      title: q.title,
      metric: q.metric,
      goal: q.goal,
      reward_that: q.reward_that,
      icon: q.icon || "🎯",
      quest_type: q.quest_type,
      season_name: q.season_name,
    }));
  } catch {
    return [];
  }
}

export async function checkAchievements(profile, applyProfile, stats) {
  if (!profile?.id) return;
  const earned = [...(profile.achievements || [])];
  let changed = false;
  for (const a of ACHIEVEMENTS) {
    if (earned.includes(a.id)) continue;
    const val = stats?.[a.metric] || 0;
    if (val >= a.goal) {
      earned.push(a.id);
      changed = true;
    }
  }
  if (changed) {
    const updated = await api.entities.Profile.update(profile.id, { achievements: earned });
    applyProfile(updated);
    return updated;
  }
  return profile;
}