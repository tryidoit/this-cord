import React, { useState } from "react";

// ─── Emoji shortcode map (subset of common emoji) ───
const EMOJI_SHORTCODES = {
  smile: "😄", smiley: "😃", grin: "😁", laugh: "😆", satisfied: "😅",
  wink: "😉", joy: "😂", rofl: "🤣", heart_eyes: "😍", kissing: "😗",
  thinking: "🤔", neutral_face: "😐", expressionless: "😑", rolling_eyes: "🙄",
  smirk: "😏", persevere: "😣", relieved: "😌", pensive: "😔", unamused: "😒",
  crying: "😢", sob: "😭", rage: "😡", angry: "😠", triumph: "😤", sleepy: "😴",
  thumbsup: "👍", thumbsdown: "👎", ok_hand: "👌", v: "✌️", wave: "👋",
  clap: "👏", pray: "🙏", handshake: "🤝", muscle: "💪", point_right: "👉",
  heart: "❤️", orange_heart: "🧡", yellow_heart: "💛", green_heart: "💚", blue_heart: "💙",
  purple_heart: "💜", black_heart: "🖤", white_heart: "🤍", broken_heart: "💔", sparkles: "✨",
  fire: "🔥", hundred: "💯", party: "🎉", balloon: "🎈", gift: "🎁",
  trophy: "🏆", medal: "🥇", rosette: "🎖️", star: "⭐", star2: "🌟",
  eyes: "👀", brain: "🧠", skull: "💀", ghost: "👻", robot: "🤖",
  dog: "🐶", cat: "🐱", mouse: "🐭", hamster: "🐹", rabbit: "🐰",
  coffee: "☕", tea: "🍵", beer: "🍺", wine: "🍷", tada: "🎉",
  rocket: "🚀", earth_africa: "🌍", moon: "🌙", sun: "☀️", rainbow: "🌈",
  check: "✅", cross: "❌", warning: "⚠️", question: "❓", exclamation: "❗",
  pin: "📌", pencil: "✏️", book: "📖", memo: "📝", bell: "🔔",
  music: "🎵", game: "🎮", dice: "🎲", slot: "🎰", bowling: "🎳",
  money: "💰", dollar: "💵", chart: "📈", chart_down: "📉", gem: "💎",
  clock: "⏰", hourglass: "⏳", watch: "⌚", calendar: "📅", pushpin: "📍",
  email: "📧", phone: "📞", mobile: "📱", computer: "💻", keyboard: "⌨️",
  bulb: "💡", wrench: "🔧", hammer: "🔨", gear: "⚙️", lock: "🔒",
  key: "🔑", link: "🔗", scissors: "✂️", ruler: "📏",
  shoe: "👟", shirt: "👕", jeans: "👖", dress: "👗", bikini: "👙",
  hat: "🎩", crown: "👑", ring: "💍", 
  car: "🚗", taxi: "🚕", bus: "🚌", train: "🚆", airplane: "✈️",
  bike: "🚲", boat: "⛵", traffic: "🚦", construction: "🚧", fuel: "⛽",
  house: "🏠", office: "🏢", hospital: "🏥", bank: "🏦", church: "⛪",
  school: "🏫", factory: "🏭", castle: "🏰", tent: "⛺", fountain: "⛲",
  mountain: "⛰️", volcano: "🌋", camping: "🏕️", beach: "🏖️", desert: "🏜️",
  soccer: "⚽", basketball: "🏀", football: "🏈", baseball: "⚾", tennis: "🎾",
  volleyball: "🏐", rugby: "🏉", golf: "⛳", hockey: "🏒", ping_pong: "🏓",
  boxing: "🥊", martial: "🥋", ice_skate: "⛸️", fishing: "🎣", running: "🏃",
  surfing: "🏄", swim: "🏊", ski: "⛷️", snowboard: "🏂", weight: "🏋️",
  video_game: "🎮", dart: "🎯", chess: "♟️", puzzle: "🧩",
  art: "🎨", theater: "🎭", circus: "🎪", microphone: "🎤", headphones: "🎧",
  sax: "🎷", guitar: "🎸", piano: "🎹", trumpet: "🎺", violin: "🎻",
  drum: "🥁", flag: "🏁", checkered: "🏁", finish: "🏁",
  discord: "💬", message: "💬", speech: "💬", mail: "✉️", inbox: "📥",
  outbox: "📤", package: "📦", label: "🏷️", bookmark: "🔖", trash: "🗑️",
};

