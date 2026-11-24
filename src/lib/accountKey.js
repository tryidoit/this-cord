export function sanitizeUsername(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}
