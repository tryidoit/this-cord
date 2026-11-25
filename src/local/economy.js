import { db, tx, now, uuid } from "./db.js";
import { httpErr } from "./query.js";
import { getRow, publicRec } from "./entities.js";
import { DEFAULT_DAILY_QUESTS, DEFAULT_WEEKLY_QUESTS } from "@/lib/questDefs.js";
import { bumpIn, periodKey } from "./quests.js";

const GAME_MIN_MS = 8_000, GAME_MAX_MS = 2 * 3600_000, GAME_WINS_PER_HOUR = 40;

const SESSION_REWARD = 15, SESSION_MIN_MS = 5 * 60_000, GAME_WIN = 8, TRANSFER_DEFAULT = 50_000;
const dayNum = (key) => Date.parse(key + "T00:00:00Z") / 86400_000;
const validDay = (k) => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(dayNum(k));

const profileRow = (userId) => db.prepare("SELECT * FROM records WHERE entity='Profile' AND created_by_id=?").get(userId);
const pdata = (row) => JSON.parse(row.data);
const save = (row, d) => db.prepare("UPDATE records SET data=?, updated_date=? WHERE id=?").run(JSON.stringify(d), now(), row.id);
const config = () => { const r = db.prepare("SELECT data FROM records WHERE entity='AppConfig' AND json_extract(data,'$.key')='global'").get(); return r ? JSON.parse(r.data) : {}; };
function multiplier(p, cfg) {
  let m = 1;
  if (cfg.double_points) m *= 2;
  if ((p.cheat_codes || []).includes("double_coins")) m *= 2;
  if (p.vip || (p.cheat_codes || []).includes("vip_badge")) m *= 1.25;
  return m;
}
const infinite = (p) => (p.cheat_codes || []).includes("infinite_coins");
function credit(p, amount, cfg) { const gain = Math.round(amount * multiplier(p, cfg)); if (!infinite(p)) { p.points = (p.points || 0) + gain; bumpIn(p, "coins_earned", gain); } return gain; }
function guardPlayable(p) { if (p.is_banned) throw httpErr(403, "You are banned"); if (p.needs_name) throw httpErr(409, "Finish setting up your profile first"); }
const recent = (userId, kind, sinceMs) => db.prepare("SELECT COUNT(*) n, MAX(at) last FROM economy_log WHERE user_id=? AND kind=? AND at>?").get(userId, kind, Date.now() - sinceMs);
const logIt = (userId, kind, ref) => db.prepare("INSERT INTO economy_log (user_id,kind,at,ref) VALUES (?,?,?,?)").run(userId, kind, Date.now(), ref || null);