// ─── Inline token parser ───
function parseInline(text, keyPrefix, onMentionClick) {
  if (!text) return [];
  const tokens = [];
  // Combined regex for all inline patterns
  const patterns = [
    { type: "code", re: /`([^`]+)`/ },
    { type: "spoiler", re: /\|\|([^|]+)\|\|/ },
    { type: "bold", re: /\*\*([^*]+)\*\*/ },
    { type: "underline", re: /__([^_]+)__/ },
    { type: "strike", re: /~~([^~]+)~~/ },
    { type: "italic1", re: /\*([^*]+)\*/ },
    { type: "italic2", re: /_([^_]+)_/ },
    { type: "emoji", re: /:([a-z0-9_]+):/gi },
    { type: "timestamp", re: /<t:(\d+):([RdfDtDF])>/g },
    { type: "mention", re: /@([a-zA-Z0-9_]{3,20})/g },
    { type: "channel", re: /#([a-z0-9-]+)/gi },
    { type: "maskedLink", re: /\[([^\]]+)\]\(([^)]+)\)/g },
    { type: "autolink", re: /(https?:\/\/[^\s<]+)/gi },
  ];

  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    let earliest = null;
    let earliestIdx = -1;
    let earliestMatch = null;

    for (const p of patterns) {
      p.re.lastIndex = 0;
      const m = p.re.exec(remaining);
      if (m && (earliestIdx === -1 || m.index < earliestIdx)) {
        earliest = p;
        earliestIdx = m.index;
        earliestMatch = m;
      }
    }

    if (earliestIdx > 0) {
      tokens.push({ type: "text", content: remaining.slice(0, earliestIdx), key: `${keyPrefix}-${keyIdx++}` });
    }
    if (earliestIdx === -1) {
      tokens.push({ type: "text", content: remaining, key: `${keyPrefix}-${keyIdx++}` });
      break;
    }

    const m = earliestMatch;
    const tk = `${keyPrefix}-${keyIdx++}`;

    switch (earliest.type) {
      case "code":
        tokens.push({ type: "code", content: m[1], key: tk });
        break;
      case "spoiler":
        tokens.push({ type: "spoiler", content: m[1], key: tk });
        break;
      case "bold":
        tokens.push({ type: "bold", content: m[1], key: tk });
        break;
      case "underline":
        tokens.push({ type: "underline", content: m[1], key: tk });
        break;
      case "strike":
        tokens.push({ type: "strike", content: m[1], key: tk });
        break;
      case "italic1":
      case "italic2":
        tokens.push({ type: "italic", content: m[1], key: tk });
        break;
      case "emoji":
        const emoji = EMOJI_SHORTCODES[m[1].toLowerCase()];
        tokens.push({ type: "text", content: emoji || `:${m[1]}:`, key: tk });
        break;
      case "timestamp":
        tokens.push({ type: "timestamp", unix: parseInt(m[1]), style: m[2], key: tk });
        break;
      case "mention":
        tokens.push({ type: "mention", username: m[1], key: tk });
        break;
      case "channel":
        tokens.push({ type: "channel", name: m[1], key: tk });
        break;
      case "maskedLink":
        tokens.push({ type: "maskedLink", text: m[1], url: m[2], key: tk });
        break;
      case "autolink":
        tokens.push({ type: "autolink", url: m[1], key: tk });
        break;
    }

    remaining = remaining.slice(earliestIdx + m[0].length);
  }

  return tokens;
}

function renderToken(token, onMentionClick) {
  switch (token.type) {
    case "code":
      return <code key={token.key} className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground">{token.content}</code>;
    case "spoiler":
      return <Spoiler key={token.key} content={token.content} />;
    case "bold":
      return <strong key={token.key} className="font-bold">{token.content}</strong>;
    case "underline":
      return <u key={token.key}>{token.content}</u>;
    case "strike":
      return <s key={token.key} className="line-through">{token.content}</s>;
    case "italic":
      return <em key={token.key}>{token.content}</em>;
    case "timestamp":
      return <Timestamp key={token.key} unix={token.unix} style={token.style} />;
    case "mention":
      return (
        <span
          key={token.key}
          onClick={(e) => { e.stopPropagation(); onMentionClick?.(token.username); }}
          className="cursor-pointer rounded bg-primary/20 px-0.5 font-medium text-primary hover:bg-primary/30"
        >
          @{token.username}
        </span>
      );
    case "channel":
      return <span key={token.key} className="cursor-pointer rounded bg-info/20 px-0.5 font-medium text-info hover:bg-info/30">#{token.name}</span>;
    case "maskedLink":
      return <a key={token.key} href={token.url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{token.text}</a>;
    case "autolink":
      return <a key={token.key} href={token.url} target="_blank" rel="noopener noreferrer" className="text-info underline break-all">{token.url}</a>;
    default:
      return token.content;
  }
}

function Spoiler({ content }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
      className={revealed ? "rounded bg-muted px-0.5" : "cursor-pointer rounded bg-muted-foreground px-0.5 text-transparent hover:text-foreground/50"}
    >
      {content}
    </span>
  );
}

function Timestamp({ unix, style }) {
  const date = new Date(unix * 1000);
  let label = "";
  const now = new Date();
  const diff = date - now;
  switch (style) {
    case "R": {
      const absDiff = Math.abs(diff);
      const mins = Math.floor(absDiff / 60000);
      const hours = Math.floor(absDiff / 3600000);
      const days = Math.floor(absDiff / 86400000);
      if (days > 0) label = diff > 0 ? `in ${days}d` : `${days}d ago`;
      else if (hours > 0) label = diff > 0 ? `in ${hours}h` : `${hours}h ago`;
      else if (mins > 0) label = diff > 0 ? `in ${mins}m` : `${mins}m ago`;
      else label = "just now";
      break;
    }
    case "t": label = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); break;
    case "T": label = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); break;
    case "d": label = date.toLocaleDateString([], { month: "2-digit", day: "2-digit", year: "numeric" }); break;
    case "D": label = date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }); break;
    case "f": label = date.toLocaleString([], { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); break;
    case "F": label = date.toLocaleString([], { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); break;
    default: label = date.toLocaleString();
  }
  return <span title={date.toLocaleString()} className="text-muted-foreground">{label}</span>;
}

// ─── Block parser ───
export function renderMarkdown(text, onMentionClick) {
  if (!text) return text;
  const lines = text.split("\n");
  const blocks = [];
  let codeBlock = null;
  let quoteLines = [];
  let listLines = [];

  const flushQuote = () => {
    if (quoteLines.length) {
      blocks.push({ type: "quote", content: quoteLines.join("\n"), key: `q-${blocks.length}` });
      quoteLines = [];
    }
  };
  const flushList = () => {
    if (listLines.length) {
      blocks.push({ type: "list", items: listLines, key: `l-${blocks.length}` });
      listLines = [];
    }
  };

  lines.forEach((line, i) => {
    if (codeBlock) {
      if (line.trim().startsWith("```")) {
        blocks.push({ type: "codeblock", content: codeBlock, key: `cb-${blocks.length}` });
        codeBlock = null;
      } else {
        codeBlock += (codeBlock ? "\n" : "") + line;
      }
      return;
    }
    if (line.trim().startsWith("```")) {
      flushQuote();
      flushList();
      codeBlock = "";
      return;
    }
    if (line.startsWith("> ")) {
      flushList();
      quoteLines.push(line.slice(2));
      return;
    } else {
      flushQuote();
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const item = line.replace(/^\s*[-*]\s+/, "");
      listLines.push(item);
      return;
    } else {
      flushList();
    }
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      blocks.push({ type: "header", level, content: line.replace(/^#+\s/, ""), key: `h-${blocks.length}` });
      return;
    }
    blocks.push({ type: "text", content: line, key: `t-${blocks.length}` });
  });
  flushQuote();
  flushList();
  if (codeBlock) blocks.push({ type: "codeblock", content: codeBlock, key: `cb-${blocks.length}` });

  return blocks.map((block) => {
    switch (block.type) {
      case "codeblock":
        return <CodeBlock key={block.key} content={block.content} />;
      case "header": {
        const sizes = { 1: "text-lg font-bold", 2: "text-base font-bold", 3: "text-sm font-semibold" };
        return <p key={block.key} className={sizes[block.level]}>{block.content}</p>;
      }
      case "quote":
        return (
          <blockquote key={block.key} className="border-l-4 border-border pl-3 text-muted-foreground">
            {block.content.split("\n").map((l, i) => (
              <React.Fragment key={i}>{i > 0 && <br />}{parseInline(l, `${block.key}-${i}`, onMentionClick).map(t => renderToken(t, onMentionClick))}</React.Fragment>
            ))}
          </blockquote>
        );
      case "list":
        return (
          <ul key={block.key} className="list-disc pl-5">
            {block.items.map((item, i) => (
              <li key={i}>{parseInline(item, `${block.key}-${i}`, onMentionClick).map(t => renderToken(t, onMentionClick))}</li>
            ))}
          </ul>
        );
      default: {
        const inlineTokens = parseInline(block.content, block.key, onMentionClick);
        return <span key={block.key}>{inlineTokens.map(t => renderToken(t, onMentionClick))}</span>;
      }
    }
  });
}

function CodeBlock({ content }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative my-1 rounded-lg border border-border bg-background/80">
      <button
        onClick={(e) => { e.stopPropagation(); copy(); }}
        className="absolute right-2 top-2 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed text-foreground">
        <code>{content}</code>
      </pre>
    </div>
  );
}

export { EMOJI_SHORTCODES };