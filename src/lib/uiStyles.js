// Style registry — 23 styles (Current, Discord, 21 DesignPrompts), each with dark + light tokens.
import { THEMES } from "./themes";

// ─── Helpers ───────────────────────────────────────────────────────────
function hx(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h = Math.round(h * 60);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
  }
  return `${h} ${s}% ${l}%`;
}

function v(val) {
  if (val == null) return null;
  if (typeof val === "string" && val.startsWith("#")) return hx(val);
  return val;
}

function setL(hsl, newL) {
  const m = hsl.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/);
  if (!m) return hsl;
  return `${m[1]} ${m[2]}% ${newL}%`;
}

function lightFromDark(d) {
  return {
    ...d,
    bg: setL(d.bg, 97), card: setL(d.card, 99), sidebar: setL(d.sidebar, 95),
    border: setL(d.border, 88), muted: setL(d.muted, 92), mutedFg: setL(d.mutedFg, 42),
    accent: setL(d.accent, 90), fg: setL(d.fg, 12),
  };
}

function tk(c) {
  const bg = v(c.bg), fg = v(c.fg), card = v(c.card), sidebar = v(c.sidebar);
  const border = v(c.border), muted = v(c.muted), mutedFg = v(c.mutedFg);
  const primary = v(c.primary), accent = v(c.accent);
  return {
    "--background": bg, "--foreground": fg,
    "--card": card, "--card-foreground": fg,
    "--popover": card, "--popover-foreground": fg,
    "--primary": primary, "--primary-foreground": v(c.primaryFg) || "0 0% 100%",
    "--secondary": muted, "--secondary-foreground": fg,
    "--muted": muted, "--muted-foreground": mutedFg,
    "--accent": accent, "--accent-foreground": v(c.accentFg) || fg,
    "--destructive": v(c.destructive) || "0 84% 60%", "--destructive-foreground": "0 0% 100%",
    "--border": border, "--input": v(c.input) || border, "--ring": v(c.ring) || primary,
    "--sidebar-background": sidebar, "--sidebar-foreground": fg,
    "--sidebar-primary": primary, "--sidebar-primary-foreground": "0 0% 100%",
    "--sidebar-accent": accent, "--sidebar-accent-foreground": fg,
    "--sidebar-border": border, "--sidebar-ring": v(c.ring) || primary,
    "--success": v(c.success) || "142 71% 45%", "--warning": v(c.warning) || "38 92% 50%",
    "--danger": v(c.danger) || "0 84% 60%", "--info": v(c.info) || "199 89% 48%",
    "--online": v(c.online) || "142 71% 45%", "--idle": v(c.idle) || "43 89% 50%",
    "--dnd": v(c.dnd) || "0 84% 60%", "--mention": v(c.mention) || primary,
    "--radius": c.radius || "0.5rem",
  };
}

// ─── Font registry ─────────────────────────────────────────────────────
const FONT_W = {
  "Space Grotesk": [400, 500, 600, 700], "Inter": [400, 500, 600, 700],
  "Inter Tight": [400, 500, 600, 700], "Noto Sans": [400, 500, 600, 700],
  "Source Code Pro": [400, 500, 600], "Host Grotesk": [400, 500, 600, 700],
  "Instrument Sans": [400, 500, 600, 700], "IBM Plex Mono": [400, 500, 600],
  "IBM Plex Sans": [400, 500, 600, 700], "JetBrains Mono": [400, 500, 600, 700],
  "Playfair Display": [400, 500, 600, 700], "Source Serif 4": [400, 500, 600, 700],
  "Cormorant Garamond": [400, 500, 600, 700], "Jost": [400, 500, 600, 700],
  "Lora": [400, 500, 600, 700], "Libre Baskerville": [400, 700],
  "Courier Prime": [400, 700], "Orbitron": [400, 500, 600, 700, 800, 900],
  "Rajdhani": [400, 500, 600, 700], "Share Tech Mono": [400],
  "Baloo 2": [400, 500, 600, 700, 800], "Nunito": [400, 500, 600, 700, 800],
  "Fira Code": [400, 500, 600, 700], "Fraunces": [400, 500, 600, 700, 900],
  "Poiret One": [400], "Lato": [400, 700], "Space Mono": [400, 700],
  "Outfit": [400, 500, 600, 700], "DM Sans": [400, 500, 600, 700],
  "DM Mono": [400, 500], "Kalam": [400, 700], "Patrick Hand": [400],
  "Barlow Condensed": [400, 500, 600, 700], "Barlow": [400, 500, 600, 700],
  "Roboto Mono": [400, 500, 700], "Press Start 2P": [400],
  "Pixelify Sans": [400, 500, 600, 700], "Unbounded": [400, 500, 600, 700, 800],
  "Atkinson Hyperlegible": [400, 700],
};