export const actions = {
  daily(ctx, { day_key }) {
    const row = profileRow(ctx.user.id); const p = pdata(row); guardPlayable(p);
    const today = Math.floor(Date.now() / 86400_000);
    if (!validDay(day_key) || Math.abs(dayNum(day_key) - today) > 1) throw httpErr(400, "Bad date");
    if (p.last_daily_claim && dayNum(p.last_daily_claim) >= dayNum(day_key)) throw httpErr(409, "Already claimed today");
    const streak = p.last_daily_claim && dayNum(day_key) - dayNum(p.last_daily_claim) === 1 ? (p.daily_streak || 0) + 1 : 1;
    const reward = 10 * streak;
    const gain = credit(p, reward, config());
    p.daily_streak = streak; p.last_daily_claim = day_key;
    save(row, p);
    return { profile: publicRec("Profile", getRow("Profile", row.id), ctx), reward: gain };
  },
  session(ctx) {
    const row = profileRow(ctx.user.id); const p = pdata(row); guardPlayable(p);
    const last = p.last_session_claim ? Date.parse(p.last_session_claim) : 0;
    if (Date.now() - last < SESSION_MIN_MS - 15_000) throw httpErr(429, "Too soon");
    const gain = credit(p, SESSION_REWARD, config());
    p.last_session_claim = now();
    save(row, p);
    return { profile: publicRec("Profile", getRow("Profile", row.id), ctx), reward: gain };
  },
  // A win only counts if it follows a game_start for the same game at least GAME_MIN_MS earlier, and each start pays once.
  game_start(ctx, { game_id }) {
    if (typeof game_id !== "string" || !/^[a-z0-9-]{1,40}$/.test(game_id)) throw httpErr(400, "Bad game");
    const token = `${game_id}.${crypto.randomUUID()}`;
    logIt(ctx.user.id, "game_start", token);
    return { token };
  },
  game_win(ctx, { game_id, token }) {
    const row = profileRow(ctx.user.id); const p = pdata(row); guardPlayable(p);
    if (typeof game_id !== "string" || game_id.length > 40) throw httpErr(400, "Bad game");
    const start = db.prepare("SELECT * FROM economy_log WHERE user_id=? AND kind='game_start' AND ref=?").get(ctx.user.id, String(token || ""));
    if (!start || !String(token).startsWith(game_id + ".")) throw httpErr(400, "Start the game first");
    const age = Date.now() - Number(start.at);
    if (age < GAME_MIN_MS) throw httpErr(429, "That was too quick to be a real win");
    if (age > GAME_MAX_MS) throw httpErr(400, "This game session expired");
    const r = recent(ctx.user.id, "game_win", 3600_000);
    if (r.n >= GAME_WINS_PER_HOUR) throw httpErr(429, "Win limit reached for this hour");
    db.prepare("UPDATE economy_log SET kind='game_win' WHERE id=?").run(start.id); // each start pays once
    const gain = credit(p, GAME_WIN, config());
    p.games_won = (p.games_won || 0) + 1; bumpIn(p, "games_won");
    save(row, p);
    return { profile: publicRec("Profile", getRow("Profile", row.id), ctx), reward: gain };
  },
  gift(ctx, { to_user_id, amount, note }) {
    const row = profileRow(ctx.user.id); const p = pdata(row); guardPlayable(p);
    const toRow = profileRow(String(to_user_id)); if (!toRow || toRow.id === row.id) throw httpErr(400, "Pick another player");
    const to = pdata(toRow); if (to.is_banned) throw httpErr(400, "That player can't receive gifts");
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt < 1) throw httpErr(400, "Enter a whole number of coins");
    const limit = (p.transfer_limit > 0 ? p.transfer_limit : config().global_transfer_limit) || TRANSFER_DEFAULT;
    if (!infinite(p) && amt > limit) throw httpErr(400, `Gifts are limited to ${limit} coins`);
    if (!infinite(p) && (p.points || 0) < amt) throw httpErr(402, "Not enough coins");
    if (recent(ctx.user.id, "gift", 60_000).n >= 10) throw httpErr(429, "Slow down");
    if (!infinite(p)) { p.points -= amt; save(row, p); }
    const t = now(); const id = uuid();
    const g = { from_user_id: ctx.user.id, from_username: p.username, to_user_id: toRow.created_by_id, to_username: to.username, amount: amt, note: String(note || "").slice(0, 120), claimed: false };
    db.prepare("INSERT INTO records VALUES (?,?,?,?,?,?,?)").run(id, "CoinGift", JSON.stringify(g), ctx.user.id, ctx.user.email, t, t);
    logIt(ctx.user.id, "gift");
    return { profile: publicRec("Profile", getRow("Profile", row.id), ctx), gift_id: id };
  },
  claim_gifts(ctx) {
    const row = profileRow(ctx.user.id); const p = pdata(row);
    const gifts = db.prepare("SELECT * FROM records WHERE entity='CoinGift' AND json_extract(data,'$.to_user_id')=? AND json_extract(data,'$.claimed')=0 ORDER BY created_date LIMIT 50").all(ctx.user.id);
    const claimed = [];
    for (const g of gifts) {
      const d = JSON.parse(g.data); d.claimed = true;
      p.points = (p.points || 0) + (d.amount || 0);
      db.prepare("UPDATE records SET data=?, updated_date=? WHERE id=?").run(JSON.stringify(d), now(), g.id);
      claimed.push({ id: g.id, amount: d.amount, from_username: d.from_username, note: d.note });
    }
    if (claimed.length) save(row, p);
    return { profile: publicRec("Profile", getRow("Profile", row.id), ctx), gifts: claimed };
  },
  quest_claim(ctx, { quest_type, metric, title, period_key }) {
    const row = profileRow(ctx.user.id); const p = pdata(row); guardPlayable(p);
    if (!["daily", "weekly"].includes(quest_type)) throw httpErr(400, "Bad quest");
    period_key = periodKey(quest_type); // the server decides the period; progress is the server's own count
    let def = (quest_type === "daily" ? DEFAULT_DAILY_QUESTS : DEFAULT_WEEKLY_QUESTS).find((q) => q.title === title && q.metric === metric);
    if (!def) {
      const r = db.prepare("SELECT data FROM records WHERE entity='Quest' AND json_extract(data,'$.title')=? AND json_extract(data,'$.metric')=? AND json_extract(data,'$.enabled')=1 LIMIT 1").get(String(title), String(metric));
      if (r) { const q = JSON.parse(r.data); def = { goal: q.goal, reward_that: q.reward_that }; }
    }
    if (!def) throw httpErr(404, "Unknown quest");
    const progress = (p.quest_progress || {})[`${quest_type}:${period_key}:${metric}`] || 0;
    if (progress < def.goal) throw httpErr(409, "Quest isn't complete yet");
    const claims = p.quest_claims || {}; const ck = `${quest_type}:${period_key}:${title}`;
    if (claims[ck]) throw httpErr(409, "Already claimed");
    claims[ck] = 1;
    const keys = Object.keys(claims); if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete claims[k];
    p.quest_claims = claims;
    const gain = credit(p, Math.min(def.reward_that || 0, 1000), config());
    save(row, p);
    return { profile: publicRec("Profile", getRow("Profile", row.id), ctx), reward: gain };
  },
};
export const run = (name, ctx, body) => { if (!actions[name]) throw httpErr(404, "Unknown action"); return tx(() => actions[name](ctx, body || {})); };
