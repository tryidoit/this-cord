import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, uuid, now, tx } from "./db.js";
import { build, sortClause, httpErr } from "./query.js";
import { AVATARS } from "../src/lib/avatars.js";
import { signalsForUser } from "./devices.js";
import { bumpUser } from "./quests.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema");
export const SCHEMAS = {};
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".jsonc")) continue;
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8").replace(/^\s*\/\/.*$/gm, ""));
  SCHEMAS[d.name || f.replace(".jsonc", "")] = d;
}
const SYSTEM = new Set(["id", "created_by_id", "created_by", "created_date", "updated_date"]);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// ---------- policy evaluation (JS side; used for create/update/delete and for SSE fan-out) ----------
const getField = (rec, f) => (f.startsWith("data.") ? rec.data?.[f.slice(5)] : SYSTEM.has(f) ? rec[f] : rec.data?.[f]);
function eqv(have, want) { return Array.isArray(have) ? have.includes(want) : have === want; }
export function matches(rec, c, ctx) {
  if (!c || typeof c !== "object" || !Object.keys(c).length) return true;
  return Object.entries(c).every(([k, v]) => {
    if (k === "$or") return v.some((s) => matches(rec, s, ctx));
    if (k === "$and") return v.every((s) => matches(rec, s, ctx));
    if (k === "user_condition") return Object.entries(v).every(([f, w]) => ctx.user?.[f] === w);
    const have = getField(rec, k);
    const sub = (x) => (x === "{{user.id}}" ? ctx.user?.id : x);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.entries(v).every(([op, x]) => (op === "$ne" ? have !== sub(x) : op === "$in" ? x.includes(have) : true));
    }
    return eqv(have, sub(v));
  });
}
function rule(entity, op) {
  const r = SCHEMAS[entity]?.rls?.[op];
  if (r === undefined || r === null) return op === "read" ? {} : { user_condition: { role: "admin" } };
  return r;
}
export const canRead = (entity, rec, ctx) => matches(rec, rule(entity, "read"), ctx);

// ---------- row mapping ----------
const toRec = (row) => ({ id: row.id, ...JSON.parse(row.data), created_by_id: row.created_by_id, created_by: row.created_by, created_date: row.created_date, updated_date: row.updated_date });
const asPolicyRec = (row) => ({ id: row.id, created_by_id: row.created_by_id, created_by: row.created_by, created_date: row.created_date, updated_date: row.updated_date, data: JSON.parse(row.data) });
const maskFields = (entity, rec, ctx) => {
  const props = SCHEMAS[entity]?.properties || {};
  for (const [f, def] of Object.entries(props)) {
    const r = def.rls?.read;
    if (r && !matches({ ...rec, data: rec }, r, ctx)) delete rec[f];
  }
  return rec;
};
export const publicRec = (entity, row, ctx) => maskFields(entity, toRec(row), ctx);

const MAX_BYTES = { Asset: 1_500_000 };
function clean(entity, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw httpErr(400, "Body must be an object");
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (SYSTEM.has(k) || k === "__proto__" || k === "constructor" || !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(k)) continue;
    out[k] = v;
  }
  if (Buffer.byteLength(JSON.stringify(out)) > (MAX_BYTES[entity] || 100_000)) throw httpErr(413, "Record too large");
  return out;
}
function defaults(entity) {
  const o = {};
  for (const [k, d] of Object.entries(SCHEMAS[entity].properties || {})) if (hasOwn(d, "default")) o[k] = structuredClone(d.default);
  return o;
}
const getRow = (entity, id) => db.prepare("SELECT * FROM records WHERE id=? AND entity=?").get(String(id), entity);

