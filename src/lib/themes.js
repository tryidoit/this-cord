// Distinct themes — each has its own color palette AND sidebar background style.
// 24 hand-crafted themes that each look visibly different.

export const DEFAULT_THEME = {
  id: "th_default",
  name: "This-Cord Violet",
  bg: "240 22% 4%",
  card: "240 18% 7%",
  sidebar: "240 20% 5%",
  border: "240 12% 16%",
  muted: "240 12% 14%",
  mutedFg: "240 8% 62%",
  primary: "262 88% 66%",
  accent: "240 12% 17%",
  fg: "0 0% 96%",
  sidebarStyle: {
    layer: "linear-gradient(180deg, #1E0635, #0B0214)",
    size: "100% 100%",
    motion: "tc-skin-breathe",
    dur: 14,
    accent: "#A855F7",
  },
};

const THEMES_RAW = [
  DEFAULT_THEME,
  {
    id: "th_ocean",
    name: "Midnight Ocean",
    bg: "210 40% 4%", card: "210 34% 7%", sidebar: "210 38% 5%",
    border: "210 20% 16%", muted: "210 16% 13%", mutedFg: "210 10% 62%",
    primary: "188 90% 50%", accent: "190 50% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "linear-gradient(165deg, #0E7490, #04141C)",
      size: "100% 100%", motion: "tc-skin-slide", dur: 12, accent: "#22D3EE",
    },
  },
  {
    id: "th_ember",
    name: "Ember Glow",
    bg: "12 36% 4%", card: "12 28% 7%", sidebar: "12 32% 5%",
    border: "12 18% 16%", muted: "12 14% 13%", mutedFg: "12 10% 62%",
    primary: "22 92% 56%", accent: "12 50% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "radial-gradient(120% 70% at 40% 0%, #B45309, transparent 70%), linear-gradient(180deg, #1C1204, #050200)",
      size: "100% 100%", motion: "tc-skin-breathe", dur: 10, accent: "#F97316",
    },
  },
  {
    id: "th_forest",
    name: "Forest Canopy",
    bg: "150 30% 4%", card: "150 24% 7%", sidebar: "150 28% 5%",
    border: "150 18% 16%", muted: "150 14% 13%", mutedFg: "150 10% 62%",
    primary: "145 70% 50%", accent: "150 40% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "radial-gradient(#15803D55 1.2px, transparent 1.2px), linear-gradient(165deg, #15803D, #04150F)",
      size: "14px 14px, 100% 100%", motion: "tc-skin-drift", dur: 16, accent: "#22C55E",
    },
  },
  {
    id: "th_neon",
    name: "Neon Pulse",
    bg: "285 30% 4%", card: "285 24% 7%", sidebar: "285 28% 5%",
    border: "285 18% 16%", muted: "285 14% 13%", mutedFg: "285 10% 62%",
    primary: "320 90% 60%", accent: "285 40% 20%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "linear-gradient(#E879F955 1px, transparent 1px), linear-gradient(90deg, #E879F955 1px, transparent 1px), linear-gradient(165deg, #7E22CE, #160A24)",
      size: "22px 22px, 22px 22px, 100% 100%", motion: "tc-skin-shimmer", dur: 9, accent: "#E879F9",
    },
  },
  {
    id: "th_solar",
    name: "Solar Flare",
    bg: "40 36% 4%", card: "40 28% 7%", sidebar: "40 32% 5%",
    border: "40 18% 16%", muted: "40 14% 13%", mutedFg: "40 10% 62%",
    primary: "38 92% 56%", accent: "40 50% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "radial-gradient(120% 70% at 40% 0%, #FACC15, transparent 70%), linear-gradient(180deg, #422006, #0A0700)",
      size: "100% 100%", motion: "tc-skin-breathe", dur: 12, accent: "#FACC15",
    },
  },
  {
    id: "th_arctic",
    name: "Arctic Frost",
    bg: "200 36% 4%", card: "200 28% 7%", sidebar: "200 32% 5%",
    border: "200 18% 16%", muted: "200 14% 13%", mutedFg: "200 10% 62%",
    primary: "200 90% 60%", accent: "200 40% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "linear-gradient(165deg, #0369A1, #07131F)",
      size: "100% 100%", motion: "tc-skin-shimmer", dur: 14, accent: "#38BDF8",
    },
  },
  {
    id: "th_rose",
    name: "Rose Quartz",
    bg: "340 30% 4%", card: "340 24% 7%", sidebar: "340 28% 5%",
    border: "340 18% 16%", muted: "340 14% 13%", mutedFg: "340 10% 62%",
    primary: "340 85% 60%", accent: "340 40% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "linear-gradient(165deg, #9F1239, #1C0710)",
      size: "100% 100%", motion: "tc-skin-breathe", dur: 13, accent: "#F43F5E",
    },
  },
  {
    id: "th_graphite",
    name: "Graphite Steel",
    bg: "210 16% 5%", card: "210 12% 8%", sidebar: "210 14% 6%",
    border: "210 10% 17%", muted: "210 8% 13%", mutedFg: "210 6% 62%",
    primary: "210 40% 55%", accent: "210 20% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "repeating-linear-gradient(135deg, #334155 0 10px, #0A0F18 10px 22px)",
      size: "100% 100%", motion: "tc-skin-slide", dur: 20, accent: "#64748B",
    },
  },
  {
    id: "th_toxic",
    name: "Toxic Slime",
    bg: "90 30% 4%", card: "90 24% 7%", sidebar: "90 28% 5%",
    border: "90 18% 16%", muted: "90 14% 13%", mutedFg: "90 10% 62%",
    primary: "90 80% 48%", accent: "90 40% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "conic-gradient(from 180deg at 50% 30%, #65A30D, #0B1A02, #65A30D)",
      size: "100% 100%", motion: "tc-skin-hue", dur: 28, accent: "#84CC16",
    },
  },
  {
    id: "th_cosmic",
    name: "Cosmic Dust",
    bg: "260 30% 4%", card: "260 24% 7%", sidebar: "260 28% 5%",
    border: "260 18% 16%", muted: "260 14% 13%", mutedFg: "260 10% 62%",
    primary: "265 85% 62%", accent: "260 40% 20%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "radial-gradient(circle at 20% 15%, #6D28D9, transparent 60%), radial-gradient(circle at 85% 75%, #6D28D999, transparent 55%), #0A0A12",
      size: "100% 100%", motion: "tc-skin-drift", dur: 20, accent: "#8B5CF6",
    },
  },
  {
    id: "th_coral",
    name: "Coral Reef",
    bg: "16 30% 4%", card: "16 24% 7%", sidebar: "16 28% 5%",
    border: "16 18% 16%", muted: "16 14% 13%", mutedFg: "16 10% 62%",
    primary: "16 88% 58%", accent: "16 40% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "repeating-radial-gradient(circle at 50% 120%, #C2410C 0 14px, #1A0A05 14px 30px)",
      size: "100% 100%", motion: "tc-skin-breathe", dur: 15, accent: "#FB7185",
    },
  },
  {
    id: "th_glacier",
    name: "Glacier",
    bg: "195 36% 4%", card: "195 28% 7%", sidebar: "195 32% 5%",
    border: "195 18% 16%", muted: "195 14% 13%", mutedFg: "195 10% 62%",
    primary: "195 90% 58%", accent: "195 40% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "linear-gradient(165deg, #0EA5E9, #0B1E2E)",
      size: "100% 100%", motion: "tc-skin-drift", dur: 18, accent: "#0EA5E9",
    },
  },
  {
    id: "th_cherry",
    name: "Cherry Blossom",
    bg: "330 28% 4%", card: "330 22% 7%", sidebar: "330 26% 5%",
    border: "330 16% 16%", muted: "330 12% 13%", mutedFg: "330 8% 62%",
    primary: "330 80% 62%", accent: "330 36% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "linear-gradient(165deg, #BE185D, #240617)",
      size: "100% 100%", motion: "tc-skin-shimmer", dur: 11, accent: "#F9A8D4",
    },
  },
  {
    id: "th_golden",
    name: "Golden Hour",
    bg: "30 34% 4%", card: "30 26% 7%", sidebar: "30 30% 5%",
    border: "30 18% 16%", muted: "30 14% 13%", mutedFg: "30 10% 62%",
    primary: "36 88% 56%", accent: "30 44% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "radial-gradient(120% 70% at 40% 0%, #D97706, transparent 70%), linear-gradient(180deg, #2A1B08, #0A0600)",
      size: "100% 100%", motion: "tc-skin-breathe", dur: 14, accent: "#FCD34D",
    },
  },
  {
    id: "th_deepsea",
    name: "Deep Sea",
    bg: "190 34% 3%", card: "190 26% 6%", sidebar: "190 30% 4%",
    border: "190 18% 15%", muted: "190 14% 12%", mutedFg: "190 10% 60%",
    primary: "180 85% 50%", accent: "190 38% 17%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "linear-gradient(165deg, #0E7490, #02161E)",
      size: "100% 100%", motion: "tc-skin-slide", dur: 14, accent: "#22D3EE",
    },
  },
  {
    id: "th_lavender",
    name: "Lavender Dream",
    bg: "275 28% 5%", card: "275 22% 8%", sidebar: "275 26% 6%",
    border: "275 16% 17%", muted: "275 12% 14%", mutedFg: "275 8% 63%",
    primary: "275 80% 68%", accent: "275 36% 19%", fg: "0 0% 97%",
    sidebarStyle: {
      layer: "linear-gradient(165deg, #8B5CF6, #1E1336)",
      size: "100% 100%", motion: "tc-skin-breathe", dur: 15, accent: "#C084FC",
    },
  },
  {
    id: "th_pine",
    name: "Pine Forest",
    bg: "160 30% 4%", card: "160 24% 7%", sidebar: "160 28% 5%",
    border: "160 18% 16%", muted: "160 14% 13%", mutedFg: "160 10% 62%",
    primary: "160 75% 42%", accent: "160 38% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "linear-gradient(165deg, #059669, #04140A)",
      size: "100% 100%", motion: "tc-skin-drift", dur: 22, accent: "#10B981",
    },
  },
  {
    id: "th_mocha",
    name: "Mocha",
    bg: "30 20% 5%", card: "30 16% 8%", sidebar: "30 18% 6%",
    border: "30 12% 17%", muted: "30 10% 13%", mutedFg: "30 8% 62%",
    primary: "30 60% 52%", accent: "30 28% 18%", fg: "0 0% 94%",
    sidebarStyle: {
      layer: "linear-gradient(165deg, #92400E, #1A1208)",
      size: "100% 100%", motion: "tc-skin-breathe", dur: 16, accent: "#D6A874",
    },
  },
  {
    id: "th_twilight",
    name: "Twilight",
    bg: "235 30% 5%", card: "235 24% 8%", sidebar: "235 28% 6%",
    border: "235 18% 17%", muted: "235 14% 14%", mutedFg: "235 10% 63%",
    primary: "240 80% 70%", accent: "235 36% 19%", fg: "0 0% 97%",
    sidebarStyle: {
      layer: "conic-gradient(from 180deg at 50% 30%, #6366F1, #1E1B4B, #6366F1)",
      size: "100% 100%", motion: "tc-skin-hue", dur: 32, accent: "#818CF8",
    },
  },
  {
    id: "th_onyx",
    name: "Onyx",
    bg: "0 0% 4%", card: "0 0% 7%", sidebar: "0 0% 5%",
    border: "0 0% 15%", muted: "0 0% 12%", mutedFg: "0 0% 60%",
    primary: "0 0% 85%", accent: "0 0% 16%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "linear-gradient(180deg, #27272A, #000000)",
      size: "100% 100%", motion: "tc-skin-breathe", dur: 18, accent: "#A1A1AA",
    },
  },
  {
    id: "th_sunset",
    name: "Sunset Strip",
    bg: "20 28% 4%", card: "20 22% 7%", sidebar: "20 26% 5%",
    border: "20 16% 16%", muted: "20 12% 13%", mutedFg: "20 8% 62%",
    primary: "340 85% 60%", accent: "20 36% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "repeating-linear-gradient(45deg, #F97316 0 6px, #1A0A0A 6px 20px)",
      size: "100% 100%", motion: "tc-skin-slide", dur: 12, accent: "#FB7185",
    },
  },
  {
    id: "th_electric",
    name: "Electric Lime",
    bg: "100 30% 4%", card: "100 24% 7%", sidebar: "100 28% 5%",
    border: "100 18% 16%", muted: "100 14% 13%", mutedFg: "100 10% 62%",
    primary: "100 85% 52%", accent: "100 38% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "linear-gradient(#4ADE8055 1px, transparent 1px), linear-gradient(90deg, #4ADE8055 1px, transparent 1px), linear-gradient(165deg, #4ADE80, #12210A)",
      size: "22px 22px, 22px 22px, 100% 100%", motion: "tc-skin-shimmer", dur: 8, accent: "#4ADE80",
    },
  },
  {
    id: "th_plum",
    name: "Plum Crazy",
    bg: "300 28% 4%", card: "300 22% 7%", sidebar: "300 26% 5%",
    border: "300 16% 16%", muted: "300 12% 13%", mutedFg: "300 8% 62%",
    primary: "300 82% 62%", accent: "300 36% 18%", fg: "0 0% 96%",
    sidebarStyle: {
      layer: "conic-gradient(from 180deg at 50% 30%, #C026D3, #2B0A2E, #C026D3)",
      size: "100% 100%", motion: "tc-skin-hue", dur: 24, accent: "#F5D0FE",
    },
  },
];

