// Browser port of server/auth.js. Passwords are hashed with PBKDF2 (Web Crypto); sessions live in sessionStorage/localStorage.
import { db, uuid, now, tx } from "./db.js";
import { httpErr } from "./query.js";
import { STARTER_AVATAR_ID } from "@/lib/avatars.js";

const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
async function pbkdf2(pw, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 120_000 }, key, 256));
}
export async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${hex(salt)}$${await pbkdf2(pw, salt)}`;
}
export async function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored).split("$");
  if (alg !== "pbkdf2") return false;
  return (await pbkdf2(pw, unhex(saltHex))) === hashHex;
}
const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

// ---- session (per tab, so two tabs can be two different people) ----
const SKEY = "tc_session";
export function setSession(user) {
  const v = JSON.stringify({ u: user.id, v: user.token_version });
  try { sessionStorage.setItem(SKEY, v); } catch { /* blocked */ }
  try { localStorage.setItem(SKEY, v); } catch { /* blocked */ }
}
export function clearSession() {
  try { sessionStorage.removeItem(SKEY); } catch { /* blocked */ }
  try { localStorage.removeItem(SKEY); } catch { /* blocked */ }
}
export function readSession() {
  let raw = null;
  try { raw = sessionStorage.getItem(SKEY) || localStorage.getItem(SKEY); } catch { /* blocked */ }
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    const u = db.prepare("SELECT id,email,full_name,token_version,created_date FROM users WHERE id=?").get(p.u);
    return u && u.token_version === p.v ? u : null;
  } catch { return null; }
}

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
export function checkPassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) throw httpErr(400, "Password must be at least 8 characters.");
  if (pw.length > 128) throw httpErr(400, "Password is too long.");
}

export async function register({ email, password, username }) {
  email = String(email || "").trim().toLowerCase();
  username = String(username || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw httpErr(400, "Enter a valid email address.");
  if (!USERNAME_RE.test(username)) throw httpErr(400, "Username must be 3-20 letters, numbers or underscores.");
  checkPassword(password);
  const hash = await hashPassword(password);
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

export async function login(identifier, password) {
  identifier = String(identifier || "").trim().toLowerCase().replace(/^@/, "");
  let u;
  if (identifier.includes("@")) u = db.prepare("SELECT * FROM users WHERE email=?").get(identifier);
  else {
    const r = db.prepare("SELECT created_by_id FROM records WHERE entity='Profile' AND lower(json_extract(data,'$.username'))=?").get(identifier);
    u = r && db.prepare("SELECT * FROM users WHERE id=?").get(r.created_by_id);
  }
  const ok = u && (await verifyPassword(String(password || "").slice(0, 200), u.password_hash));
  if (!u || !ok) throw httpErr(401, "Invalid username or password");
  return u;
}

// No mail server on a static site: the reset link is handed straight back to the page.
export async function createResetToken(email) {
  const u = db.prepare("SELECT id FROM users WHERE email=?").get(String(email || "").trim().toLowerCase());
  if (!u) return null;
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  db.prepare("DELETE FROM reset_tokens WHERE user_id=?").run(u.id);
  db.prepare("INSERT INTO reset_tokens VALUES (?,?,?)").run(await sha256(token), u.id, Date.now() + 3600_000);
  return token;
}
export async function resetPassword(token, newPassword) {
  checkPassword(newPassword);
  const hash = await sha256(String(token || ""));
  const pw = await hashPassword(newPassword);
  return tx(() => {
    const r = db.prepare("SELECT * FROM reset_tokens WHERE token_hash=?").get(hash);
    if (!r || r.expires_at < Date.now()) throw httpErr(400, "This reset link is invalid or has expired.");
    db.prepare("DELETE FROM reset_tokens WHERE token_hash=?").run(hash);
    db.prepare("UPDATE users SET password_hash=?, token_version=token_version+1 WHERE id=?").run(pw, r.user_id);
    return db.prepare("SELECT * FROM users WHERE id=?").get(r.user_id);
  });
}
export async function changePassword(user, current, next) {
  const u = db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
  if (!(await verifyPassword(String(current || ""), u.password_hash))) throw httpErr(403, "Current password is incorrect.");
  checkPassword(next);
  db.prepare("UPDATE users SET password_hash=?, token_version=token_version+1 WHERE id=?").run(await hashPassword(next), u.id);
  return db.prepare("SELECT * FROM users WHERE id=?").get(u.id);
}
export function logoutEverywhere(userId) { db.prepare("UPDATE users SET token_version=token_version+1 WHERE id=?").run(userId); }