// ---------- Profile hardening ----------
const AVATAR_PRICE = new Map(AVATARS.map((a) => [a.id, a.price]));
const PLUS_COST = 5000, PLUS_DAYS = 30, PFP_COST = 3000, HANDLE_COST = 500;
// Only an admin may write these. Coins are only ever *increased* by the /api/economy endpoints.
const ADMIN_ONLY = ["is_admin", "moderator", "vip", "is_banned", "ban_reason", "cheat_codes", "can_delete_messages", "can_edit_messages",
  "transfer_limit", "user_id", "badges", "daily_streak", "last_daily_claim", "last_session_claim", "games_won", "quest_claims", "quest_progress"];
const MOD_FIELDS = ["muted_until", "kicked_at"];

function profileUpdateGuard(prev, patch, ctx, isSelf) {
  const admin = ctx.user.role === "admin";
  if (admin) {
    if (hasOwn(patch, "username") && patch.username !== prev.data.username) {
      if (!/^[a-z0-9_]{3,20}$/.test(patch.username)) throw httpErr(400, "Invalid username");
      if (db.prepare("SELECT 1 FROM records WHERE entity='Profile' AND lower(json_extract(data,'$.username'))=? AND id<>?").get(patch.username, prev.id)) throw httpErr(409, "That username is taken.");
    }
    return;
  }
  if (!isSelf) {
    const isMod = ctx.profile?.moderator;
    if (!isMod || prev.data.is_admin) throw httpErr(403, "Not allowed");
    for (const k of Object.keys(patch)) if (!MOD_FIELDS.includes(k)) throw httpErr(403, `Moderators can only change: ${MOD_FIELDS.join(", ")}`);
    return;
  }
  for (const k of [...ADMIN_ONLY, ...MOD_FIELDS]) if (hasOwn(patch, k)) throw httpErr(403, `You can't change ${k}`);
  const oldPts = prev.data.points || 0;
  const newPts = hasOwn(patch, "points") ? patch.points : oldPts;
  if (typeof newPts !== "number" || !Number.isFinite(newPts) || newPts < 0) throw httpErr(400, "Invalid balance");
  const infinite = (prev.data.cheat_codes || []).includes("infinite_coins");
  if (newPts > oldPts) throw httpErr(403, "Coins can only be earned through the game");
  let spent = oldPts - newPts; if (infinite) spent = Number.MAX_SAFE_INTEGER;
  let owed = 0;
  if (hasOwn(patch, "owned_avatars")) {
    const before = new Set(prev.data.owned_avatars || []);
    if (!Array.isArray(patch.owned_avatars) || patch.owned_avatars.length > 2000) throw httpErr(400, "Invalid avatars");
    for (const id of patch.owned_avatars) if (!before.has(id)) {
      if (!AVATAR_PRICE.has(id)) throw httpErr(400, "Unknown avatar");
      owed += AVATAR_PRICE.get(id);
    }
    for (const id of before) if (!patch.owned_avatars.includes(id)) throw httpErr(403, "Can't remove owned avatars");
  }
  if (hasOwn(patch, "thiscord_plus_until") && patch.thiscord_plus_until !== prev.data.thiscord_plus_until) {
    const until = Date.parse(patch.thiscord_plus_until);
    if (!until || until > Date.now() + PLUS_DAYS * 86400_000 + 60_000) throw httpErr(400, "Invalid subscription date");
    owed += PLUS_COST;
  }
  if (hasOwn(patch, "avatar_id") && patch.avatar_id !== prev.data.avatar_id) {
    const a = patch.avatar_id;
    const owns = (prev.data.owned_avatars || []).includes(a) || (patch.owned_avatars || []).includes(a);
    if (typeof a !== "string" || a.length > 200) throw httpErr(400, "Invalid avatar");
    if (!owns && !AVATAR_PRICE.has(a)) { owed += PFP_COST; } // custom uploaded picture
    else if (!owns && AVATAR_PRICE.has(a)) throw httpErr(403, "You don't own that avatar");
  }
  if (hasOwn(patch, "username") && patch.username !== prev.data.username) {
    if (!/^[a-z0-9_]{3,20}$/.test(patch.username)) throw httpErr(400, "Invalid username");
    if (db.prepare("SELECT 1 FROM records WHERE entity='Profile' AND lower(json_extract(data,'$.username'))=? AND id<>?").get(patch.username, prev.id)) throw httpErr(409, "That username is taken.");
    owed += HANDLE_COST;
  }
  if (!infinite && spent < owed) throw httpErr(402, "Not enough coins for that purchase");
}