export const THEMES = THEMES_RAW;
export const THEME_COUNT = THEMES.length;

const THEME_MAP = new Map(THEMES.map((t) => [t.id, t]));

export function getTheme(id) {
  return THEME_MAP.get(id) || DEFAULT_THEME;
}

export function themeVars(theme = DEFAULT_THEME) {
  return {
    "--background": theme.bg,
    "--foreground": theme.fg,
    "--card": theme.card,
    "--card-foreground": theme.fg,
    "--popover": theme.card,
    "--popover-foreground": theme.fg,
    "--primary": theme.primary,
    "--primary-foreground": "0 0% 100%",
    "--secondary": theme.muted,
    "--secondary-foreground": theme.fg,
    "--muted": theme.muted,
    "--muted-foreground": theme.mutedFg,
    "--accent": theme.accent,
    "--accent-foreground": theme.fg,
    "--border": theme.border,
    "--input": theme.border,
    "--ring": theme.primary,
    "--sidebar-background": theme.sidebar,
    "--sidebar-foreground": theme.fg,
    "--sidebar-border": theme.border,
  };
}

export function themeSwatch(theme) {
  return [`hsl(${theme.bg})`, `hsl(${theme.card})`, `hsl(${theme.primary})`, `hsl(${theme.accent})`];
}

// Sidebar style now lives inside each theme.
export function getSkin(themeId) {
  const theme = getTheme(themeId);
  return theme.sidebarStyle || null;
}