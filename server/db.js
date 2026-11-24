import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
fs.mkdirSync(DATA_DIR, { recursive: true });
export const db = new DatabaseSync(process.env.DB_PATH || path.join(DATA_DIR, "thiscord.db"));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA temp_store = MEMORY;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  full_name TEXT, token_version INTEGER NOT NULL DEFAULT 0, created_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY, entity TEXT NOT NULL, data TEXT NOT NULL,
  created_by_id TEXT, created_by TEXT, created_date TEXT NOT NULL, updated_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rec_entity ON records(entity, created_date);
CREATE INDEX IF NOT EXISTS idx_rec_creator ON records(entity, created_by_id);
CREATE TABLE IF NOT EXISTS reset_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS user_devices (user_id TEXT NOT NULL, device_id TEXT NOT NULL, last_seen TEXT NOT NULL, PRIMARY KEY (user_id, device_id));
CREATE TABLE IF NOT EXISTS economy_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, kind TEXT NOT NULL, at INTEGER NOT NULL, ref TEXT);
CREATE INDEX IF NOT EXISTS idx_econ ON economy_log(user_id, kind, at);
`);
for (const f of ["user_id", "server_id", "channel_id", "thread_key", "username", "message_id", "call_key", "to_user_id", "from_user_id", "key"]) {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rec_${f} ON records(entity, json_extract(data, '$.${f}'))`);
}
// Message feeds filter by room and sort by time: one composite index serves both (no temp sort).
for (const f of ["channel_id", "thread_key"]) {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rec_${f}_date ON records(entity, json_extract(data, '$.${f}'), created_date)`);
}
// Username uniqueness checks use lower(...); the plain index above can't serve that.
db.exec("CREATE INDEX IF NOT EXISTS idx_rec_username_lc ON records(entity, lower(json_extract(data, '$.username')))");
try { db.exec("PRAGMA optimize"); } catch { /* best effort */ }

export const uuid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

export function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, "session.key");
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString("hex"), { mode: 0o600 });
  return fs.readFileSync(file, "utf8").trim();
}
export const tx = (fn) => {
  db.exec("BEGIN IMMEDIATE");
  try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; }
};
