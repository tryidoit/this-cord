import { db, tx, now, uuid } from "./db.js";
import { httpErr } from "./query.js";
import { getRow, publicRec, profileOf } from "./entities.js";

const rec = (row) => ({ id: row.id, ...JSON.parse(row.data), created_by_id: row.created_by_id });
const save = (row, d) => db.prepare("UPDATE records SET data=?, updated_date=? WHERE id=?").run(JSON.stringify(d), now(), row.id);
const norm = (c) => String(c || "").trim().toUpperCase();
const touched = [];

export function lookupInvite(code) {
  const c = norm(code); if (c.length < 4 || c.length > 32) throw httpErr(404, "Invalid invite code");
  const row = db.prepare("SELECT * FROM records WHERE entity='Server' AND upper(json_extract(data,'$.invite_code'))=? LIMIT 1").get(c);
  if (!row) throw httpErr(404, "Invalid invite code");
  const s = rec(row);
  return { id: s.id, name: s.name, icon: s.icon, color: s.color, description: s.description, join_cost: s.join_cost || 0, members: (s.member_user_ids || []).length, invite_only: !!s.invite_only };
}

export function join(ctx, serverId, { invite_code } = {}) {
  touched.length = 0;
  return tx(() => {
    const row = getRow("Server", serverId); if (!row) throw httpErr(404, "Server not found");
    const s = JSON.parse(row.data); const uid = ctx.user.id; const p = profileOf(uid);
    if (p?.is_banned) throw httpErr(403, "You are banned");
    const members = s.member_user_ids || [];
    const isOwner = row.created_by_id === uid;
    if (members.includes(uid) || isOwner) return finish(row, s, uid, p, ctx, false);
    if (s.invite_only && (!s.invite_code || norm(invite_code) !== norm(s.invite_code))) throw httpErr(403, "This server is invite-only");
    const cost = Math.max(0, Number(s.join_cost) || 0);
    let paid = 0;
    if (cost > 0) {
      const prow = db.prepare("SELECT * FROM records WHERE entity='Profile' AND created_by_id=?").get(uid); const pd = JSON.parse(prow.data);
      if (!(pd.cheat_codes || []).includes("infinite_coins")) {
        if ((pd.points || 0) < cost) throw httpErr(402, `You need ${cost} coins to join`);
        pd.points -= cost; save(prow, pd); touched.push(["Profile", prow.id]);
      }
      paid = cost;
    }
    s.member_user_ids = [...members, uid]; save(row, s);
    return finish(row, s, uid, p, ctx, true, paid);
  });
}

function finish(row, s, uid, p, ctx, added, paid = 0) {
  const sid = row.id;
  const chans = db.prepare("SELECT * FROM records WHERE entity='Channel' AND json_extract(data,'$.server_id')=?").all(sid);
  for (const ch of chans) {
    const d = JSON.parse(ch.data);
    if (d.is_private || d.thread_type === "private" || d.type === "thread") continue;
    if (!(d.member_user_ids || []).includes(uid)) { d.member_user_ids = [...(d.member_user_ids || []), uid]; save(ch, d); }
  }
  const sms = db.prepare("SELECT * FROM records WHERE entity='ServerMember' AND json_extract(data,'$.server_id')=?").all(sid);
  const all = new Set([...(s.member_user_ids || []), uid]);
  let mine = sms.find((m) => JSON.parse(m.data).user_id === uid);
  for (const m of sms) { const d = JSON.parse(m.data); d.server_member_user_ids = [...all]; save(m, d); }
  if (!mine) {
    const t = now(); const d = { server_id: sid, user_id: uid, username: p?.username, paid, server_member_user_ids: [...all] };
    db.prepare("INSERT INTO records VALUES (?,?,?,?,?,?,?)").run(uuid(), "ServerMember", JSON.stringify(d), uid, ctx.user.email, t, t);
  }
  return { server: publicRec("Server", getRow("Server", sid), ctx), joined: added, touched: [["Server", sid], ...touched] };
}

export function leave(ctx, serverId) {
  return tx(() => {
    const row = getRow("Server", serverId); if (!row) throw httpErr(404, "Server not found");
    const uid = ctx.user.id;
    if (row.created_by_id === uid) throw httpErr(400, "Owners can't leave — delete or transfer the server instead");
    const s = JSON.parse(row.data); s.member_user_ids = (s.member_user_ids || []).filter((x) => x !== uid); save(row, s);
    for (const ch of db.prepare("SELECT * FROM records WHERE entity='Channel' AND json_extract(data,'$.server_id')=?").all(serverId)) {
      const d = JSON.parse(ch.data);
      d.member_user_ids = (d.member_user_ids || []).filter((x) => x !== uid); d.thread_member_ids = (d.thread_member_ids || []).filter((x) => x !== uid); save(ch, d);
    }
    for (const m of db.prepare("SELECT * FROM records WHERE entity='ServerMember' AND json_extract(data,'$.server_id')=?").all(serverId)) {
      const d = JSON.parse(m.data);
      if (d.user_id === uid) db.prepare("DELETE FROM records WHERE id=?").run(m.id);
      else { d.server_member_user_ids = (d.server_member_user_ids || []).filter((x) => x !== uid); save(m, d); }
    }
    return { ok: true, touched: [["Server", serverId]] };
  });
}
