import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";
import { httpErr } from "./query.js";
import * as A from "./auth.js";
import * as E from "./entities.js";
import * as Econ from "./economy.js";
import * as Srv from "./servers.js";
import * as Dev from "./devices.js";
import { runBackup } from "./backup.mjs";

const PORT = Number(process.env.PORT) || 3000;
const PROD = process.env.NODE_ENV === "production";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const COOKIE_SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : PROD;
const SESSION_SECONDS = 30 * 24 * 3600;
const bus = new EventEmitter(); bus.setMaxListeners(0);
const streams = new Map(); // user id -> open SSE responses (capped per user)

export const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : process.env.TRUST_PROXY);

// ---- headers / CSP ----
const inlineHashes = [];
try {
  const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) inlineHashes.push(`'sha256-${crypto.createHash("sha256").update(m[1]).digest("base64")}'`);
} catch { /* dev without a build */ }
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", ...inlineHashes],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.giphy.com", "https://g.tenor.com", "https://www.reddit.com", "https://commons.wikimedia.org", "https://api.openverse.org"],
      frameSrc: ["https://www.youtube.com", "https://player.vimeo.com", "https://open.spotify.com", "https://player.twitch.tv"],
      objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
app.use(express.json({ limit: "2mb" }));

const secure = (req) => COOKIE_SECURE;
const asyncH = (fn) => (req, res, next) => { try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); } };

// ---- device id cookie (server-issued; used for device bans) ----
app.use((req, res, next) => {
  const c = A.parseCookies(req.headers.cookie);
  let dev = c.tc_dev;
  if (!dev || !/^[a-f0-9]{32}$/.test(dev)) {
    dev = crypto.randomBytes(16).toString("hex");
    res.append("Set-Cookie", A.cookie("tc_dev", dev, { maxAge: 5 * 365 * 24 * 3600, secure: secure(req) }));
  }
  req.deviceId = dev; req.session = c.tc_session;
  next();
});

// ---- CSRF: cookie auth + non-simple request required ----
app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.headers["x-tc-client"] !== "1") return next(httpErr(403, "Bad request origin"));
  const origin = req.headers.origin;
  if (origin) {
    const allowed = (process.env.APP_ORIGIN || "").split(",").filter(Boolean);
    let ok = false;
    try { ok = new URL(origin).host === req.headers.host || allowed.includes(origin); } catch { /* bad origin */ }
    if (!ok) return next(httpErr(403, "Bad request origin"));
  }
  next();
});
app.use("/api", rateLimit({ windowMs: 60_000, limit: 900, standardHeaders: true, legacyHeaders: false }));
const authLimiter = (limit, windowMs) => rateLimit({ windowMs, limit: limit * (Number(process.env.RATE_MULT) || 1), standardHeaders: true, legacyHeaders: false, message: { error: "Too many attempts. Try again later." } });

const deviceBan = (req) => Dev.strongBan(Dev.signalsOf(req));
function ctxFor(user) {
  const profile = E.profileOf(user.id);
  return { user: { id: user.id, email: user.email, full_name: profile?.username || user.full_name, role: profile?.is_admin ? "admin" : "user" }, profile };
}
function setSession(req, res, user) {
  res.append("Set-Cookie", A.cookie("tc_session", A.makeToken(user), { maxAge: SESSION_SECONDS, secure: secure(req) }));
}
const seenAt = new Map();
setInterval(() => seenAt.clear(), 3600_000).unref();
function authed(req, res, next) {
  const user = A.readToken(req.session);
  if (!user) return next(httpErr(401, "Authentication required"));
  const ban = deviceBan(req);
  if (ban) return next(Object.assign(httpErr(403, "Device banned"), { code: "device_banned", reason: ban.reason }));
  req.ctx = ctxFor(user); req.ctx.deviceId = req.deviceId;
  const seen = seenAt.get(user.id + "|" + req.deviceId);
  if (!seen || Date.now() - seen > 600_000) { Dev.remember(user.id, Dev.signalsOf(req)); seenAt.set(user.id + "|" + req.deviceId, Date.now()); }
  next();
}
const writeBuckets = new Map();
function writeLimit(req, res, next) {
  const k = req.ctx.user.id, t = Date.now(); const b = (writeBuckets.get(k) || []).filter((x) => t - x < 60_000);
  if (b.length >= 240) return next(httpErr(429, "Slow down"));
  b.push(t); writeBuckets.set(k, b); next();
}
const msgBuckets = new Map();
function messageLimit(entity, req) {
  if (entity !== "ChannelMessage" && entity !== "DirectMessage") return;
  const k = req.ctx.user.id, t = Date.now(); const b = (msgBuckets.get(k) || []).filter((x) => t - x < 10_000);
  if (b.length >= 12) throw httpErr(429, "You're sending messages too fast");
  b.push(t); msgBuckets.set(k, b);
}
setInterval(() => { const t = Date.now(); for (const [k, v] of loginFail) if (t - v.t > 15 * 60_000) loginFail.delete(k); for (const m of [writeBuckets, msgBuckets]) for (const [k, v] of m) if (!v.some((x) => t - x < 60_000)) m.delete(k); }, 120_000).unref();

