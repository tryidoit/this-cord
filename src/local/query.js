// Translates the client filter language ($or/$and/$in/$gt/$lt/$ne/$regex) and the
// RLS-style policy language into parameterised SQLite over records.data (JSON).
const COLS = { id: "id", created_by_id: "created_by_id", created_by: "created_by", created_date: "created_date", updated_date: "updated_date" };
const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

function col(field) {
  if (COLS[field]) return COLS[field];
  if (!FIELD_RE.test(field)) throw httpErr(400, `Bad field name`);
  return `json_extract(data,'$.${field}')`;
}
const arr = (field) => `json_each(records.data,'$.${field}')`;
const val = (v) => (v === true ? 1 : v === false ? 0 : v);
export function httpErr(status, message) { const e = new Error(message); e.status = status; return e; }

function cond(field, v, params) {
  const c = col(field);
  const isData = !COLS[field];
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    const parts = [];
    for (const [op, x] of Object.entries(v)) {
      if (op === "$in") {
        if (!Array.isArray(x) || x.length > 500) throw httpErr(400, "Bad $in");
        if (!x.length) { parts.push("0"); continue; }
        params.push(...x.map(val));
        parts.push(`${c} IN (${x.map(() => "?").join(",")})`);
      } else if (op === "$ne") {
        params.push(val(x)); parts.push(`(${c} IS NOT ?)`);
      } else if (op === "$gt" || op === "$lt" || op === "$gte" || op === "$lte") {
        params.push(val(x)); parts.push(`${c} ${{ $gt: ">", $lt: "<", $gte: ">=", $lte: "<=" }[op]} ?`);
      } else if (op === "$regex") {
        // Never run user regexes (ReDoS): treat as a case-insensitive literal substring.
        const s = String(x).replace(/^\^|\$$/g, "").slice(0, 100).replace(/[\\%_]/g, (m) => "\\" + m);
        params.push(`%${s}%`); parts.push(`${c} LIKE ? ESCAPE '\\'`);
      } else if (op === "$options") { /* handled above */ }
      else throw httpErr(400, `Unsupported operator ${op}`);
    }
    return parts.length ? parts.join(" AND ") : "1";
  }
  if (v === null || v === undefined) return `${c} IS NULL`;
  // equality on an array field means "contains"
  if (isData) {
    params.push(val(v), val(v));
    return `(${c} = ? OR (json_type(records.data,'$.${field}')='array' AND EXISTS (SELECT 1 FROM ${arr(field)} WHERE value = ?)))`;
  }
  params.push(val(v));
  return `${c} = ?`;
}

export function build(q, params, ctx = {}, depth = 0) {
  if (depth > 6) throw httpErr(400, "Filter too deep");
  if (!q || typeof q !== "object") return "1";
  const parts = [];
  for (const [k, v] of Object.entries(q)) {
    if (k === "$or" || k === "$and") {
      if (!Array.isArray(v) || v.length > 20) throw httpErr(400, "Bad " + k);
      const subs = v.map((s) => build(s, params, ctx, depth + 1));
      parts.push(subs.length ? `(${subs.join(k === "$or" ? " OR " : " AND ")})` : "1");
    } else if (k === "user_condition") {
      const ok = Object.entries(v).every(([f, want]) => ctx.user?.[f] === want);
      parts.push(ok ? "1" : "0");
    } else {
      const field = k.startsWith("data.") ? k.slice(5) : k;
      let value = v;
      if (value === "{{user.id}}") value = ctx.user?.id ?? "__anon__";
      if (value && typeof value === "object" && !Array.isArray(value)) {
        value = Object.fromEntries(Object.entries(value).map(([a, b]) => [a, b === "{{user.id}}" ? (ctx.user?.id ?? "__anon__") : b]));
      }
      parts.push(cond(field, value, params));
    }
  }
  return parts.length ? parts.join(" AND ") : "1";
}

export function sortClause(sort) {
  if (!sort) return "created_date DESC";
  const s = String(sort); const desc = s.startsWith("-"); const f = s.replace(/^[-+]/, "");
  return `${col(f)} ${desc ? "DESC" : "ASC"}, id`;
}