function beforeCreate(entity, data, ctx) {
  const u = ctx.user;
  if (entity === "Profile") throw httpErr(403, "Profiles are created at registration");
  if (entity === "AccountKey") throw httpErr(410, "No longer used");
  if (entity === "CoinGift") throw httpErr(403, "Use /api/economy/gift");
  if (entity === "ChannelMessage" || entity === "DirectMessage") {
    const p = ctx.profile;
    if (p?.is_banned) throw httpErr(403, "You are banned");
    if (p?.muted_until && Date.parse(p.muted_until) > Date.now()) throw httpErr(403, "You are muted");
    const plus = p?.thiscord_plus_until && Date.parse(p.thiscord_plus_until) > Date.now();
    if (typeof data.content === "string" && data.content.length > (plus ? 4000 : 2000)) throw httpErr(413, "Message too long");
    if (entity === "ChannelMessage") {
      data.author_username = p?.username; // can't impersonate other authors
      if (!ctx.user.role || ctx.user.role !== "admin") data.is_system = false;
    } else { data.from_user_id = u.id; data.from_username = p?.username; }
  }
  if (entity === "DeviceBan" && data.banned_user_id) {
    // Bans are enforced against the server-issued device cookie, not a client-made fingerprint.
    Object.assign(data, signalsForUser(String(data.banned_user_id)));
    data.device_fingerprint = data.device_ids[0] || "";
  }
  if (entity === "Reaction" || entity === "PollVote" || entity === "TypingIndicator") data.user_id = u.id;
  if (entity === "ChannelRead") data.user_id = u.id;
  if (entity === "MemberRole") data.user_id = u.id;
  if (entity === "Call") data.caller_id = u.id;
  if (entity === "CallSignal") data.from_id = u.id;
  if (entity === "Friendship") data.requester_user_id = u.id;
}

export function list(entity, ctx, { q, sort, limit, skip } = {}) {
  if (!SCHEMAS[entity]) throw httpErr(404, "Unknown entity");
  const params = [entity];
  const where = `entity=? AND (${build(rule(entity, "read"), params, ctx)}) AND (${build(q, params, ctx)})`;
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 1000);
  const off = Math.max(parseInt(skip) || 0, 0);
  const rows = db.prepare(`SELECT * FROM records WHERE ${where} ORDER BY ${sortClause(sort)} LIMIT ${lim} OFFSET ${off}`).all(...params);
  return rows.map((r) => publicRec(entity, r, ctx));
}
export function count(entity, ctx, q) {
  if (!SCHEMAS[entity]) throw httpErr(404, "Unknown entity");
  const params = [entity];
  const where = `entity=? AND (${build(rule(entity, "read"), params, ctx)}) AND (${build(q, params, ctx)})`;
  return db.prepare(`SELECT COUNT(*) n FROM records WHERE ${where}`).get(...params).n;
}
export function get(entity, id, ctx) {
  const row = getRow(entity, id);
  if (!row || !matches(asPolicyRec(row), rule(entity, "read"), ctx)) throw httpErr(404, "Not found");
  return publicRec(entity, row, ctx);
}

export function create(entity, input, ctx) {
  if (!SCHEMAS[entity]) throw httpErr(404, "Unknown entity");
  const data = { ...defaults(entity), ...clean(entity, input) };
  beforeCreate(entity, data, ctx);
  const t = now(); const id = uuid();
  const pol = { id, created_by_id: ctx.user.id, created_by: ctx.user.email, data };
  if (!matches(pol, rule(entity, "create"), ctx)) throw httpErr(403, "Not allowed");
  db.prepare("INSERT INTO records VALUES (?,?,?,?,?,?,?)").run(id, entity, JSON.stringify(data), ctx.user.id, ctx.user.email, t, t);
  if (entity === "ChannelMessage" || entity === "DirectMessage") bumpUser(ctx.user.id, "messages");
  else if (entity === "VoiceRoom") bumpUser(ctx.user.id, "voice_joined");
  return publicRec(entity, getRow(entity, id), ctx);
}

