import { todayKey, yesterdayKey } from "@/lib/time";

// The app's currency is "coins".
export const CHEAT_CODES = [
  { id: "double_coins", label: "2× Coins", description: "Doubles every coin reward this player earns." },
  { id: "infinite_coins", label: "Infinite Coins", description: "Purchases are free and the balance never drops." },
  { id: "vip_badge", label: "VIP Badge", description: "Golden VIP badge, +25% coins and a free ringtone slot." },
  { id: "mod_power", label: "Moderator", description: "Grants the moderator rank: mute and kick powers." },
  { id: "ghost", label: "Ghost Mode", description: "Appears offline to everyone in the app." },
  { id: "name_glow", label: "Neon Name", description: "Their name glows in chat and on the leaderboard." },
];

export const SESSION_REWARD_COINS = 15;
export const SESSION_REWARD_MINUTES = 5;
export const GAME_WIN_COINS = 8;
export const GAME_WIN_THAT = GAME_WIN_COINS;
export const PFP_UPLOAD_COST = 3000;
export const TRANSFER_LIMIT_DEFAULT = 50000;
export const HANDLE_CHANGE_COST = 500;

// Backward-compatible aliases
export const SESSION_REWARD_THAT = SESSION_REWARD_COINS;

export function hasCheat(profile, code) {
  return Array.isArray(profile?.cheat_codes) && profile.cheat_codes.includes(code);
}

export function isInfinite(profile) {
  return hasCheat(profile, "infinite_coins");
}

export function isVip(profile) {
  return !!profile?.vip || hasCheat(profile, "vip_badge");
}

export function multiplierFor(profile, config) {
  let m = 1;
  if (config?.double_points) m *= 2;
  if (hasCheat(profile, "double_coins")) m *= 2;
  if (isVip(profile)) m *= 1.25;
  return m;
}

export function formatCoins(profile) {
  return isInfinite(profile) ? "∞" : new Intl.NumberFormat("en-US").format(Math.round(profile?.points || 0));
}

// Backward-compatible aliases
export const formatThat = formatCoins;
export const formatPoints = formatCoins;

export { todayKey, yesterdayKey };

export function canClaimDaily(profile) {
  return !!profile && profile.last_daily_claim !== todayKey();
}

export function nextDailyStreak(profile) {
  if (!profile) return 1;
  if (profile.last_daily_claim === yesterdayKey()) return (profile.daily_streak || 0) + 1;
  if (profile.last_daily_claim === todayKey()) return Math.max(1, profile.daily_streak || 1);
  return 1;
}

export function dailyRewardFor(streak) {
  return 10 * Math.max(1, streak);
}

export function transferLimitFor(profile, config) {
  if (!profile) return config?.global_transfer_limit || TRANSFER_LIMIT_DEFAULT;
  if (typeof profile.transfer_limit === "number" && profile.transfer_limit > 0) return profile.transfer_limit;
  return config?.global_transfer_limit || TRANSFER_LIMIT_DEFAULT;
}

export function minutesUntilSessionReward(profile) {
  const last = profile?.last_session_claim ? new Date(profile.last_session_claim).getTime() : 0;
  const remaining = SESSION_REWARD_MINUTES * 60 * 1000 - (Date.now() - last);
  return Math.max(0, Math.ceil(remaining / 1000));
}

export function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 3 * 60 * 1000;
}