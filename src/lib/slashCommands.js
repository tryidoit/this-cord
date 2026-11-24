// Slash command definitions — each command returns one of:
//   { type: "message", content }           → send as a normal message
//   { type: "system", content, ... }       → send as a system message
//   { type: "poll", pollText }             → create a poll
//   { type: "action", action, payload }    → execute a side-effect (handled by ChatPane)
//   { type: "noop", toast: { title, desc } }→ do nothing, show a toast

export const SLASH_COMMANDS = [
  // ── Fun / text ──
  { cmd: "/me", desc: "Display an action", usage: "/me <action>", category: "Fun" },
  { cmd: "/shrug", desc: "Appends ¯\\_(ツ)_/¯", usage: "/shrug [message]", category: "Fun" },
  { cmd: "/tableflip", desc: "Appends (╯°□°)╯︵ ┻━┻", usage: "/tableflip [message]", category: "Fun" },
  { cmd: "/unflip", desc: "Appends ┬─┬ ノ( ゜-゜ノ)", usage: "/unflip [message]", category: "Fun" },
  { cmd: "/spoiler", desc: "Wrap text in spoiler tags", usage: "/spoiler <text>", category: "Fun" },
  { cmd: "/lenny", desc: "( ͡° ͜ʖ ͡°)", usage: "/lenny [message]", category: "Fun" },
  { cmd: "/wave", desc: "Sends a wave 👋", usage: "/wave", category: "Fun" },
  { cmd: "/dance", desc: "Sends a dance 🕺", usage: "/dance", category: "Fun" },
  { cmd: "/coinflip", desc: "Flip a coin", usage: "/coinflip", category: "Fun" },
  { cmd: "/dice", desc: "Roll a die", usage: "/dice [sides]", category: "Fun" },
  { cmd: "/8ball", desc: "Magic 8-ball", usage: "/8ball <question>", category: "Fun" },
  { cmd: "/choose", desc: "Pick randomly", usage: "/choose <a> | <b> | ...", category: "Fun" },
  { cmd: "/rate", desc: "Rate something /10", usage: "/rate <thing>", category: "Fun" },

  // ── Utility ──
  { cmd: "/tts", desc: "Read text aloud", usage: "/tts <text>", category: "Utility" },
  { cmd: "/nick", desc: "Change your nickname", usage: "/nick <new nickname>", category: "Utility" },
  { cmd: "/remind", desc: "Set a reminder", usage: "/remind <time> <message>", category: "Utility" },
  { cmd: "/poll", desc: "Create a poll", usage: "/poll <question> | option1 | option2", category: "Utility" },
  { cmd: "/clear", desc: "Clear chat (local only)", usage: "/clear", category: "Utility" },
  { cmd: "/help", desc: "Show all commands", usage: "/help", category: "Utility" },
  { cmd: "/online", desc: "Show online players", usage: "/online", category: "Utility" },

  // ── Social / economy ──
  { cmd: "/tip", desc: "Send coins", usage: "/tip <@user> <amount> [note]", category: "Social" },
  { cmd: "/gift", desc: "Open the gift dialog", usage: "/gift <@user>", category: "Social" },
  { cmd: "/call", desc: "Start a voice call", usage: "/call <@user>", category: "Social" },
  { cmd: "/video", desc: "Start a video call", usage: "/video <@user>", category: "Social" },
  { cmd: "/profile", desc: "View a player's profile", usage: "/profile <@user>", category: "Social" },
  { cmd: "/dm", desc: "Open a DM", usage: "/dm <@user>", category: "Social" },

  // ── Navigation ──
  { cmd: "/shop", desc: "Open the avatar shop", usage: "/shop", category: "Nav" },
  { cmd: "/games", desc: "Open the arcade", usage: "/games", category: "Nav" },
  { cmd: "/leaderboard", desc: "Open the leaderboard", usage: "/leaderboard", category: "Nav" },
  { cmd: "/appearance", desc: "Open appearance settings", usage: "/appearance", category: "Nav" },
  { cmd: "/admin", desc: "Open admin panel", usage: "/admin", category: "Nav" },

  // ── Moderation ──
  { cmd: "/warn", desc: "Warn a member", usage: "/warn <@user> <reason>", category: "Mod" },
  { cmd: "/timeout", desc: "Timeout a member", usage: "/timeout <@user> <minutes> [reason]", category: "Mod" },
  { cmd: "/purge", desc: "Delete messages", usage: "/purge <count>", category: "Mod" },
];