function isGoogleFont(f) {
  return f && !f.includes("ui-") && !f.includes("system") && !f.includes("monospace") && !f.includes("Menlo");
}

function fontUrl(families) {
  const seen = new Set(), params = [];
  for (const f of families) {
    if (!f || !isGoogleFont(f) || seen.has(f)) continue;
    seen.add(f);
    const w = FONT_W[f] || [400, 700];
    params.push("family=" + f.replace(/ /g, "+") + ":wght@" + w.join(";"));
  }
  if (!params.length) return null;
  return "https://fonts.googleapis.com/css2?" + params.join("&") + "&display=swap";
}

function fontStack(family, type) {
  if (!isGoogleFont(family)) return family;
  const fb = type === "mono"
    ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    : "ui-sans-serif, system-ui, sans-serif";
  return "'" + family + "', " + fb;
}

// ─── Current style palettes (24 dark + 24 light) ───────────────────────
const CURRENT_PALETTES = THEMES.map(function (t) {
  var darkSpec = { bg: t.bg, fg: t.fg, card: t.card, sidebar: t.sidebar, border: t.border, muted: t.muted, mutedFg: t.mutedFg, primary: t.primary, accent: t.accent };
  return {
    id: t.id, name: t.name,
    dark: tk(darkSpec),
    light: tk(lightFromDark(darkSpec)),
    wallpaper: t.sidebarStyle,
  };
});

