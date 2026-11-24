// Server-side quest counters: the server counts what it sees (messages, wins, friends...) so players
// can't type their own progress. Periods are UTC so client and server agree.
import { db, now } from "./db.js";

export const periodKey = (type, d = new Date()) => {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (type === "weekly") day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
};

// Mutates `p` (a parsed profile) in memory; caller saves it.
export function bumpIn(p, metric, amount = 1) {
  const prog = p.quest_progress || {};
  for (const type of ["daily", "weekly"]) { const k = `${type}:${periodKey(type)}:${metric}`; prog[k] = (prog[k] || 0) + amount; }
  const keep = new Set([periodKey("daily"), periodKey("weekly"), periodKey("daily", new Date(Date.now() - 86400_000)), periodKey("weekly", new Date(Date.now() - 7 * 86400_000))]);
  for (const k of Object.keys(prog)) if (!keep.has(k.split(":")[1])) delete prog[k];
  p.quest_progress = prog;
}
export function bumpUser(userId, metric, amount = 1) {
  const row = db.prepare("SELECT * FROM records WHERE entity='Profile' AND created_by_id=?").get(userId);
  if (!row) return;
  const p = JSON.parse(row.data); bumpIn(p, metric, amount);
  db.prepare("UPDATE records SET data=?, updated_date=? WHERE id=?").run(JSON.stringify(p), now(), row.id);
}