export function update(entity, id, input, ctx) {
  return tx(() => {
    const row = getRow(entity, id);
    if (!row) throw httpErr(404, "Not found");
    const prev = asPolicyRec(row);
    const patch = clean(entity, input);
    let allowed = matches(prev, rule(entity, "update"), ctx);
    if (entity === "Profile") {
      const isSelf = prev.created_by_id === ctx.user.id;
      if (!allowed && !isSelf && ctx.user.role !== "admin" && ctx.profile?.moderator) allowed = true;
      if (!allowed) throw httpErr(403, "Not allowed");
      profileUpdateGuard(prev, patch, ctx, isSelf);
    } else if (entity === "Channel" && !allowed) {
      const srv = prev.data.server_id && getRow("Server", prev.data.server_id);
      if (srv && srv.created_by_id === ctx.user.id) allowed = true; // server owner manages its channels
      else if (matches(prev, rule("Channel", "read"), ctx)) {
        const keys = Object.keys(patch);
        const own = (k) => { // members may only add/remove themselves in thread_member_ids
          const a = new Set(prev.data[k] || []), b = new Set(patch[k] || []);
          return [...a].filter((x) => !b.has(x)).concat([...b].filter((x) => !a.has(x))).every((x) => x === ctx.user.id);
        };
        allowed = keys.length > 0 && keys.every((k) => k === "last_activity_at" || (k === "thread_member_ids" && own(k)));
      }
      if (!allowed) throw httpErr(403, "Not allowed");
    } else if (!allowed) throw httpErr(403, "Not allowed");
    if (entity === "ChannelMessage" || entity === "DirectMessage") {
      for (const k of ["author_username", "from_user_id", "to_user_id", "from_username", "member_user_ids", "thread_key", "channel_id"]) {
        if (hasOwn(patch, k) && JSON.stringify(patch[k]) !== JSON.stringify(prev.data[k]) && ctx.user.role !== "admin") delete patch[k];
      }
    }
    const next = { ...prev.data, ...patch };
    if (Buffer.byteLength(JSON.stringify(next)) > (MAX_BYTES[entity] || 100_000)) throw httpErr(413, "Record too large");
    db.prepare("UPDATE records SET data=?, updated_date=? WHERE id=?").run(JSON.stringify(next), now(), row.id);
    if (entity === "Friendship" && patch.status === "accepted" && prev.data.status !== "accepted") {
      for (const u of [prev.data.requester_user_id, prev.data.recipient_user_id]) if (u) bumpUser(u, "friends_added");
    }
    return getRow(entity, id);
  });
}

export function remove(entity, id, ctx) {
  const row = getRow(entity, id);
  if (!row) throw httpErr(404, "Not found");
  if (!matches(asPolicyRec(row), rule(entity, "delete"), ctx)) throw httpErr(403, "Not allowed");
  if (entity === "Profile") throw httpErr(403, "Delete your account from settings");
  db.prepare("DELETE FROM records WHERE id=?").run(row.id);
  return row;
}
export function removeMany(entity, q, ctx) {
  const rows = list(entity, ctx, { q, limit: 1000 });
  let n = 0;
  const deleted = [];
  for (const r of rows) { try { deleted.push(remove(entity, r.id, ctx)); n++; } catch { /* skip rows the user may not delete */ } }
  return { n, deleted };
}
export const profileOf = (userId) => {
  const row = db.prepare("SELECT * FROM records WHERE entity='Profile' AND created_by_id=? LIMIT 1").get(userId);
  return row ? { id: row.id, ...JSON.parse(row.data) } : null;
};
export { getRow, toRec, asPolicyRec };
