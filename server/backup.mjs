// Consistent online backup of the SQLite database. CLI: `node server/backup.mjs`; also scheduled by the server itself.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function runBackup(keep = 7) {
  const DATA = process.env.DATA_DIR || path.resolve("data");
  const out = path.join(DATA, "backups"); fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, `thiscord-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
  const db = new DatabaseSync(path.join(DATA, "thiscord.db"));
  try { db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`); } finally { db.close(); }
  const all = fs.readdirSync(out).filter((f) => f.endsWith(".db")).sort();
  for (const f of all.slice(0, Math.max(0, all.length - keep))) fs.rmSync(path.join(out, f));
  return file;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log("backup written:", runBackup(14));