export const SLASH_CATEGORIES = ["Fun", "Utility", "Social", "Nav", "Mod"];

const EIGHT_BALL_ANSWERS = [
  "It is certain.", "Without a doubt.", "Yes, definitely.", "You may rely on it.",
  "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.",
  "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.",
  "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.",
  "Very doubtful.",
];

export function processSlashCommand(input, profile, context = {}) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const spaceIdx = trimmed.indexOf(" ");
  const cmd = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
  const args = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1);

  switch (cmd) {
    // ── Fun ──
    case "/me":
      return { type: "system", content: `*${args}*` };
    case "/shrug":
      return { type: "message", content: `${args} ¯\\_(ツ)_/¯`.trim() };
    case "/tableflip":
      return { type: "message", content: `${args} (╯°□°)╯︵ ┻━┻`.trim() };
    case "/unflip":
      return { type: "message", content: `${args} ┬─┬ ノ( ゜-゜ノ)`.trim() };
    case "/spoiler":
      return { type: "message", content: `||${args}||` };
    case "/lenny":
      return { type: "message", content: `${args} ( ͡° ͜ʖ ͡°)`.trim() };
    case "/wave":
      return { type: "message", content: "👋" };
    case "/dance":
      return { type: "message", content: "🕺" };
    case "/coinflip": {
      const flip = Math.random() < 0.5 ? "Heads" : "Tails";
      return { type: "message", content: `🪙 ${flip}` };
    }
    case "/dice": {
      const sides = Math.max(2, Math.min(100, parseInt(args) || 6));
      return { type: "message", content: `🎲 You rolled a **${Math.floor(Math.random() * sides) + 1}** (d${sides})` };
    }
    case "/8ball":
      return { type: "message", content: `🎱 ${EIGHT_BALL_ANSWERS[Math.floor(Math.random() * EIGHT_BALL_ANSWERS.length)]}` };
    case "/choose": {
      const parts = args.split("|").map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) return { type: "noop", toast: { title: "Need at least 2 options", variant: "destructive" } };
      return { type: "message", content: `🤔 I choose: **${parts[Math.floor(Math.random() * parts.length)]}**` };
    }
    case "/rate": {
      const thing = args.trim() || "it";
      return { type: "message", content: `📊 I rate **${thing}** a ${Math.floor(Math.random() * 11)}/10` };
    }

    // ── Utility ──
    case "/tts":
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(args);
        utterance.rate = 1.0;
        speechSynthesis.speak(utterance);
      }
      return { type: "message", content: args };
    case "/nick":
      if (!args.trim()) return { type: "noop", toast: { title: "Usage: /nick <new nickname>" } };
      return { type: "action", action: "nick", payload: { nickname: args.trim().slice(0, 32) } };
    case "/remind":
      return { type: "action", action: "remind", payload: { args } };
    case "/poll":
      return { type: "poll", pollText: args };
    case "/clear":
      return { type: "action", action: "clear" };
    case "/help":
      return { type: "action", action: "help" };
    case "/online":
      return { type: "action", action: "online" };

    // ── Social ──
    case "/tip":
      return { type: "action", action: "tip", payload: { args } };
    case "/gift": {
      const mentioned = args.match(/@([a-zA-Z0-9_]{3,20})/);
      if (!mentioned) return { type: "noop", toast: { title: "Usage: /gift <@user>", variant: "destructive" } };
      return { type: "action", action: "gift", payload: { username: mentioned[1] } };
    }
    case "/call": {
      const mentioned = args.match(/@([a-zA-Z0-9_]{3,20})/);
      if (!mentioned) return { type: "noop", toast: { title: "Usage: /call <@user>", variant: "destructive" } };
      return { type: "action", action: "call", payload: { username: mentioned[1], mode: "voice" } };
    }
    case "/video": {
      const mentioned = args.match(/@([a-zA-Z0-9_]{3,20})/);
      if (!mentioned) return { type: "noop", toast: { title: "Usage: /video <@user>", variant: "destructive" } };
      return { type: "action", action: "call", payload: { username: mentioned[1], mode: "video" } };
    }
    case "/profile": {
      const mentioned = args.match(/@([a-zA-Z0-9_]{3,20})/);
      if (!mentioned) return { type: "noop", toast: { title: "Usage: /profile <@user>", variant: "destructive" } };
      return { type: "action", action: "profile", payload: { username: mentioned[1] } };
    }
    case "/dm": {
      const mentioned = args.match(/@([a-zA-Z0-9_]{3,20})/);
      if (!mentioned) return { type: "noop", toast: { title: "Usage: /dm <@user>", variant: "destructive" } };
      return { type: "action", action: "dm", payload: { username: mentioned[1] } };
    }

    // ── Navigation ──
    case "/shop": return { type: "action", action: "navigate", payload: { path: "/shop" } };
    case "/games": return { type: "action", action: "navigate", payload: { path: "/games" } };
    case "/leaderboard": return { type: "action", action: "navigate", payload: { path: "/leaderboard" } };
    case "/appearance": return { type: "action", action: "navigate", payload: { path: "/appearance" } };
    case "/admin": return { type: "action", action: "navigate", payload: { path: "/admin" } };

    // ── Moderation ──
    case "/warn": {
      const mentioned = args.match(/@([a-zA-Z0-9_]{3,20})/);
      if (!mentioned) return { type: "noop", toast: { title: "Usage: /warn <@user> <reason>", variant: "destructive" } };
      return { type: "action", action: "modWarn", payload: { username: mentioned[1], reason: args.replace(mentioned[0], "").trim() } };
    }
    case "/timeout": {
      const mentioned = args.match(/@([a-zA-Z0-9_]{3,20})/);
      if (!mentioned) return { type: "noop", toast: { title: "Usage: /timeout <@user> <minutes> [reason]", variant: "destructive" } };
      const rest = args.replace(mentioned[0], "").trim();
      const minutes = parseInt(rest) || 10;
      const reason = rest.replace(/^\d+/, "").trim();
      return { type: "action", action: "modTimeout", payload: { username: mentioned[1], minutes, reason } };
    }
    case "/purge": {
      const count = parseInt(args) || 10;
      return { type: "action", action: "modPurge", payload: { count } };
    }

    default:
      return { type: "noop", toast: { title: `Unknown command: ${cmd}`, variant: "destructive" } };
  }
}

// Parse /poll arguments: "question | opt1 | opt2 | ..."
export function parsePollArgs(args) {
  const parts = args.split("|").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const question = parts[0];
  const options = parts.slice(1).map((text, i) => ({ text, voter_ids: [] }));
  return {
    question,
    options,
    multi_select: false,
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Parse /tip arguments: "@user 100 note here" or "@user 100"
export function parseTipArgs(args) {
  const mentioned = args.match(/@([a-zA-Z0-9_]{3,20})/);
  if (!mentioned) return null;
  const rest = args.replace(mentioned[0], "").trim();
  const amountMatch = rest.match(/^(\d+)/);
  if (!amountMatch) return null;
  const amount = parseInt(amountMatch[1]);
  const note = rest.slice(amountMatch[0].length).trim().slice(0, 120);
  return { username: mentioned[1], amount, note };
}