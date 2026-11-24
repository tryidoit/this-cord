/**
 * Time utilities — all timestamps are stored as UTC ISO strings.
 * Display helpers convert to the user's local timezone.
 */

const LOCAL_DATE_CACHE = {};

/**
 * Returns a local-date key (YYYY-MM-DD) in the user's timezone.
 * Used for daily claim streaks so they reset at local midnight.
 */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

/**
 * Convert a UTC ISO string to a local Date for display.
 */
export function toLocalDate(isoString) {
  if (!isoString) return null;
  return new Date(isoString);
}

/**
 * Format a UTC ISO string for display in the user's local timezone.
 */
export function formatLocalDateTime(isoString, options) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString([], options || {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a UTC ISO string as a local date only.
 */
export function formatLocalDate(isoString, options) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString([], options || {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a UTC ISO string as local time only.
 */
export function formatLocalTime(isoString, options) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString([], options || {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns the current UTC ISO string for storage.
 */
export function nowUtc() {
  return new Date().toISOString();
}

/**
 * Returns a UTC ISO string offset from now by the given minutes.
 */
export function utcFromNow(minutes) {
  return new Date(Date.now() + minutes * 60000).toISOString();
}

/**
 * Returns true if the given UTC ISO string is in the past.
 */
export function isPastUtc(isoString) {
  if (!isoString) return false;
  return new Date(isoString).getTime() < Date.now();
}

/**
 * Returns milliseconds until the given UTC ISO string.
 */
export function msUntilUtc(isoString) {
  if (!isoString) return 0;
  return Math.max(0, new Date(isoString).getTime() - Date.now());
}