// ─── Style registry ────────────────────────────────────────────────────
export var UI_STYLES = [
  {
    id: "current", name: "Current", source: "current", order: 1,
    fonts: { display: "Space Grotesk", body: "Inter", mono: "ui-monospace, SFMono-Regular, Menlo, monospace" },
    palettes: CURRENT_PALETTES,
    effects: { glow: true, noise: false, scanlines: false, glass: false },
    radius: "0.85rem",
  },
  {
    id: "discord", name: "Discord", source: "discord", order: 2,
    fonts: { display: "Noto Sans", body: "Noto Sans", mono: "Source Code Pro" },
    tokens: {
      dark: tk({ bg: "#313338", fg: "#dbdee1", card: "#383a40", sidebar: "#2b2d31", border: "#1e1f22", muted: "#2b2d31", mutedFg: "#949ba4", primary: "#5865F2", accent: "#4e5058", success: "#23a559", warning: "#f0b232", danger: "#da373c", info: "#5865F2" }),
      light: tk({ bg: "#ffffff", fg: "#313338", card: "#ebedef", sidebar: "#f2f3f5", border: "#e3e5e8", muted: "#f2f3f5", mutedFg: "#5c5e66", primary: "#5865F2", accent: "#d4d7dc", success: "#23a559", warning: "#f0b232", danger: "#da373c", info: "#5865F2" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0.5rem",
  },
  {
    id: "saas", name: "Software", source: "designprompts", order: 3,
    fonts: { display: "Host Grotesk", body: "Instrument Sans", mono: "IBM Plex Mono" },
    tokens: {
      dark: tk({ bg: "#0b0c10", fg: "#ededf2", card: "#14161c", sidebar: "#0e1015", border: "#1f2230", muted: "#1a1d26", mutedFg: "#8a8f9c", primary: "#2f5bff", accent: "#1a1d26" }),
      light: tk({ bg: "#fbfbfa", fg: "#0b0b0f", card: "#ffffff", sidebar: "#f4f4f3", border: "#e0e0dc", muted: "#f0f0ee", mutedFg: "#6b6b72", primary: "#2f5bff", accent: "#ebedef" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0.375rem",
  },
  {
    id: "modern-dark", name: "Modern Dark", source: "designprompts", order: 4,
    fonts: { display: "Inter", body: "Inter", mono: "JetBrains Mono" },
    tokens: {
      dark: tk({ bg: "#0a0a0f", fg: "#ededf2", card: "#12121a", sidebar: "#0e0e14", border: "#1a1a2a", muted: "#1a1a24", mutedFg: "#8a8a9c", primary: "#7c6cff", accent: "#1a1a24" }),
      light: tk({ bg: "#f6f7fb", fg: "#1a1a24", card: "#ffffff", sidebar: "#edeef4", border: "#d0d0e0", muted: "#e8e9f0", mutedFg: "#6b6b7a", primary: "#7c6cff", accent: "#e8e9f0" }),
    },
    effects: { glow: true, noise: false, scanlines: false, glass: true },
    radius: "0.875rem",
  },
  {
    id: "swiss-minimalist", name: "Swiss Minimalist", source: "designprompts", order: 5,
    fonts: { display: "Inter Tight", body: "Inter", mono: "IBM Plex Mono" },
    tokens: {
      dark: tk({ bg: "#0a0a0a", fg: "#ffffff", card: "#141414", sidebar: "#0f0f0f", border: "#2a2a2a", muted: "#1a1a1a", mutedFg: "#8a8a8a", primary: "#ff3000", accent: "#1a1a1a" }),
      light: tk({ bg: "#ffffff", fg: "#000000", card: "#ffffff", sidebar: "#f8f8f8", border: "#000000", muted: "#f0f0f0", mutedFg: "#666666", primary: "#ff3000", accent: "#f0f0f0" }),
    },
    effects: { glow: false, noise: true, scanlines: false, glass: false },
    radius: "0",
  },
  {
    id: "monochrome", name: "Monochrome", source: "designprompts", order: 6,
    fonts: { display: "Playfair Display", body: "Source Serif 4", mono: "IBM Plex Mono" },
    tokens: {
      dark: tk({ bg: "#000000", fg: "#ffffff", card: "#0a0a0a", sidebar: "#050505", border: "#1a1a1a", muted: "#111111", mutedFg: "#8a8a8a", primary: "#ffffff", accent: "#111111" }),
      light: tk({ bg: "#ffffff", fg: "#000000", card: "#ffffff", sidebar: "#f8f8f8", border: "#000000", muted: "#f0f0f0", mutedFg: "#666666", primary: "#000000", accent: "#f0f0f0" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0",
  },
  {
    id: "luxury", name: "Luxury", source: "designprompts", order: 7,
    fonts: { display: "Cormorant Garamond", body: "Jost", mono: "IBM Plex Mono" },
    tokens: {
      dark: tk({ bg: "#0f0d0a", fg: "#f3e9c8", card: "#1a1714", sidebar: "#12100d", border: "#2a2520", muted: "#1f1b16", mutedFg: "#8a7e6a", primary: "#b08d57", accent: "#1f1b16" }),
      light: tk({ bg: "#faf7f2", fg: "#1c1a17", card: "#ffffff", sidebar: "#f4efe6", border: "#e0d8cc", muted: "#ede6db", mutedFg: "#8a7e6a", primary: "#b08d57", accent: "#ede6db" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0.125rem",
  },
  {
    id: "web3", name: "Financial", source: "designprompts", order: 8,
    fonts: { display: "Space Grotesk", body: "Inter", mono: "JetBrains Mono" },
    tokens: {
      dark: tk({ bg: "#07090f", fg: "#e6ecff", card: "#0e1320", sidebar: "#0a0e18", border: "#1a2030", muted: "#121828", mutedFg: "#6a7a9a", primary: "#00e0b8", accent: "#121828" }),
      light: tk({ bg: "#f3f6fc", fg: "#1a2030", card: "#ffffff", sidebar: "#e8edf5", border: "#d0d8e5", muted: "#e0e5f0", mutedFg: "#5a6a8a", primary: "#00e0b8", accent: "#e0e5f0" }),
    },
    effects: { glow: true, noise: false, scanlines: false, glass: false },
    radius: "0.5rem",
  },
  {
    id: "newsprint", name: "Newsprint", source: "designprompts", order: 9,
    fonts: { display: "Playfair Display", body: "Libre Baskerville", mono: "Courier Prime" },
    tokens: {
      dark: tk({ bg: "#14120f", fg: "#ece6d6", card: "#1a1815", sidebar: "#12110e", border: "#2a2620", muted: "#1f1d18", mutedFg: "#8a8270", primary: "#b3261e", accent: "#1f1d18" }),
      light: tk({ bg: "#f4f1e8", fg: "#111111", card: "#ffffff", sidebar: "#ede9de", border: "#d0c8b8", muted: "#e8e3d5", mutedFg: "#6a655a", primary: "#b3261e", accent: "#e8e3d5" }),
    },
    effects: { glow: false, noise: true, scanlines: false, glass: false },
    radius: "0",
  },
  {
    id: "bauhaus", name: "Bauhaus", source: "designprompts", order: 10,
    fonts: { display: "Jost", body: "Jost", mono: "Space Mono" },
    tokens: {
      dark: tk({ bg: "#111111", fg: "#ffffff", card: "#1a1a1a", sidebar: "#161616", border: "#2a2a2a", muted: "#1f1f1f", mutedFg: "#8a8a8a", primary: "#d62828", accent: "#1f1f1f" }),
      light: tk({ bg: "#f2efe6", fg: "#1a1a1a", card: "#ffffff", sidebar: "#e8e4da", border: "#1a1a1a", muted: "#ede8dc", mutedFg: "#6a6a6a", primary: "#d62828", accent: "#ede8dc" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0",
  },
  {
    id: "botanical", name: "Botanical", source: "designprompts", order: 11,
    fonts: { display: "Cormorant Garamond", body: "Lora", mono: "IBM Plex Mono" },
    tokens: {
      dark: tk({ bg: "#0f1a14", fg: "#e8e6dc", card: "#1a2620", sidebar: "#121d17", border: "#2a3530", muted: "#1f2b25", mutedFg: "#7a8a7e", primary: "#5b7f4a", accent: "#1f2b25" }),
      light: tk({ bg: "#f3f1e7", fg: "#2c3a2e", card: "#fbfaf3", sidebar: "#edeae0", border: "#d8d4c5", muted: "#e8e5db", mutedFg: "#6a7568", primary: "#5b7f4a", accent: "#e8e5db" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "1.25rem",
  },
  {
    id: "cyberpunk", name: "Cyberpunk", source: "designprompts", order: 12,
    fonts: { display: "Orbitron", body: "Rajdhani", mono: "Share Tech Mono" },
    tokens: {
      dark: tk({ bg: "#07070d", fg: "#ededf2", card: "#0e0e1a", sidebar: "#0a0a14", border: "#1a1a2a", muted: "#12122a", mutedFg: "#7a7a9a", primary: "#ff2bd6", accent: "#12122a" }),
      light: tk({ bg: "#f1f0f7", fg: "#12121f", card: "#ffffff", sidebar: "#e8e7f0", border: "#d0cfe0", muted: "#e0dfee", mutedFg: "#5a5a7a", primary: "#d100b5", accent: "#e0dfee" }),
    },
    effects: { glow: true, noise: false, scanlines: true, glass: false },
    radius: "0.5rem",
  },
  {
    id: "claymorphism", name: "Claymorphism", source: "designprompts", order: 13,
    fonts: { display: "Baloo 2", body: "Nunito", mono: "Fira Code" },
    tokens: {
      dark: tk({ bg: "#1d1730", fg: "#f0ecf5", card: "#251e3a", sidebar: "#221a36", border: "#352d4a", muted: "#2a2340", mutedFg: "#8a7e9a", primary: "#a78bcf", accent: "#2a2340" }),
      light: tk({ bg: "#f1ecfb", fg: "#3a2f4a", card: "#ffd6e8", sidebar: "#ede6f5", border: "#e0d5f0", muted: "#e8dff0", mutedFg: "#7a6a8a", primary: "#a78bcf", accent: "#e8dff0" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "1.75rem",
  },
  {
    id: "organic", name: "Organic", source: "designprompts", order: 14,
    fonts: { display: "Fraunces", body: "Lora", mono: "IBM Plex Mono" },
    tokens: {
      dark: tk({ bg: "#1b1612", fg: "#e8e0d8", card: "#261f1a", sidebar: "#1f1916", border: "#2f2825", muted: "#241e1a", mutedFg: "#8a7e70", primary: "#b5654a", accent: "#241e1a" }),
      light: tk({ bg: "#f4ede3", fg: "#3b2f2a", card: "#fbf8f0", sidebar: "#ede5d8", border: "#d8cec0", muted: "#e8dfd0", mutedFg: "#6a5e50", primary: "#b5654a", accent: "#e8dfd0" }),
    },
    effects: { glow: false, noise: true, scanlines: false, glass: false },
    radius: "1rem",
  },
  {
    id: "terminal", name: "Terminal", source: "designprompts", order: 15,
    fonts: { display: "JetBrains Mono", body: "JetBrains Mono", mono: "JetBrains Mono" },
    tokens: {
      dark: tk({ bg: "#0b0f0b", fg: "#33ff66", card: "#0f140f", sidebar: "#0a0e0a", border: "#1f3a20", muted: "#0f1a10", mutedFg: "#1f9d44", primary: "#33ff66", accent: "#0f1a10" }),
      light: tk({ bg: "#f4f1e1", fg: "#0b3d0b", card: "#ffffff", sidebar: "#ede9d5", border: "#c8c0a0", muted: "#e0dcc8", mutedFg: "#5a6a3a", primary: "#338833", accent: "#e0dcc8" }),
    },
    effects: { glow: true, noise: false, scanlines: true, glass: false },
    radius: "0",
  },
  {
    id: "kinetic", name: "Kinetic", source: "designprompts", order: 16,
    fonts: { display: "Unbounded", body: "Inter", mono: "JetBrains Mono" },
    tokens: {
      dark: tk({ bg: "#08080a", fg: "#f5f5f5", card: "#121214", sidebar: "#0e0e10", border: "#1a1a1e", muted: "#141418", mutedFg: "#7a7a7e", primary: "#c6ff00", accent: "#141418" }),
      light: tk({ bg: "#f5f5f0", fg: "#0a0a0a", card: "#ffffff", sidebar: "#ede9e0", border: "#d0ccc0", muted: "#e8e4d8", mutedFg: "#5a5a50", primary: "#5f7a00", accent: "#e8e4d8" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0.5rem",
  },
  {
    id: "art-deco", name: "Art Deco", source: "designprompts", order: 17,
    fonts: { display: "Poiret One", body: "Lato", mono: "Courier Prime" },
    tokens: {
      dark: tk({ bg: "#12142a", fg: "#f3e9c8", card: "#1a1d3a", sidebar: "#0f1124", border: "#2a2d4a", muted: "#1e2140", mutedFg: "#8a8eaa", primary: "#d4af37", accent: "#1e2140" }),
      light: tk({ bg: "#f8f1dc", fg: "#14183a", card: "#ffffff", sidebar: "#ede4ca", border: "#d0c8a8", muted: "#e8dfc5", mutedFg: "#6a6a8a", primary: "#d4af37", accent: "#e8dfc5" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0.25rem",
  },
  {
    id: "neo-brutalism", name: "Neo Brutalism", source: "designprompts", order: 18,
    fonts: { display: "Space Grotesk", body: "Space Grotesk", mono: "Space Mono" },
    tokens: {
      dark: tk({ bg: "#121212", fg: "#ffffff", card: "#1a1a1a", sidebar: "#0f0f0f", border: "#ffffff", muted: "#1f1f1f", mutedFg: "#8a8a8a", primary: "#ff5252", accent: "#1f1f1f" }),
      light: tk({ bg: "#fff4e0", fg: "#0a0a0a", card: "#ffffff", sidebar: "#f5e9c8", border: "#000000", muted: "#ede0c0", mutedFg: "#5a5a5a", primary: "#ff5252", accent: "#ede0c0" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0.25rem",
  },
  {
    id: "playful-geometric", name: "Playful Geometric", source: "designprompts", order: 19,
    fonts: { display: "Outfit", body: "DM Sans", mono: "DM Mono" },
    tokens: {
      dark: tk({ bg: "#1a1630", fg: "#f5f5f5", card: "#251f3a", sidebar: "#1f1a35", border: "#2f2a4a", muted: "#2a2540", mutedFg: "#8a8a9a", primary: "#ff6b6b", accent: "#2a2540" }),
      light: tk({ bg: "#fff8ee", fg: "#2a2a3a", card: "#ffffff", sidebar: "#f5ede0", border: "#e0d8c8", muted: "#ede5d5", mutedFg: "#6a6a7a", primary: "#ff6b6b", accent: "#ede5d5" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "1rem",
  },
  {
    id: "professional", name: "Professional", source: "designprompts", order: 20,
    fonts: { display: "IBM Plex Sans", body: "IBM Plex Sans", mono: "IBM Plex Mono" },
    tokens: {
      dark: tk({ bg: "#0f141b", fg: "#e0e5ea", card: "#161d26", sidebar: "#121820", border: "#1f2a36", muted: "#1a242e", mutedFg: "#7a8a9a", primary: "#1f5eff", accent: "#1a242e" }),
      light: tk({ bg: "#f7f8fa", fg: "#1f2933", card: "#ffffff", sidebar: "#edeef2", border: "#d5d9e0", muted: "#e8eaef", mutedFg: "#5a6a7a", primary: "#1f5eff", accent: "#e8eaef" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0.375rem",
  },
  {
    id: "sketch", name: "Sketch", source: "designprompts", order: 21,
    fonts: { display: "Kalam", body: "Patrick Hand", mono: "Courier Prime" },
    tokens: {
      dark: tk({ bg: "#22302b", fg: "#e8e8e0", card: "#283630", sidebar: "#1f2c27", border: "#3a4a44", muted: "#2a3832", mutedFg: "#8a9a90", primary: "#ffe066", accent: "#2a3832" }),
      light: tk({ bg: "#fffdf6", fg: "#2b2b2b", card: "#ffffff", sidebar: "#f8f5ec", border: "#c8c0b0", muted: "#f0ede0", mutedFg: "#6a6a5a", primary: "#4a4a3a", accent: "#f0ede0" }),
    },
    effects: { glow: false, noise: true, scanlines: false, glass: false },
    radius: "0.25rem",
  },
  {
    id: "industrial", name: "Industrial", source: "designprompts", order: 22,
    fonts: { display: "Barlow Condensed", body: "Barlow", mono: "Roboto Mono" },
    tokens: {
      dark: tk({ bg: "#17191b", fg: "#e0e2e5", card: "#1d2024", sidebar: "#131517", border: "#2a2e34", muted: "#1f2328", mutedFg: "#7a8088", primary: "#ff6a00", accent: "#1f2328" }),
      light: tk({ bg: "#e9e9e6", fg: "#1d1f21", card: "#ffffff", sidebar: "#ddded9", border: "#c0c2bd", muted: "#e0e1dc", mutedFg: "#5a5e62", primary: "#ff6a00", accent: "#e0e1dc" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0",
  },
  {
    id: "retro", name: "Retro", source: "designprompts", order: 23,
    fonts: { display: "Press Start 2P", body: "Pixelify Sans", mono: "Space Mono" },
    tokens: {
      dark: tk({ bg: "#0b1020", fg: "#e8e8d0", card: "#131830", sidebar: "#0f1325", border: "#1f2840", muted: "#161e34", mutedFg: "#7a8aa0", primary: "#008080", accent: "#161e34" }),
      light: tk({ bg: "#e8e0c8", fg: "#2a2a1a", card: "#f0e8d0", sidebar: "#ddd4b8", border: "#c0b898", muted: "#e0d8c0", mutedFg: "#6a6550", primary: "#008080", accent: "#e0d8c0" }),
    },
    effects: { glow: false, noise: false, scanlines: false, glass: false },
    radius: "0.25rem",
  },
];

// ─── API ───────────────────────────────────────────────────────────────
var STYLE_MAP = new Map(UI_STYLES.map(function (s) { return [s.id, s]; }));

export function getStyle(id) {
  return STYLE_MAP.get(id) || STYLE_MAP.get("discord");
}

export function resolveTokens(styleId, paletteId, mode, overrides) {
  var style = getStyle(styleId);
  if (!style) return {};
  var tokens;
  if (style.palettes) {
    var palette = style.palettes.find(function (p) { return p.id === paletteId; }) || style.palettes[0];
    tokens = mode === "dark" ? palette.dark : palette.light;
  } else {
    tokens = mode === "dark" ? style.tokens.dark : style.tokens.light;
  }
  if (overrides) {
    tokens = Object.assign({}, tokens);
    for (var key in overrides) {
      if (overrides[key] != null) tokens[key] = overrides[key];
    }
  }
  tokens = Object.assign({}, tokens, {
    "--font-display": fontStack(style.fonts.display, "display"),
    "--font-body": fontStack(style.fonts.body, "body"),
    "--font-mono": fontStack(style.fonts.mono, "mono"),
    "--font-heading": fontStack(style.fonts.display, "display"),
    "--radius": style.radius || "0.5rem",
  });
  return tokens;
}

export function getFontUrl(styleId) {
  var style = getStyle(styleId);
  if (!style) return null;
  return fontUrl([style.fonts.display, style.fonts.body, style.fonts.mono]);
}

export function getWallpapers() {
  return CURRENT_PALETTES.map(function (p) { return { id: p.id, name: p.name, style: p.wallpaper }; });
}

export function getPalettes(styleId) {
  var style = getStyle(styleId);
  return (style && style.palettes) || [];
}

export function getEffects(styleId) {
  var style = getStyle(styleId);
  return (style && style.effects) || { glow: false, noise: false, scanlines: false, glass: false };
}