// ---- auth ----
const authR = express.Router();
authR.post("/register", authLimiter(8, 3600_000), asyncH((req, res) => {
  const sig = Dev.signalsOf(req);
  if (Dev.strongBan(sig) || Dev.weakBan(sig)) throw httpErr(403, "This device is banned");
  const u = A.register(req.body || {}); Dev.remember(u.id, sig); setSession(req, res, u);
  res.json({ user: ctxFor(u).user });
}));
const loginFail = new Map();
authR.post("/login", authLimiter(20, 15 * 60_000), asyncH((req, res) => {
  const id = String(req.body?.identifier || "").toLowerCase().slice(0, 100);
  const f = loginFail.get(id);
  if (f && f.n >= 8 && Date.now() - f.t < 15 * 60_000) throw httpErr(429, "Too many failed attempts. Try again in a few minutes.");
  let u;
  try { u = A.login(id, req.body?.password); } catch (e) { loginFail.set(id, { n: (f && Date.now() - f.t < 15 * 60_000 ? f.n : 0) + 1, t: Date.now() }); throw e; }
  loginFail.delete(id);
  if (deviceBan(req)) throw Object.assign(httpErr(403, "Device banned"), { code: "device_banned" });
  Dev.remember(u.id, Dev.signalsOf(req));
  setSession(req, res, u);
  res.json({ user: ctxFor(u).user });
}));
authR.post("/logout", (req, res) => { res.append("Set-Cookie", A.cookie("tc_session", "", { maxAge: 0, secure: secure(req) })); res.json({ ok: true }); });
authR.get("/me", authed, (req, res) => res.json({ ...req.ctx.user }));
authR.get("/device-status", (req, res) => { const b = deviceBan(req); res.json({ banned: !!b, reason: b?.reason || "" }); });
authR.get("/username-available", authLimiter(60, 60_000), (req, res) => {
  const u = String(req.query.u || "").toLowerCase();
  res.json({ available: A.USERNAME_RE.test(u) && !db.prepare("SELECT 1 FROM records WHERE entity='Profile' AND lower(json_extract(data,'$.username'))=?").get(u) });
});
authR.post("/forgot", authLimiter(5, 3600_000), asyncH(async (req, res) => {
  const token = A.createResetToken(req.body?.email);
  if (token) {
    const base = process.env.APP_ORIGIN?.split(",")[0] || `${req.protocol}://${req.headers.host}`;
    const link = `${base}/reset-password?token=${token}`;
    if (process.env.RESET_WEBHOOK_URL) { // optional: POST {email, link} to your own mailer
      await fetch(process.env.RESET_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: req.body.email, link }) }).catch(() => {});
    } else console.log(`[password reset] ${req.body.email}: ${link}`);
  }
  res.json({ ok: true }); // same answer whether or not the account exists
}));
authR.post("/reset", authLimiter(10, 3600_000), asyncH((req, res) => {
  const u = A.resetPassword(req.body?.token, req.body?.newPassword); setSession(req, res, u); res.json({ ok: true });
}));
authR.post("/change-password", authed, authLimiter(10, 3600_000), asyncH((req, res) => {
  const u = A.changePassword(req.ctx.user, req.body?.currentPassword, req.body?.newPassword); setSession(req, res, u); res.json({ ok: true });
}));
authR.post("/logout-everywhere", authed, (req, res) => { A.logoutEverywhere(req.ctx.user.id); res.json({ ok: true }); });
app.use("/api/auth", authR);

