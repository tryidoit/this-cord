// ThisCord Plus subscription — bought with coins, no real money

import { api } from "@/api/client";

export const PLUS_COST = 5000; // 5000 coins per month
export const PLUS_DURATION_DAYS = 30;

export const PLUS_BENEFITS = [
  { icon: "🖼️", title: "Larger asset caps", desc: "Upload bigger files and images" },
  { icon: "📝", title: "Longer messages", desc: "4000 character limit (vs 2000)" },
  { icon: "✨", title: "Animated avatars & banners", desc: "Use animated profile decorations everywhere" },
  { icon: "😎", title: "Custom emoji everywhere", desc: "Use your server emoji in any DM" },
  { icon: "🌟", title: "Profile effects", desc: "Exclusive animated profile effects" },
  { icon: "🚀", title: "Extra boost slots", desc: "2 server boost slots instead of 1" },
];

export function isPlus(profile) {
  if (!profile?.thiscord_plus_until) return false;
  return new Date(profile.thiscord_plus_until).getTime() > Date.now();
}

export function plusDaysRemaining(profile) {
  if (!isPlus(profile)) return 0;
  const ms = new Date(profile.thiscord_plus_until).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function purchasePlus(profile, applyProfile) {
  if (!profile?.id) return null;
  if (isPlus(profile)) return profile;
  if ((profile.points || 0) < PLUS_COST) {
    throw new Error("Not enough coins");
  }
  const until = new Date(Date.now() + PLUS_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const updated = await api.entities.Profile.update(profile.id, {
    points: (profile.points || 0) - PLUS_COST,
    thiscord_plus_until: until,
  });
  applyProfile(updated);
  return updated;
}