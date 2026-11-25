// The whole "server", running in the page. Mirrors the routes in server/index.js.
// handle(method, path, body, headers) -> data | throws Error{status,code,data}
import { db, syncDb, flushDb, now } from "./db.js";
import { httpErr } from "./query.js";
import * as A from "./auth.js";
import * as E from "./entities.js";
import * as Econ from "./economy.js";
import * as Srv from "./servers.js";
import * as Dev from "./devices.js";

// ---------- live updates (replaces SSE): in-tab listeners + BroadcastChannel to other tabs ----------
const listeners = new Set();
let pending = [];
let evtCtx = null;
const chan = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("tc_local_events") : null;

function ctxFor(user) {
  const profile = E.profileOf(user.id);
  return { user: { id: user.id, email: user.email, full_name: profile?.username || user.full_name, role: profile?.is_admin ? "admin" : "user" }, profile };
}
function deliver({ entity, type, row }) {
  if (!listeners.size) return;
  const sess = A.readSession(); if (!sess) return;
  try {
    if (!evtCtx || evtCtx.uid !== sess.id || (entity === "Profile" && row.id === evtCtx.ctx.profile?.id)) evtCtx = { uid: sess.id, ctx: ctxFor(sess) };
    const ctx = evtCtx.ctx;
    let payload;
    if (type === "delete") payload = { entity, type, id: row.id, data: {} };
    else {
      if (!E.canRead(entity, E.asPolicyRec(row), ctx)) return;
      payload = { entity, type, id: row.id, data: E.publicRec(entity, row, ctx) };
    }
    for (const cb of listeners) { try { cb(payload); } catch (e) { console.error(e); } }
  } catch { /* ignore */ }
}
const emit = (entity, type, row) => pending.push({ entity, type, row });
export function onEvent(cb) { listeners.add(cb); return () => listeners.delete(cb); }

// ---------- one request at a time per tab; re-read the DB if another tab changed it ----------
let chain = Promise.resolve();
const enqueue = (fn) => { const p = chain.then(fn); chain = p.catch(() => {}); return p; };
if (chan) chan.onmessage = (m) => enqueue(async () => { await syncDb(); deliver(m.data); });

export function handle(method, path, body, headers = {}) {
  return enqueue(async () => {
    await syncDb();
    pending = [];
    let out, err;
    try { out = await route(method, path, body, headers); } catch (e) { err = e; }
    if (await flushDb()) { for (const evt of pending) chan?.postMessage(evt); }
    for (const evt of pending) deliver(evt);
    pending = [];
    if (err) throw err;
    return out;
  });
}

// ---------- helpers ----------
const sigOf = (h) => Dev.signalsOf(Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v])));
const deviceBan = (h) => Dev.strongBan(sigOf(h));
let lastRemember = 0;
function authed(h) {
  const user = A.readSession();
  if (!user) throw httpErr(401, "Authentication required");
  const ban = deviceBan(h);
  if (ban) throw Object.assign(httpErr(403, "Device banned"), { code: "device_banned", reason: ban.reason });
  const ctx = ctxFor(user);
  if (Date.now() - lastRemember > 600_000) { Dev.remember(user.id, sigOf(h)); lastRemember = Date.now(); }
  return ctx;
}
const parseJSON = (s) => { if (s === null || s === undefined || s === "") return undefined; try { return JSON.parse(s); } catch { throw httpErr(400, "Bad query"); } };
const msgBuckets = new Map();
function messageLimit(entity, ctx) {
  if (entity !== "ChannelMessage" && entity !== "DirectMessage") return;
  const k = ctx.user.id, t = Date.now(); const b = (msgBuckets.get(k) || []).filter((x) => t - x < 10_000);
  if (b.length >= 12) throw httpErr(429, "You're sending messages too fast");
  b.push(t); msgBuckets.set(k, b);
}
const emitTouched = (list) => { for (const [entity, id] of list || []) { const row = E.getRow(entity, id); if (row) emit(entity, "update", row); } };

