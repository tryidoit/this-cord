// Device-ban matching. Three kinds of signal are collected for every signed-in user:
//  - cookie  : server-issued, HttpOnly
//  - local   : random id the browser keeps in localStorage + IndexedDB (survives "clear cookies")
//  - fp+ipnet: browser fingerprint hash together with the network (/24 IPv4, /64 IPv6)
// A ban matches on any *strong* id (cookie/local). When it does, every other id the visitor presents is
// added to the ban, so clearing one store later doesn't help. fp+ipnet is only used to stop NEW sign-ups
// from a banned browser+network (it is not used for logins, so shared school networks aren't locked out).
import { db, now } from "./db.js";

db.exec(`CREATE TABLE IF NOT EXISTS user_signals (user_id TEXT NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL, last_seen TEXT NOT NULL, PRIMARY KEY (user_id, kind, value));`);
const ID_RE = /^[a-f0-9]{32}$/, FP_RE = /^[a-f0-9]{16,64}$/;

export function ipNet(ip = "") {
  ip = String(ip).replace(/^::ffff:/, "");
  if (ip.includes(".")) return ip.split(".").slice(0, 3).join(".");
  return ip.split(":").slice(0, 4).join(":");
}
export function signalsOf(req) {
  const local = String(req.headers["x-tc-local"] || ""), fp = String(req.headers["x-tc-fp"] || "");
  return { ids: [req.deviceId, ID_RE.test(local) ? local : null].filter(Boolean), fp: FP_RE.test(fp) ? fp : null, net: ipNet(req.ip) };
}
const activeBans = () => db.prepare("SELECT id,data FROM records WHERE entity='DeviceBan'").all().map((r) => ({ id: r.id, d: JSON.parse(r.data) })).filter((b) => b.d.active);

export function strongBan(sig) {
  for (const b of activeBans()) {
    const known = new Set([...(b.d.device_ids || []), b.d.device_fingerprint].filter(Boolean));
    if (sig.ids.some((i) => known.has(i))) {
      const extra = sig.ids.filter((i) => !known.has(i));
      if (extra.length) { b.d.device_ids = [...known, ...extra]; db.prepare("UPDATE records SET data=? WHERE id=?").run(JSON.stringify(b.d), b.id); } // propagate
      return b.d;
    }
  }
  return null;
}
export function weakBan(sig) {
  if (!sig.fp) return null;
  for (const b of activeBans()) if ((b.d.fingerprints || []).includes(sig.fp) && (b.d.ip_nets || []).includes(sig.net)) return b.d;
  return null;
}
export function remember(userId, sig) {
  const up = db.prepare("INSERT INTO user_signals VALUES (?,?,?,?) ON CONFLICT(user_id,kind,value) DO UPDATE SET last_seen=excluded.last_seen");
  const t = now();
  for (const [i, v] of sig.ids.entries()) up.run(userId, i === 0 ? "cookie" : "local", v, t);
  if (sig.fp) up.run(userId, "fp", sig.fp, t);
  if (sig.net) up.run(userId, "net", sig.net, t);
}
export function signalsForUser(userId) {
  const rows = db.prepare("SELECT kind,value FROM user_signals WHERE user_id=?").all(userId);
  const by = (k) => rows.filter((r) => r.kind === k).map((r) => r.value);
  return { device_ids: [...by("cookie"), ...by("local")], fingerprints: by("fp"), ip_nets: by("net") };
}
