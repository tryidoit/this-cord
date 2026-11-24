import crypto from "node:crypto";
import { db, uuid, now, secret, tx } from "./db.js";
import { httpErr } from "./query.js";
import { STARTER_AVATAR_ID } from "../src/lib/avatars.js";

const SECRET = secret();
const SESSION_TTL = 30 * 24 * 3600;

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${h.toString("hex")}`;
}
export function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored).split("$");
  if (alg !== "scrypt") return false;
  const h = crypto.scryptSync(pw, Buffer.from(saltHex, "hex"), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(hashHex, "hex");
  return want.length === h.length && crypto.timingSafeEqual(h, want);
}
const DUMMY = hashPassword("dummy-password-for-timing");

const b64 = (b) => Buffer.from(b).toString("base64url");
const sign = (s) => crypto.createHmac("sha256", SECRET).update(s).digest("base64url");
export function makeToken(user) {
  const body = b64(JSON.stringify({ u: user.id, v: user.token_version, e: Math.floor(Date.now() / 1000) + SESSION_TTL }));
  return `${body}.${sign(body)}`;
}
export function readToken(token) {
  if (!token || typeof token !== "string" || token.length > 400) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = sign(body);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (p.e < Date.now() / 1000) return null;
    const u = db.prepare("SELECT id,email,full_name,token_version,created_date FROM users WHERE id=?").get(p.u);
    return u && u.token_version === p.v ? u : null;
  } catch { return null; }
}
export function parseCookies(h = "") {
  const out = {};
  for (const part of h.split(";")) { const i = part.indexOf("="); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
export function cookie(name, value, { maxAge, secure }) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
export function checkPassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) throw httpErr(400, "Password must be at least 8 characters.");
  if (pw.length > 128) throw httpErr(400, "Password is too long.");
}

// Registers the account AND its Profile in one transaction. The very first account becomes admin
// (decided here, on the server, never by the client).
export function register({ email, password, username }) {
  email = String(email || "").trim().toLowerCase();
  username = String(username || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw httpErr(400, "Enter a valid email address.");
  if (!USERNAME_RE.test(username)) throw httpErr(400, "Username must be 3-20 letters, numbers or underscores.");
  checkPassword(password);
  const hash = hashPassword(password);
  return tx(() => {
    if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) throw httpErr(409, "That email is already registered.");
    if (db.prepare("SELECT 1 FROM records WHERE entity='Profile' AND lower(json_extract(data,'$.username'))=?").get(username)) throw httpErr(409, "That username is taken.");
    const id = uuid(); const t = now();
    db.prepare("INSERT INTO users (id,email,password_hash,full_name,token_version,created_date) VALUES (?,?,?,?,0,?)").run(id, email, hash, username, t);
    const firstEver = !db.prepare("SELECT 1 FROM records WHERE entity='Profile' LIMIT 1").get();
    const profile = {
      username, user_id: id, display_name: "", bio: "", points: 100, avatar_id: STARTER_AVATAR_ID, owned_avatars: [STARTER_AVATAR_ID], is_admin: firstEver,
      moderator: false, vip: false, is_banned: false, needs_name: true, cheat_codes: [], daily_streak: 0, games_won: 0,
      nicknames: {}, last_seen: t, presence_status: "online",
    };
    db.prepare("INSERT INTO records (id,entity,data,created_by_id,created_by,created_date,updated_date) VALUES (?,?,?,?,?,?,?)")
      .run(uuid(), "Profile", JSON.stringify(profile), id, email, t, t);
    return db.prepare("SELECT * FROM users WHERE id=?").get(id);
  });
}

export function login(identifier, password) {
  identifier = String(identifier || "").trim().toLowerCase().replace(/^@/, "");
  let u;
  if (identifier.includes("@")) u = db.prepare("SELECT * FROM users WHERE email=?").get(identifier);
  else {
    const r = db.prepare("SELECT created_by_id FROM records WHERE entity='Profile' AND lower(json_extract(data,'$.username'))=?").get(identifier);
    u = r && db.prepare("SELECT * FROM users WHERE id=?").get(r.created_by_id);
  }
  const ok = verifyPassword(String(password || "").slice(0, 200), u ? u.password_hash : DUMMY); // constant-ish time, no user enumeration
  if (!u || !ok) throw httpErr(401, "Invalid username or password");
  return u;
}

export function createResetToken(email) {
  const u = db.prepare("SELECT id FROM users WHERE email=?").get(String(email || "").trim().toLowerCase());
  if (!u) return null;
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  db.prepare("DELETE FROM reset_tokens WHERE user_id=?").run(u.id);
  db.prepare("INSERT INTO reset_tokens VALUES (?,?,?)").run(hash, u.id, Date.now() + 3600_000);
  return token;
}
export function resetPassword(token, newPassword) {
  checkPassword(newPassword);
  const hash = crypto.createHash("sha256").update(String(token || "")).digest("hex");
  return tx(() => {
    const r = db.prepare("SELECT * FROM reset_tokens WHERE token_hash=?").get(hash);
    if (!r || r.expires_at < Date.now()) throw httpErr(400, "This reset link is invalid or has expired.");
    db.prepare("DELETE FROM reset_tokens WHERE token_hash=?").run(hash);
    db.prepare("UPDATE users SET password_hash=?, token_version=token_version+1 WHERE id=?").run(hashPassword(newPassword), r.user_id);
    return db.prepare("SELECT * FROM users WHERE id=?").get(r.user_id);
  });
}
export function changePassword(user, current, next) {
  const u = db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
  if (!verifyPassword(String(current || ""), u.password_hash)) throw httpErr(403, "Current password is incorrect.");
  checkPassword(next);
  db.prepare("UPDATE users SET password_hash=?, token_version=token_version+1 WHERE id=?").run(hashPassword(next), u.id);
  return db.prepare("SELECT * FROM users WHERE id=?").get(u.id);
}
export function logoutEverywhere(userId) { db.prepare("UPDATE users SET token_version=token_version+1 WHERE id=?").run(userId); }
