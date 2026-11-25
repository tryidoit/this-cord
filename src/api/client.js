// Tiny API client for the This-Cord server (see /server). Same-origin, cookie-session auth.
import { deviceHeaders, initDeviceSignals } from "@/lib/deviceId";
import { handle, onEvent, prune } from "@/local/router";

// GitHub Pages build: there is no server. Every call below is answered by src/local (SQLite in the browser).
const ready = initDeviceSignals().catch(() => {});

async function request(method, path, body) {
  await ready;
  try {
    return await handle(method, path, body === undefined ? undefined : JSON.parse(JSON.stringify(body)), deviceHeaders());
  } catch (e) {
    const err = new Error(e.status ? e.message : "Local storage error: " + (e.message || e));
    err.status = e.status || 500; err.code = e.code; err.data = { error: e.message, code: e.code, reason: e.reason };
    if (err.status === 403 && e.code === "device_banned") window.dispatchEvent(new CustomEvent("tc:device-banned", { detail: err.data }));
    throw err;
  }
}
prune();

// ---------- live updates: in-tab + cross-tab events from the local engine ----------
const subs = new Map(); // entity -> Set<cb>
let unlisten = null;
function ensureStream() {
  if (unlisten) return;
  unlisten = onEvent((evt) => {
    for (const cb of subs.get(evt.entity) || []) { try { cb({ type: evt.type, id: evt.id, data: evt.data }); } catch (e) { console.error(e); } }
  });
}
export function closeStream() { unlisten?.(); unlisten = null; }

function entity(name) {
  const e = encodeURIComponent(name);
  const qs = (q, o = {}) => {
    const p = new URLSearchParams();
    if (q && Object.keys(q).length) p.set("q", JSON.stringify(q));
    if (o.sort) p.set("sort", o.sort);
    if (o.limit) p.set("limit", String(o.limit));
    if (o.skip) p.set("skip", String(o.skip));
    const s = p.toString(); return s ? "?" + s : "";
  };
  return {
    filter: (q, o) => request("GET", `/entities/${e}${qs(q, o)}`),
    list: (sort, limit) => request("GET", `/entities/${e}${qs({}, { sort, limit })}`).then((r) => r.items),
    get: (id) => request("GET", `/entities/${e}/${encodeURIComponent(id)}`),
    create: (data) => request("POST", `/entities/${e}`, data),
    update: (id, data) => request("PATCH", `/entities/${e}/${encodeURIComponent(id)}`, data),
    delete: (id) => request("DELETE", `/entities/${e}/${encodeURIComponent(id)}`),
    deleteMany: (q) => request("POST", `/entities/${e}/delete-many`, { q }),
    count: (q) => request("GET", `/entities/${e}/count${qs(q)}`).then((r) => r.count),
    subscribe: (cb) => {
      ensureStream();
      if (!subs.has(name)) subs.set(name, new Set());
      subs.get(name).add(cb);
      return () => subs.get(name)?.delete(cb);
    },
  };
}

export const api = {
  entities: new Proxy({}, { get: (cache, name) => (typeof name === "string" ? (cache[name] ||= entity(name)) : undefined) }),
  auth: {
    me: () => request("GET", "/auth/me"),
    register: ({ email, password, username }) => request("POST", "/auth/register", { email, password, username }),
    login: (identifier, password) => request("POST", "/auth/login", { identifier, password }),
    logout: async () => { closeStream(); await request("POST", "/auth/logout", {}).catch(() => {}); },
    usernameAvailable: (u) => request("GET", `/auth/username-available?u=${encodeURIComponent(u)}`).then((r) => r.available),
    deviceStatus: () => request("GET", "/auth/device-status"),
    forgotPassword: (email) => request("POST", "/auth/forgot", { email }), // static build: resolves { ok, link? } (no email is sent)
    resetPassword: (token, newPassword) => request("POST", "/auth/reset", { token, newPassword }),
    changePassword: (currentPassword, newPassword) => request("POST", "/auth/change-password", { currentPassword, newPassword }),
    logoutEverywhere: () => request("POST", "/auth/logout-everywhere", {}),
  },
  servers: {
    lookup: (code) => request("GET", `/servers/lookup?code=${encodeURIComponent(code)}`),
    join: (id, invite_code) => request("POST", `/servers/${encodeURIComponent(id)}/join`, { invite_code }),
    leave: (id) => request("POST", `/servers/${encodeURIComponent(id)}/leave`, {}),
  },
  // Server-authoritative coin actions — the only way to *earn* coins.
  economy: {
    daily: (day_key) => request("POST", "/economy/daily", { day_key }),
    session: () => request("POST", "/economy/session", {}),
    gameStart: (game_id) => request("POST", "/economy/game-start", { game_id }),
    gameWin: (game_id, token) => request("POST", "/economy/game-win", { game_id, token }),
    gift: (to_user_id, amount, note) => request("POST", "/economy/gift", { to_user_id, amount, note }),
    claimGifts: () => request("POST", "/economy/claim-gifts", {}),
    questClaim: (q) => request("POST", "/economy/quest-claim", q),
  },
};
