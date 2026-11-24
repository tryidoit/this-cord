import { api } from "@/api/client";

// Device bans are enforced by the server against a server-issued, HttpOnly device cookie
// (a client-computed fingerprint could be edited or cleared by the person being banned).
export async function checkDeviceBan() {
  try {
    const s = await api.auth.deviceStatus();
    return s?.banned ? { reason: s.reason } : null;
  } catch {
    return null;
  }
}

// Admin action: ban every device the user has signed in from.
export async function banDevice(_fingerprint, userId, username, reason) {
  return api.entities.DeviceBan.create({
    banned_user_id: userId || "",
    banned_username: username || "",
    reason: reason || "Banned by admin",
    banned_at: new Date().toISOString(),
    active: true,
  });
}

export async function unbanDevice(fingerprint) {
  const page = await api.entities.DeviceBan.filter({ device_fingerprint: fingerprint, active: true }, { limit: 50 });
  for (const ban of page?.items || []) await api.entities.DeviceBan.update(ban.id, { active: false });
}
