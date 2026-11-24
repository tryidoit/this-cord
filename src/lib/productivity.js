// Productivity utilities: drafts, favorites, quiet hours, focus mode, export

import { api } from "@/api/client";

const DRAFT_KEY = "tc_drafts";

export function getDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}

export function getDraft(channelId) {
  const drafts = getDrafts();
  return drafts[channelId] || "";
}

export function saveDraft(channelId, text) {
  const drafts = getDrafts();
  if (text?.trim()) {
    drafts[channelId] = text;
  } else {
    delete drafts[channelId];
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

export function clearDraft(channelId) {
  const drafts = getDrafts();
  delete drafts[channelId];
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

// Favorites
export function toggleFavorite(profile, id, applyProfile) {
  if (!profile?.id) return;
  const favs = profile.favorites || [];
  const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
  api.entities.Profile.update(profile.id, { favorites: next }).then((updated) => applyProfile(updated));
}

export function isFavorite(profile, id) {
  return (profile?.favorites || []).includes(id);
}

// Quiet hours check
export function isInQuietHours(profile) {
  if (!profile?.quiet_hours_start || !profile?.quiet_hours_end) return false;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = profile.quiet_hours_start.split(":").map(Number);
  const [eh, em] = profile.quiet_hours_end.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start <= end) return minutes >= start && minutes < end;
  // overnight
  return minutes >= start || minutes < end;
}

export function shouldNotify(profile, channelId, fromUserId) {
  if (profile?.focus_mode) {
    return (profile.focus_whitelist || []).includes(channelId) || (profile.focus_whitelist || []).includes(fromUserId);
  }
  if (isInQuietHours(profile)) return false;
  return true;
}

// Export messages to downloadable file (browser-side)
export function exportMessages(messages, channelName) {
  const lines = messages.map((m) => {
    const time = new Date(m.created_date).toLocaleString();
    const author = m.author_username || m.from_username || "Unknown";
    const content = m.content || "";
    const attachment = m.attachment_url ? ` [attachment: ${m.attachment_type || "file"}]` : "";
    return `[${time}] ${author}: ${content}${attachment}`;
  });
  const header = `# Exported from #${channelName}\n# ${new Date().toLocaleString()}\n# ${messages.length} messages\n\n`;
  const blob = new Blob([header + lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${channelName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-export.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Translate using browser Translator API or open in Google Translate
export async function translateMessage(text, targetLang = "en") {
  // Check for browser Translator API (Chrome 116+)
  if (typeof window !== "undefined" && window.translator) {
    try {
      const result = await window.translator.translate(text, targetLang);
      return { translated: result, source: "browser" };
    } catch { /* fall through */ }
  }
  if (typeof window !== "undefined" && window.Translator) {
    try {
      const t = new window.Translator();
      const result = await t.translate(text, targetLang);
      return { translated: result, source: "browser" };
    } catch { /* fall through */ }
  }
  // Fallback: return a translate URL
  return { translated: null, url: `https://translate.google.com/?text=${encodeURIComponent(text)}&sl=auto&tl=${targetLang}&op=translate`, source: "external" };
}

export function hasBrowserTranslator() {
  return (typeof window !== "undefined" && (window.translator || window.Translator));
}

// Snooze notifications — stored in localStorage with expiry
const SNOOZE_KEY = "tc_snooze_until";

export function snoozeNotifications(minutes) {
  const until = Date.now() + minutes * 60 * 1000;
  localStorage.setItem(SNOOZE_KEY, String(until));
}

export function isSnoozed() {
  const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
  return until > Date.now();
}

export function clearSnooze() {
  localStorage.removeItem(SNOOZE_KEY);
}

export function snoozeRemaining() {
  const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
  const ms = until - Date.now();
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

// Reminders — stored in localStorage, shown when user is online
const REMINDERS_KEY = "tc_reminders";

export function getReminders() {
  try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) || "[]"); } catch { return []; }
}

export function addReminder(text, whenIso) {
  const reminders = getReminders();
  reminders.push({ id: Date.now().toString(), text, when: whenIso, done: false });
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

export function dismissReminder(id) {
  const reminders = getReminders().filter((r) => r.id !== id);
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

export function getDueReminders() {
  const now = Date.now();
  return getReminders().filter((r) => !r.done && new Date(r.when).getTime() <= now);
}

// Undo send — returns a cancel function
export function createUndoableSend(onSend, delayMs = 5000) {
  let cancelled = false;
  let timer;
  const promise = new Promise((resolve, reject) => {
    timer = setTimeout(async () => {
      if (cancelled) return reject(new Error("cancelled"));
      try { resolve(await onSend()); } catch (e) { reject(e); }
    }, delayMs);
  });
  const cancel = () => { cancelled = true; clearTimeout(timer); };
  return { promise, cancel };
}

// "Catch me up" digest — rule-based, no AI
export function buildDigest(messages, currentUserId, profile, reactions = []) {
  if (!messages?.length) return null;
  const myUsername = profile?.username?.toLowerCase();
  const now = Date.now();

  // Filter to unread (simplified: all messages in the last check window)
  const recent = messages.filter((m) => {
    const age = now - new Date(m.created_date).getTime();
    return age < 24 * 60 * 60 * 1000; // last 24h
  });

  const count = recent.length;

  // Top-reacted messages: count reactions per message_id
  const reactionCounts = {};
  (reactions || []).forEach((r) => {
    if (r.message_id) reactionCounts[r.message_id] = (reactionCounts[r.message_id] || 0) + 1;
  });
  const topReacted = recent
    .map((m) => ({ ...m, _reactCount: reactionCounts[m.id] || 0 }))
    .filter((m) => m._reactCount > 0)
    .sort((a, b) => b._reactCount - a._reactCount)
    .slice(0, 3);

  // Who was active
  const activeUsers = {};
  recent.forEach((m) => {
    const u = m.author_username || m.from_username || "Unknown";
    activeUsers[u] = (activeUsers[u] || 0) + 1;
  });
  const topUsers = Object.entries(activeUsers).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Messages that mention you
  const mentioned = recent.filter((m) => {
    const mentions = m.mentions || [];
    return mentions.some((mn) => mn.toLowerCase() === myUsername) || (m.content || "").toLowerCase().includes(`@${myUsername}`);
  });

  // Pinned messages
  const pinned = recent.filter((m) => m.pinned);

  // Shared links
  const links = recent
    .map((m) => ({ url: (m.content || "").match(/https?:\/\/[^\s<]+/i)?.[0], author: m.author_username || m.from_username }))
    .filter((l) => l.url);

  // First unread (oldest in the batch)
  const firstUnread = recent[0];

  return {
    count,
    topUsers,
    mentioned,
    pinned,
    topReacted,
    links,
    firstUnread,
  };
}