// In-browser stand-in for server/db.js: SQLite (sql.js / WebAssembly) persisted to IndexedDB.
// Exposes the same tiny surface the server modules use: db.exec, db.prepare(sql).get/all/run, uuid, now, tx.
import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

const IDB_NAME = "tc_local_db", IDB_STORE = "kv", IDB_KEY = "sqlite", VER_KEY = "tc_dbv";

const DDL = `
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
CREATE TABLE IF NOT EXISTS economy_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, kind TEXT NOT NULL, at INTEGER NOT NULL, ref TEXT);
CREATE INDEX IF NOT EXISTS idx_econ ON economy_log(user_id, kind, at);
CREATE TABLE IF NOT EXISTS user_signals (user_id TEXT NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL, last_seen TEXT NOT NULL, PRIMARY KEY (user_id, kind, value));
`;
const INDEXED = ["user_id", "server_id", "channel_id", "thread_key", "username", "message_id", "call_key", "to_user_id", "from_user_id", "key"];

let SQL = null, cur = null, dirty = false, localVer = null;

const idb = () => new Promise((resolve, reject) => {
  const o = indexedDB.open(IDB_NAME, 1);
  o.onupgradeneeded = () => o.result.createObjectStore(IDB_STORE);
  o.onsuccess = () => resolve(o.result);
  o.onerror = () => reject(o.error);
});
async function idbGet() {
  const d = await idb();
  return new Promise((res, rej) => { const r = d.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); });
}
async function idbPut(bytes) {
  const d = await idb();
  return new Promise((res, rej) => { const t = d.transaction(IDB_STORE, "readwrite"); t.objectStore(IDB_STORE).put(bytes, IDB_KEY); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
}
const readVer = () => { try { return localStorage.getItem(VER_KEY) || "0"; } catch { return "0"; } };

function migrate() {
  cur.exec(DDL);
  for (const f of INDEXED) cur.exec(`CREATE INDEX IF NOT EXISTS idx_rec_${f} ON records(entity, json_extract(data, '$.${f}'))`);
  for (const f of ["channel_id", "thread_key"]) cur.exec(`CREATE INDEX IF NOT EXISTS idx_rec_${f}_date ON records(entity, json_extract(data, '$.${f}'), created_date)`);
  cur.exec("CREATE INDEX IF NOT EXISTS idx_rec_username_lc ON records(entity, lower(json_extract(data, '$.username')))");
}

async function load() {
  SQL ||= await initSqlJs({ locateFile: () => wasmUrl });
  const bytes = await idbGet().catch(() => null);
  cur?.close();
  cur = bytes ? new SQL.Database(bytes) : new SQL.Database();
  migrate();
  localVer = readVer();
}

/** Opens the database (first call) or re-reads it if another tab saved a newer copy. */
export async function syncDb() {
  if (!cur) return load();
  if (readVer() !== localVer) return load();
}

/** Writes the DB to IndexedDB if anything changed. Returns true when it did. */
export async function flushDb() {
  if (!dirty) return false;
  dirty = false;
  await idbPut(cur.export());
  localVer = String(Date.now()) + Math.random().toString(36).slice(2, 6);
  try { localStorage.setItem(VER_KEY, localVer); } catch { /* storage blocked */ }
  return true;
}
export async function resetDb() {
  const d = await idb();
  await new Promise((res) => { const t = d.transaction(IDB_STORE, "readwrite"); t.objectStore(IDB_STORE).delete(IDB_KEY); t.oncomplete = res; t.onerror = res; });
  cur?.close(); cur = null; try { localStorage.setItem(VER_KEY, String(Date.now())); } catch { /* ignore */ }
}
export async function exportDb() { await syncDb(); return cur.export(); }

const norm = (v) => (v === undefined ? null : v === true ? 1 : v === false ? 0 : v);

export const db = {
  exec(sql) { cur.exec(sql); dirty = true; },
  prepare(sql) {
    return {
      get(...p) { const s = cur.prepare(sql); try { s.bind(p.map(norm)); return s.step() ? s.getAsObject() : undefined; } finally { s.free(); } },
      all(...p) { const s = cur.prepare(sql); const rows = []; try { s.bind(p.map(norm)); while (s.step()) rows.push(s.getAsObject()); } finally { s.free(); } return rows; },
      run(...p) { cur.run(sql, p.map(norm)); dirty = true; return { changes: cur.getRowsModified() }; },
    };
  },
};

export const uuid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const tx = (fn) => {
  cur.exec("BEGIN");
  try { const r = fn(); cur.exec("COMMIT"); dirty = true; return r; } catch (e) { try { cur.exec("ROLLBACK"); } catch { /* ignore */ } throw e; }
};
