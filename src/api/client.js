// Tiny API client for the This-Cord server (see /server). Same-origin, cookie-session auth.
import { deviceHeaders, initDeviceSignals } from "@/lib/deviceId";

const BASE = "/api";
const ready = initDeviceSignals().catch(() => {});

async function request(method, path, body) {
  let res;
  await ready;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-TC-Client": "1", ...deviceHeaders() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    const err = new Error("Network error — check your connection.");
    err.status = 0; err.cause = e; throw err;
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status; err.data = data; err.code = data?.code;
    if (res.status === 403 && data?.code === "device_banned") window.dispatchEvent(new CustomEvent("tc:device-banned", { detail: data }));
    throw err;
  }
  return data;
}

// ---------- live updates: one shared SSE connection ----------
const subs = new Map(); // entity -> Set<cb>
let source = null;
function ensureStream() {
  if (source || typeof EventSource === "undefined") return;
  source = new EventSource(BASE + "/stream");
  source.onmessage = (m) => {
    let evt; try { evt = JSON.parse(m.data); } catch { return; }
    for (const cb of subs.get(evt.entity) || []) { try { cb({ type: evt.type, id: evt.id, data: evt.data }); } catch (e) { console.error(e); } }
  };
  source.onerror = () => { /* EventSource reconnects by itself */ };
}
export function closeStream() { source?.close(); source = null; }

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
    forgotPassword: (email) => request("POST", "/auth/forgot", { email }),
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