// ---- live updates (SSE) ----
app.get("/api/stream", authed, (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders(); res.write("retry: 3000\n\n");
  const user = req.ctx.user; const uid = user.id;
  // Build the viewer's context once per connection (not once per event); refreshed when their own profile changes.
  let ctx = ctxFor({ id: uid, email: user.email, full_name: user.full_name });
  const conns = streams.get(uid) || new Set(); streams.set(uid, conns);
  if (conns.size >= 6) { const oldest = conns.values().next().value; oldest.end(); conns.delete(oldest); }
  conns.add(res);
  const onEvt = ({ entity, type, row }) => {
    try {
      let payload;
      if (type === "delete") payload = { entity, type, id: row.id, data: {} };
      else {
        if (entity === "Profile" && row.id === ctx.profile?.id) ctx = ctxFor({ id: uid, email: user.email, full_name: user.full_name });
        if (!E.canRead(entity, E.asPolicyRec(row), ctx)) return;
        payload = { entity, type, id: row.id, data: E.publicRec(entity, row, ctx) };
      }
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch { /* ignore */ }
  };
  bus.on("evt", onEvt);
  const hb = setInterval(() => res.write(": ping\n\n"), 25_000);
  req.on("close", () => { clearInterval(hb); bus.off("evt", onEvt); conns.delete(res); if (!conns.size) streams.delete(uid); });
});

// ---- entities ----
const ent = express.Router();
ent.use(authed);
const parseJSON = (s) => { if (s === undefined || s === "") return undefined; try { return JSON.parse(s); } catch { throw httpErr(400, "Bad query"); } };
ent.get("/:entity", asyncH((req, res) => {
  res.json({ items: E.list(req.params.entity, req.ctx, { q: parseJSON(req.query.q), sort: req.query.sort, limit: req.query.limit, skip: req.query.skip }) });
}));
ent.get("/:entity/count", asyncH((req, res) => res.json({ count: E.count(req.params.entity, req.ctx, parseJSON(req.query.q)) })));
ent.get("/:entity/:id", asyncH((req, res) => res.json(E.get(req.params.entity, req.params.id, req.ctx))));
ent.post("/:entity", writeLimit, asyncH((req, res) => {
  messageLimit(req.params.entity, req);
  const rec = E.create(req.params.entity, req.body, req.ctx);
  bus.emit("evt", { entity: req.params.entity, type: "create", row: E.getRow(req.params.entity, rec.id) });
  res.status(201).json(rec);
}));
ent.patch("/:entity/:id", writeLimit, asyncH((req, res) => {
  const row = E.update(req.params.entity, req.params.id, req.body, req.ctx);
  bus.emit("evt", { entity: req.params.entity, type: "update", row });
  res.json(E.publicRec(req.params.entity, row, req.ctx));
}));
ent.delete("/:entity/:id", writeLimit, asyncH((req, res) => {
  const row = E.remove(req.params.entity, req.params.id, req.ctx);
  bus.emit("evt", { entity: req.params.entity, type: "delete", row });
  res.json({ success: true });
}));
ent.post("/:entity/delete-many", writeLimit, asyncH((req, res) => {
  const { n, deleted } = E.removeMany(req.params.entity, req.body?.q, req.ctx);
  for (const row of deleted) bus.emit("evt", { entity: req.params.entity, type: "delete", row });
  res.json({ deleted: n });
}));
app.use("/api/entities", ent);

app.post("/api/economy/:action", authed, writeLimit, asyncH((req, res) => {
  const out = Econ.run(req.params.action.replace(/-/g, "_"), req.ctx, req.body);
  if (out.profile) bus.emit("evt", { entity: "Profile", type: "update", row: E.getRow("Profile", out.profile.id) });
  res.json(out);
}));

app.get("/api/servers/lookup", authed, authLimiter(30, 60_000), asyncH((req, res) => res.json(Srv.lookupInvite(req.query.code))));
const emitTouched = (list) => { for (const [entity, id] of list || []) { const row = E.getRow(entity, id); if (row) bus.emit("evt", { entity, type: "update", row }); } };
app.post("/api/servers/:id/join", authed, writeLimit, authLimiter(30, 60_000), asyncH((req, res) => {
  const out = Srv.join(req.ctx, req.params.id, req.body); emitTouched(out.touched); delete out.touched; res.json(out);
}));
app.post("/api/servers/:id/leave", authed, writeLimit, asyncH((req, res) => { const out = Srv.leave(req.ctx, req.params.id); emitTouched(out.touched); delete out.touched; res.json(out); }));

app.get("/healthz", (req, res) => res.type("text").send("ok"));

// ---- static client ----
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: "1h", setHeaders: (r, f) => { if (f.endsWith("sw.js") || f.endsWith("index.html")) r.setHeader("Cache-Control", "no-cache"); } }));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(DIST, "index.html")));
}
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || (err.type === "entity.too.large" ? 413 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Server error" : err.message, code: err.code, reason: err.reason });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, process.env.HOST || process.env.IP || "0.0.0.0", () => console.log(`This-Cord server on http://localhost:${PORT}`));
  // Housekeeping: ephemeral rows (typing, call signalling) and old logs would otherwise grow forever.
  const prune = () => {
    try {
      const ago = (ms) => new Date(Date.now() - ms).toISOString();
      db.prepare("DELETE FROM records WHERE entity='TypingIndicator' AND updated_date < ?").run(ago(10 * 60_000));
      db.prepare("DELETE FROM records WHERE entity IN ('CallSignal','Call') AND created_date < ?").run(ago(24 * 3600_000));
      db.prepare("DELETE FROM economy_log WHERE kind <> 'game_win' AND at < ?").run(Date.now() - 30 * 86400_000);
      db.prepare("DELETE FROM reset_tokens WHERE expires_at < ?").run(Date.now());
    } catch (e) { console.error("prune failed", e.message); }
  };
  setTimeout(prune, 30_000).unref(); setInterval(prune, 3600_000).unref();
  // Built-in backups (hosts without cron): one shortly after start, then every 12 hours; the newest 7 are kept.
  if (process.env.BACKUPS !== "off") {
    const safe = () => { try { runBackup(7); } catch (e) { console.error("backup failed", e.message); } };
    setTimeout(safe, 60_000).unref(); setInterval(safe, 12 * 3600_000).unref();
  }
}
