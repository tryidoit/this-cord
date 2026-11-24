// Parse a search query string into structured filters.
// Supported: from:, in:, has:link/image, mentions:, before:, after:, during:today/yesterday/week, pinned:
// Returns: { text, from, in:channelName, has, mentions, before, after, pinned }

export function parseSearchQuery(query) {
  const result = { text: "", from: null, in: null, has: null, mentions: null, before: null, after: null, pinned: null };
  if (!query) return result;

  const tokens = query.split(/\s+/);
  const textParts = [];

  for (const token of tokens) {
    const colonIdx = token.indexOf(":");
    if (colonIdx > 0) {
      const key = token.slice(0, colonIdx).toLowerCase();
      const value = token.slice(colonIdx + 1);
      if (!value) continue;
      switch (key) {
        case "from":
          result.from = value.replace(/^@/, "");
          break;
        case "in":
          result.in = value.replace(/^#/, "");
          break;
        case "has":
          if (value === "link" || value === "image" || value === "attachment") result.has = value;
          break;
        case "mentions":
          result.mentions = value.replace(/^@/, "");
          break;
        case "before":
          result.before = parseDate(value);
          break;
        case "after":
          result.after = parseDate(value);
          break;
        case "during":
          { const range = parseDateRange(value); if (range) { result.after = range.start; result.before = range.end; } }
          break;
        case "pinned":
          result.pinned = value === "true" || value === "yes";
          break;
        default:
          textParts.push(token);
      }
    } else {
      textParts.push(token);
    }
  }
  result.text = textParts.join(" ").trim();
  return result;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

function parseDateRange(value) {
  const now = new Date();
  switch (value.toLowerCase()) {
    case "today":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
        end: now.toISOString(),
      };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return {
        start: new Date(y.getFullYear(), y.getMonth(), y.getDate()).toISOString(),
        end: new Date(y.getFullYear(), y.getMonth(), y.getDate() + 1).toISOString(),
      };
    }
    case "week": {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      return { start: w.toISOString(), end: now.toISOString() };
    }
    default:
      return null;
  }
}

// Build an entity filter object from parsed search
export function buildSearchFilter(parsed, channelId, userId) {
  const filter = {};
  if (parsed.text) filter.content = { $regex: parsed.text, $options: "i" };
  if (parsed.from) filter.author_username = parsed.from;
  if (parsed.mentions) filter.mentions = parsed.mentions;
  if (parsed.pinned === true) filter.pinned = true;
  if (parsed.before) filter.created_date = { ...filter.created_date, $lt: parsed.before };
  if (parsed.after) filter.created_date = { ...filter.created_date, $gt: parsed.after };
  if (parsed.has === "image" || parsed.has === "attachment") filter.attachment_type = "image";
  if (parsed.has === "link") {
    filter.content = { ...filter.content, $regex: parsed.text || "https?://", $options: "i" };
  }
  if (channelId) filter.channel_id = channelId;
  return filter;
}

// Build a DM filter
export function buildDmSearchFilter(parsed, threadKeyValue) {
  const filter = {};
  if (parsed.text) filter.content = { $regex: parsed.text, $options: "i" };
  if (parsed.from) filter.from_username = parsed.from;
  if (parsed.mentions) filter.mentions = parsed.mentions;
  if (parsed.pinned === true) filter.pinned = true;
  if (parsed.before) filter.created_date = { ...filter.created_date, $lt: parsed.before };
  if (parsed.after) filter.created_date = { ...filter.created_date, $gt: parsed.after };
  if (parsed.has === "image" || parsed.has === "attachment") filter.attachment_type = "image";
  if (threadKeyValue) filter.thread_key = threadKeyValue;
  return filter;
}