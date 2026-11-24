// Leveling system — XP curve, rank titles, role rewards

// XP needed to reach next level: level * 100 + level^2 * 50
export function xpForLevel(level) {
  return Math.floor(level * 100 + level * level * 50);
}

// Total XP needed to reach a given level
export function totalXpForLevel(level) {
  let total = 0;
  for (let l = 0; l < level; l++) {
    total += xpForLevel(l);
  }
  return total;
}

// Calculate level from total XP
export function levelFromXp(totalXp) {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, xpIntoLevel: remaining, xpForNext: xpForLevel(level) };
}

// XP per message (with cooldown handled by caller)
export function xpPerMessage() {
  return Math.floor(Math.random() * 11) + 15; // 15-25 XP
}

// Rank titles based on level
export function rankTitleForLevel(level) {
  if (level >= 100) return "Legend";
  if (level >= 75) return "Mythic";
  if (level >= 50) return "Master";
  if (level >= 40) return "Diamond";
  if (level >= 30) return "Platinum";
  if (level >= 20) return "Gold";
  if (level >= 15) return "Silver";
  if (level >= 10) return "Bronze";
  if (level >= 5) return "Apprentice";
  if (level >= 1) return "Novice";
  return "Unranked";
}

// Rank color based on level
export function rankColorForLevel(level) {
  if (level >= 75) return "#a855f7";
  if (level >= 50) return "#6366f1";
  if (level >= 40) return "#06b6d4";
  if (level >= 30) return "#3b82f6";
  if (level >= 20) return "#eab308";
  if (level >= 15) return "#94a3b8";
  if (level >= 10) return "#cd7f32";
  if (level >= 5) return "#22c55e";
  return "#6b7280";
}

// Progress percentage for current level
export function levelProgress(totalXp) {
  const { level, xpIntoLevel, xpForNext } = levelFromXp(totalXp);
  return Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100));
}