// ---------- routes ----------
async function route(method, rawPath, body, h) {
  const url = new URL(rawPath, "http://x");
  const seg = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const q = url.searchParams;
  const [area, a, b] = seg;

  if (area === "auth") {
    if (a === "register" && method === "POST") {
      const sig = sigOf(h);
      if (Dev.strongBan(sig) || Dev.weakBan(sig)) throw httpErr(403, "This device is banned");
      const u = await A.register(body || {}); Dev.remember(u.id, sig); A.setSession(u);
      return { user: ctxFor(u).user };
    }
    if (a === "login" && method === "POST") {
      const u = await A.login(body?.identifier, body?.password);
      if (deviceBan(h)) throw Object.assign(httpErr(403, "Device banned"), { code: "device_banned" });
      Dev.remember(u.id, sigOf(h)); A.setSession(u);
      return { user: ctxFor(u).user };
    }
    if (a === "logout") { A.clearSession(); return { ok: true }; }
    if (a === "me") return { ...authed(h).user };
    if (a === "device-status") { const ban = deviceBan(h); return { banned: !!ban, reason: ban?.reason || "" }; }
    if (a === "username-available") {
      const u = String(q.get("u") || "").toLowerCase();
      return { available: A.USERNAME_RE.test(u) && !db.prepare("SELECT 1 FROM records WHERE entity='Profile' AND lower(json_extract(data,'$.username'))=?").get(u) };
    }
    if (a === "forgot") {
      const token = await A.createResetToken(body?.email);
      const base = location.origin + location.pathname;
      return { ok: true, ...(token ? { link: `${base}#/reset-password?token=${token}` } : {}) };
    }
    if (a === "reset") { const u = await A.resetPassword(body?.token, body?.newPassword); A.setSession(u); return { ok: true }; }
    if (a === "change-password") { const ctx = authed(h); const u = await A.changePassword(ctx.user, body?.currentPassword, body?.newPassword); A.setSession(u); return { ok: true }; }
    if (a === "logout-everywhere") { const ctx = authed(h); A.logoutEverywhere(ctx.user.id); return { ok: true }; }
  }

  if (area === "entities") {
    const ctx = authed(h); const entity = a, id = b;
    if (method === "GET" && !id) return { items: E.list(entity, ctx, { q: parseJSON(q.get("q")), sort: q.get("sort"), limit: q.get("limit"), skip: q.get("skip") }) };
    if (method === "GET" && id === "count") return { count: E.count(entity, ctx, parseJSON(q.get("q"))) };
    if (method === "GET") return E.get(entity, id, ctx);
    if (method === "POST" && id === "delete-many") {
      const { n, deleted } = E.removeMany(entity, body?.q, ctx);
      for (const row of deleted) emit(entity, "delete", row);
      return { deleted: n };
    }
    if (method === "POST") {
      messageLimit(entity, ctx);
      const rec = E.create(entity, body, ctx);
      emit(entity, "create", E.getRow(entity, rec.id));
      return rec;
    }
    if (method === "PATCH") { const row = E.update(entity, id, body, ctx); emit(entity, "update", row); return E.publicRec(entity, row, ctx); }
    if (method === "DELETE") { const row = E.remove(entity, id, ctx); emit(entity, "delete", row); return { success: true }; }
  }

  if (area === "economy" && method === "POST") {
    const ctx = authed(h);
    const out = Econ.run(a.replace(/-/g, "_"), ctx, body);
    if (out.profile) emit("Profile", "update", E.getRow("Profile", out.profile.id));
    return out;
  }

  if (area === "servers") {
    const ctx = authed(h);
    if (a === "lookup") return Srv.lookupInvite(q.get("code"));
    if (b === "join" && method === "POST") { const out = Srv.join(ctx, a, body); emitTouched(out.touched); delete out.touched; return out; }
    if (b === "leave" && method === "POST") { const out = Srv.leave(ctx, a); emitTouched(out.touched); delete out.touched; return out; }
  }
  throw httpErr(404, "Not found");
}

// Housekeeping (typing rows, old call signalling) once per page load.
export async function prune() {
  await handle("GET", "/auth/device-status").catch(() => {});
  enqueue(async () => {
    await syncDb();
    const ago = (ms) => new Date(Date.now() - ms).toISOString();
    db.prepare("DELETE FROM records WHERE entity='TypingIndicator' AND updated_date < ?").run(ago(10 * 60_000));
    db.prepare("DELETE FROM records WHERE entity IN ('CallSignal','Call') AND created_date < ?").run(ago(24 * 3600_000));
    db.prepare("DELETE FROM reset_tokens WHERE expires_at < ?").run(Date.now());
    await flushDb();
  }).catch(() => {});
}
export { now };
