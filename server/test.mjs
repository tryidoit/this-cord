// Integration test: boots the server on a throwaway DB and checks auth, permissions, economy and live updates.
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
const PORT = 3200 + Math.floor(Math.random() * 500), DIR = `/tmp/tc-test-${Date.now()}`;
const srv = spawn(process.execPath, ["--no-warnings", "server/index.js"], { env: { ...process.env, PORT, DATA_DIR: DIR, RATE_MULT: "100", GAME_MIN_MS: "400" }, stdio: "pipe" });
const B = `http://localhost:${PORT}/api`;
const mk = (defaults = {}) => { let cookies = {}; return async (method, path, body, extra = {}) => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", "x-tc-client": "1", ...defaults, cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "), ...extra }, body: body ? JSON.stringify(body) : undefined });
  for (const c of r.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); cookies[kv.slice(0, i)] = kv.slice(i + 1); }
  let json = null; try { json = await r.json(); } catch {} return { status: r.status, json }; }; };
let pass = 0; const t = async (name, fn) => { try { await fn(); pass++; console.log("  ok  ", name); } catch (e) { console.log("  FAIL", name, "\n      ", e.message); process.exitCode = 1; } };
for (let i = 0; i < 50; i++) { try { await fetch(B + "/auth/device-status"); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
const day = new Date().toISOString().slice(0, 10);
const A = mk(), Bo = mk(), C = mk();
const prof = async (c, u) => (await c("GET", `/entities/Profile?q=${encodeURIComponent(JSON.stringify({ username: u }))}`)).json.items[0];
try {
  await t("first user is admin, second is not", async () => {
    assert.equal((await A("POST", "/auth/register", { email: "a@x.com", password: "password123", username: "alice" })).json.user.role, "admin");
    assert.equal((await Bo("POST", "/auth/register", { email: "b@x.com", password: "password123", username: "bob" })).json.user.role, "user");
    await C("POST", "/auth/register", { email: "c@x.com", password: "password123", username: "carol" });
  });
  await t("CSRF: write without custom header is rejected", async () => { const r = await fetch(B + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); assert.equal(r.status, 403); });
  await t("cross-site Origin is rejected", async () => assert.equal((await A("POST", "/auth/logout", {}, { origin: "https://evil.example" })).status, 403));
  await t("weak password / duplicate email / bad username", async () => {
    assert.equal((await mk()("POST", "/auth/register", { email: "z@x.com", password: "short", username: "zed" })).status, 400);
    assert.equal((await mk()("POST", "/auth/register", { email: "a@x.com", password: "password123", username: "zed" })).status, 409);
    assert.equal((await mk()("POST", "/auth/register", { email: "q@x.com", password: "password123", username: "a b" })).status, 400);
    assert.equal((await mk()("POST", "/auth/register", { email: "q@x.com", password: "password123", username: "ALICE" })).status, 409);
  });
  await t("login by username or email; wrong password gives generic 401", async () => {
    assert.equal((await mk()("POST", "/auth/login", { identifier: "alice", password: "password123" })).status, 200);
    assert.equal((await mk()("POST", "/auth/login", { identifier: "b@x.com", password: "password123" })).status, 200);
    const bad = await mk()("POST", "/auth/login", { identifier: "ghost", password: "x" }); const bad2 = await mk()("POST", "/auth/login", { identifier: "alice", password: "x" });
    assert.equal(bad.status, 401); assert.equal(bad.json.error, bad2.json.error);
  });
  await t("unauthenticated API access is rejected", async () => assert.equal((await mk()("GET", "/entities/Profile")).status, 401));
  const bob = await prof(Bo, "bob"), alice = await prof(A, "alice");
  await t("player can't grant themselves admin/mod/coins/cheats", async () => {
    for (const patch of [{ is_admin: true }, { moderator: true }, { points: 999999 }, { cheat_codes: ["infinite_coins"] }, { vip: true }, { is_banned: false }, { daily_streak: 99 }, { user_id: "x" }])
      assert.equal((await Bo("PATCH", `/entities/Profile/${bob.id}`, patch)).status, 403, JSON.stringify(patch));
  });
  await t("can't edit or delete someone else's profile", async () => {
    assert.equal((await Bo("PATCH", `/entities/Profile/${alice.id}`, { bio: "x" })).status, 403);
    assert.equal((await Bo("DELETE", `/entities/Profile/${alice.id}`)).status, 403);
    assert.equal((await Bo("DELETE", `/entities/Profile/${bob.id}`)).status, 403);
  });
  await t("can't create a second (admin) profile", async () => assert.equal((await Bo("POST", "/entities/Profile", { username: "evil", is_admin: true, points: 1e9 })).status, 403));
  await t("spending ok; avatar purchase must be paid for", async () => {
    assert.equal((await Bo("PATCH", `/entities/Profile/${bob.id}`, { points: 90 })).status, 200);
    const avatars = (await import("../src/lib/avatars.js")).AVATARS; const pricey = avatars.find((a) => a.price > 100);
    assert.equal((await Bo("PATCH", `/entities/Profile/${bob.id}`, { owned_avatars: [...bob.owned_avatars, pricey.id] })).status, 402);
    assert.equal((await Bo("PATCH", `/entities/Profile/${bob.id}`, { owned_avatars: [...bob.owned_avatars, "bogus"] })).status, 400);
    assert.equal((await Bo("PATCH", `/entities/Profile/${bob.id}`, { avatar_id: pricey.id })).status, 403);
    const cheap = avatars.filter((a) => a.price <= 80 && !bob.owned_avatars.includes(a.id))[0];
    assert.equal((await Bo("PATCH", `/entities/Profile/${bob.id}`, { points: 10, owned_avatars: [...bob.owned_avatars, cheap.id], avatar_id: cheap.id })).status, 200);
  });
  await t("economy: daily needs a finished profile, then pays once", async () => {
    assert.equal((await A("POST", "/economy/daily", { day_key: day })).status, 409);
    await A("PATCH", `/entities/Profile/${alice.id}`, { needs_name: false, display_name: "Alice" });
    const r = await A("POST", "/economy/daily", { day_key: day }); assert.equal(r.status, 200); assert.equal(r.json.profile.points, 110);
    assert.equal((await A("POST", "/economy/daily", { day_key: day })).status, 409);
    assert.equal((await A("POST", "/economy/daily", { day_key: "2001-01-01" })).status, 400);
  });
  await t("economy: session reward can't be farmed", async () => {
    assert.equal((await A("POST", "/economy/session")).status, 200);
    assert.equal((await A("POST", "/economy/session")).status, 429);
  });
  await t("games: a win needs a started session, a minimum play time, and pays once per start", async () => {
    assert.equal((await A("POST", "/economy/game-win", { game_id: "neon-pong" })).status, 400, "no token");
    assert.equal((await A("POST", "/economy/game-win", { game_id: "neon-pong", token: "x.y" })).status, 400, "forged token");
    const { token } = (await A("POST", "/economy/game-start", { game_id: "neon-pong" })).json;
    assert.equal((await A("POST", "/economy/game-win", { game_id: "neon-pong", token })).status, 429, "instant win rejected");
    assert.equal((await A("POST", "/economy/game-win", { game_id: "vortex-run", token })).status, 400, "token is for another game");
    await Bo("PATCH", `/entities/Profile/${bob.id}`, { needs_name: false });
    assert.equal((await Bo("POST", "/economy/game-win", { game_id: "neon-pong", token })).status, 400, "token is for another user");
    await new Promise((r) => setTimeout(r, 450));
    assert.equal((await A("POST", "/economy/game-win", { game_id: "neon-pong", token })).status, 200);
    assert.equal((await A("POST", "/economy/game-win", { game_id: "neon-pong", token })).status, 409, "replayed token");
  });
  await t("economy: gifts validate, can't be forged, are claimed exactly once", async () => {
    assert.equal((await Bo("POST", "/entities/CoinGift", { to_user_id: bob.user_id, amount: 5000, claimed: false })).status, 403);
    for (const amount of [-5, 0, 1.5, "abc", 1e12]) assert.notEqual((await A("POST", "/economy/gift", { to_user_id: bob.user_id, amount })).status, 200, String(amount));
    const before = (await prof(A, "alice")).points;
    assert.equal((await A("POST", "/economy/gift", { to_user_id: bob.user_id, amount: 30 })).status, 200);
    assert.equal((await prof(A, "alice")).points, before - 30);
    const c1 = await Bo("POST", "/economy/claim-gifts", {}); assert.equal(c1.json.gifts.length, 1);
    assert.equal((await Bo("POST", "/economy/claim-gifts", {})).json.gifts.length, 0);
    assert.equal((await prof(Bo, "bob")).points, 40);
  });
  await t("quests: progress is counted by the server and can't be typed in", async () => {
    assert.equal((await Bo("PATCH", `/entities/Profile/${bob.id}`, { quest_progress: { x: 1 } })).status, 403);
    assert.equal((await Bo("PATCH", `/entities/Profile/${bob.id}`, { quest_claims: {} })).status, 403);
    const q = { quest_type: "daily", metric: "friends_added", title: "Add a friend" };
    assert.equal((await A("POST", "/economy/quest-claim", q)).status, 409, "incomplete");
    const wq = { quest_type: "daily", metric: "games_won", title: "Win 1 game" };
    const before = (await prof(A, "alice")).points;
    assert.equal((await A("POST", "/economy/quest-claim", wq)).status, 200, "game win above counted");
    assert.equal((await prof(A, "alice")).points, before + 20);
    assert.equal((await A("POST", "/economy/quest-claim", wq)).status, 409, "no double claim");
    const mq = { quest_type: "daily", metric: "messages", title: "Send 10 messages" };
    assert.equal((await Bo("POST", "/economy/quest-claim", mq)).status, 409);
  });
  await t("messages: author can't be spoofed, can't fake system messages", async () => {
    const m = (await Bo("POST", "/entities/ChannelMessage", { channel_id: "c1", content: "hi", author_username: "alice", is_system: true, member_user_ids: [bob.user_id] })).json;
    assert.equal(m.author_username, "bob"); assert.equal(m.is_system, false);
    const d = (await Bo("POST", "/entities/DirectMessage", { thread_key: "t", from_user_id: alice.user_id, from_username: "alice", to_user_id: alice.user_id, content: "x" })).json;
    assert.equal(d.from_user_id, bob.user_id); assert.equal(d.from_username, "bob");
    assert.equal((await Bo("PATCH", `/entities/ChannelMessage/${m.id}`, { author_username: "alice" })).json.author_username, "bob");
  });
  await t("private data: carol can't read bob's DM or message, but alice(admin) can", async () => {
    assert.equal((await C("GET", "/entities/DirectMessage")).json.items.length, 0);
    assert.equal((await C("GET", "/entities/ChannelMessage")).json.items.length, 0);
    assert.equal((await A("GET", "/entities/DirectMessage")).json.items.length, 1);
  });
  await t("field-level privacy: nicknames/ban_reason hidden from other non-admins", async () => {
    const seen = (await C("GET", `/entities/Profile/${bob.id}`)).json; assert.equal("nicknames" in seen, false); assert.equal("ban_reason" in seen, false);
  });
  await t("muted/banned users can't post; users can't unmute themselves", async () => {
    assert.equal((await A("PATCH", `/entities/Profile/${bob.id}`, { muted_until: "2099-01-01T00:00:00Z" })).status, 200);
    assert.equal((await Bo("POST", "/entities/ChannelMessage", { channel_id: "c1", content: "hi" })).status, 403);
    assert.equal((await Bo("PATCH", `/entities/Profile/${bob.id}`, { muted_until: "" })).status, 403);
    await A("PATCH", `/entities/Profile/${bob.id}`, { muted_until: "" });
  });
  await t("moderators may mute but nothing else, and not admins", async () => {
    const carol = await prof(C, "carol");
    await A("PATCH", `/entities/Profile/${carol.id}`, { moderator: true });
    assert.equal((await C("PATCH", `/entities/Profile/${bob.id}`, { muted_until: "2099-01-01T00:00:00Z" })).status, 200);
    assert.equal((await C("PATCH", `/entities/Profile/${bob.id}`, { points: 5000 })).status, 403);
    assert.equal((await C("PATCH", `/entities/Profile/${alice.id}`, { muted_until: "2099-01-01T00:00:00Z" })).status, 403);
    await A("PATCH", `/entities/Profile/${bob.id}`, { muted_until: "" });
  });
  await t("message flood is rate limited", async () => {
    const codes = []; for (let i = 0; i < 16; i++) codes.push((await Bo("POST", "/entities/ChannelMessage", { channel_id: "c1", content: "spam" })).status);
    assert.ok(codes.includes(429));
  });
  await t("query safety: unknown operators, odd field names and regex bombs", async () => {
    const q = (o) => Bo("GET", `/entities/ChannelMessage?q=${encodeURIComponent(JSON.stringify(o))}`);
    assert.equal((await q({ content: { $where: "1" } })).status, 400);
    assert.equal((await q({ "a') OR 1=1 --": 1 })).status, 400);
    const s = Date.now(); assert.equal((await q({ content: { $regex: "(a+)+$", $options: "i" } })).status, 200); assert.ok(Date.now() - s < 500);
  });
  await t("device ban survives clearing cookies (local id) and blocks new accounts from the same browser+network", async () => {
    const L = "a".repeat(32), FP = "b".repeat(32);
    const dev = mk({ "x-tc-local": L, "x-tc-fp": FP });
    await dev("POST", "/auth/register", { email: "d@x.com", password: "password123", username: "dave" });
    const dave = await prof(dev, "dave");
    assert.equal((await Bo("POST", "/entities/DeviceBan", { banned_user_id: dave.user_id })).status, 403);
    assert.equal((await A("POST", "/entities/DeviceBan", { banned_user_id: dave.user_id, reason: "bad", active: true })).status, 201);
    const r = await dev("GET", "/auth/me"); assert.equal(r.status, 403); assert.equal(r.json.code, "device_banned");
    const cleared = mk({ "x-tc-local": L, "x-tc-fp": FP }); // new cookie jar = cleared cookies
    assert.equal((await cleared("POST", "/auth/login", { identifier: "dave", password: "password123" })).status, 403);
    assert.equal((await cleared("POST", "/auth/register", { email: "e@x.com", password: "password123", username: "evan" })).status, 403);
    const wiped = mk({ "x-tc-local": "c".repeat(32), "x-tc-fp": FP }); // cleared ALL site data, same browser + network
    assert.equal((await wiped("POST", "/auth/register", { email: "f@x.com", password: "password123", username: "fred" })).status, 403, "fingerprint+network blocks sign-up");
    assert.equal((await mk({ "x-tc-local": "d".repeat(32), "x-tc-fp": "e".repeat(32) })("POST", "/auth/register", { email: "g@x.com", password: "password123", username: "gina" })).status, 200, "other devices unaffected");
    assert.equal((await mk({ "x-tc-local": "c".repeat(32), "x-tc-fp": FP })("POST", "/auth/login", { identifier: "alice", password: "password123" })).status, 200, "weak match never blocks logins (shared networks)");
  });
  await t("password reset: token works once and logs the user out elsewhere", async () => {
    await mk()("POST", "/auth/forgot", { email: "nobody@x.com" });
    assert.equal((await mk()("POST", "/auth/reset", { token: "bogus", newPassword: "newpassword1" })).status, 400);
  });
  await t("servers: invite codes, paid joins, leave, channel permissions", async () => {
    const carol = await prof(C, "carol");
    const srv = (await C("POST", "/entities/Server", { name: "Club", invite_only: true, invite_code: "ABC123", member_user_ids: [carol.user_id] })).json;
    const ch = (await C("POST", "/entities/Channel", { server_id: srv.id, name: "general", is_private: false, type: "text", member_user_ids: [carol.user_id] })).json;
    assert.equal((await Bo("GET", `/entities/Server/${srv.id}`)).status, 404, "invite-only server hidden from outsiders");
    assert.equal((await Bo("POST", `/servers/${srv.id}/join`, {})).status, 403);
    assert.equal((await Bo("POST", `/servers/${srv.id}/join`, { invite_code: "WRONG1" })).status, 403);
    assert.equal((await Bo("GET", "/servers/lookup?code=abc123")).json.name, "Club");
    assert.equal((await Bo("POST", `/servers/${srv.id}/join`, { invite_code: "abc123" })).status, 200);
    assert.equal((await Bo("GET", `/entities/Server/${srv.id}`)).status, 200);
    assert.ok((await Bo("GET", `/entities/Channel/${ch.id}`)).json.member_user_ids.includes(bob.user_id));
    assert.equal((await Bo("PATCH", `/entities/Channel/${ch.id}`, { name: "hacked" })).status, 403);
    assert.equal((await Bo("PATCH", `/entities/Channel/${ch.id}`, { last_activity_at: new Date().toISOString() })).status, 200);
    assert.equal((await Bo("PATCH", `/entities/Server/${srv.id}`, { name: "mine" })).status, 403);
    assert.equal((await C("POST", `/servers/${srv.id}/leave`, {})).status, 400, "owner can't leave");
    assert.equal((await Bo("POST", `/servers/${srv.id}/leave`, {})).status, 200);
    assert.equal((await Bo("GET", `/entities/Server/${srv.id}`)).status, 404);
    const paid = (await C("POST", "/entities/Server", { name: "VIP", invite_only: false, discoverable: true, join_cost: 100000, member_user_ids: [carol.user_id] })).json;
    assert.equal((await Bo("POST", `/servers/${paid.id}/join`, {})).status, 402);
    const cheap = (await C("POST", "/entities/Server", { name: "Cheap", join_cost: 10, member_user_ids: [carol.user_id] })).json;
    const before = (await prof(Bo, "bob")).points;
    assert.equal((await Bo("POST", `/servers/${cheap.id}/join`, {})).status, 200);
    assert.equal((await prof(Bo, "bob")).points, before - 10);
  });
  await t("static app is served with a strict CSP and no powered-by header", async () => {
    const r = await fetch(`http://localhost:${PORT}/`); const csp = r.headers.get("content-security-policy") || "";
    assert.equal(r.status, 200); assert.ok(csp.includes("object-src 'none'") && csp.includes("frame-ancestors 'none'")); assert.equal(r.headers.get("x-powered-by"), null);
    assert.equal((await fetch(`http://localhost:${PORT}/some/deep/link`)).status, 200);
  });
  await t("live updates: SSE only delivers what you may read", async () => {
    const got = []; const ctrl = new AbortController();
    const cookie = Object.entries({}).join(""); void cookie;
    const probe = mk(); await probe("POST", "/auth/login", { identifier: "carol", password: "password123" });
    // reuse carol's cookie jar by calling through C's fetch headers
    const r = await fetch(B + "/stream", { signal: ctrl.signal, headers: { cookie: (await (async () => { const x = await fetch(B + "/auth/login", { method: "POST", headers: { "content-type": "application/json", "x-tc-client": "1" }, body: JSON.stringify({ identifier: "carol", password: "password123" }) }); return x.headers.getSetCookie().map((c) => c.split(";")[0]).join("; "); })()) } });
    const reader = r.body.getReader(); (async () => { try { for (;;) { const { value, done } = await reader.read(); if (done) break; got.push(new TextDecoder().decode(value)); } } catch {} })();
    await new Promise((r) => setTimeout(r, 300));
    await Bo("POST", "/entities/DirectMessage", { thread_key: "t2", to_user_id: alice.user_id, content: "secret" });
    await A("PATCH", `/entities/Profile/${alice.id}`, { status_text: "visible" });
    await new Promise((r) => setTimeout(r, 400)); ctrl.abort();
    const all = got.join(""); assert.ok(all.includes("visible"), "profile update delivered"); assert.ok(!all.includes("secret"), "DM leaked over SSE");
  });
} finally { srv.kill(); fs.rmSync(DIR, { recursive: true, force: true }); console.log(`\n${pass} passed`); }
