// Procedural avatar catalogue.
// 1,200 "classic" avatars (palette + glyph + aura) plus 1,000 "live" avatars
// that carry their own motion: ticking clocks, falling leaves, rain, orbit…
// Everything renders as animated SVG data, so no image files are shipped.

export const TIERS = {
  common: { id: "common", label: "Common", price: 80, ring: "#94A3B8", glow: "#CBD5E1" },
  rare: { id: "rare", label: "Rare", price: 220, ring: "#38BDF8", glow: "#7DD3FC" },
  epic: { id: "epic", label: "Epic", price: 600, ring: "#A78BFA", glow: "#C4B5FD" },
  legendary: { id: "legendary", label: "Legendary", price: 1600, ring: "#FBBF24", glow: "#FDE68A" },
  mythic: { id: "mythic", label: "Mythical", price: 4000, ring: "#FB7185", glow: "#FDA4AF" },
  celestial: { id: "celestial", label: "Celestial", price: 12000, ring: "#5EEAD4", glow: "#99F6E4" },
};

export const TIER_ORDER = ["common", "rare", "epic", "legendary", "mythic", "celestial"];

const GLYPHS = [
  { key: "bolt", name: "Bolt", path: "M56 10 L28 55 H47 L43 90 L74 42 H53 Z" },
  { key: "star", name: "Star", path: "M50 6 L61 37 L94 38 L67 57 L77 90 L50 70 L23 90 L33 57 L6 38 L39 37 Z" },
  { key: "crescent", name: "Crescent", path: "M64 8 A44 44 0 1 0 64 92 A35 35 0 1 1 64 8 Z" },
  { key: "diamond", name: "Diamond", path: "M50 4 L90 50 L50 96 L10 50 Z" },
  { key: "wave", name: "Wave", path: "M6 60 C22 28 38 28 50 48 C62 68 78 68 94 36 L94 60 C78 92 62 92 50 72 C38 52 22 52 6 84 Z" },
  { key: "eye", name: "Eye", path: "M4 50 C24 16 76 16 96 50 C76 84 24 84 4 50 Z M50 34 A16 16 0 1 0 50.2 34 Z" },
  { key: "hex", name: "Hex", path: "M50 4 L88 27 V73 L50 96 L12 73 V27 Z" },
  { key: "flame", name: "Flame", path: "M50 4 C64 28 80 36 80 58 C80 80 67 94 50 94 C33 94 20 80 20 60 C20 42 34 38 38 22 C43 38 50 38 50 22 Z" },
  { key: "halo", name: "Halo", path: "M50 12 A38 38 0 1 1 49.8 12 Z M50 30 A20 20 0 1 0 50.2 30 Z" },
  { key: "spark", name: "Spark", path: "M50 2 L59 41 L98 50 L59 59 L50 98 L41 59 L2 50 L41 41 Z" },
  { key: "leaf", name: "Leaf", path: "M50 8 C70 8 88 26 88 50 C88 74 70 92 50 92 C30 92 12 74 12 50 C12 26 30 8 50 8 Z M50 20 L50 80 M30 40 L50 50 M70 40 L50 50 M35 60 L50 55 M65 60 L50 55" },
  { key: "heart", name: "Heart", path: "M50 88 C20 66 8 46 8 30 C8 16 20 8 32 8 C40 8 47 13 50 20 C53 13 60 8 68 8 C80 8 92 16 92 30 C92 46 80 66 50 88 Z" },
  { key: "crown", name: "Crown", path: "M12 70 L88 70 L88 60 L76 30 L60 55 L50 25 L40 55 L24 30 L12 60 Z M12 76 L88 76 L88 84 L12 84 Z" },
  { key: "moon", name: "Moon", path: "M58 10 A42 42 0 1 0 58 90 A34 34 0 1 1 58 10 Z M72 40 A4 4 0 1 0 72.1 40 Z M80 55 A3 3 0 1 0 80.1 55 Z" },
  { key: "sun", name: "Sun", path: "M50 32 A18 18 0 1 0 50.1 32 Z M50 4 L50 14 M50 86 L50 96 M4 50 L14 50 M86 50 L96 50 M18 18 L25 25 M75 75 L82 82 M82 18 L75 25 M25 75 L18 82" },
  { key: "key", name: "Key", path: "M32 50 A18 18 0 1 0 68 50 A18 18 0 1 0 32 50 Z M68 50 L90 50 L90 40 L82 40 L82 60 L90 60" },
  { key: "drop", name: "Drop", path: "M50 6 C66 30 78 42 78 58 C78 76 66 90 50 90 C34 90 22 76 22 58 C22 42 34 30 50 6 Z" },
  { key: "shield", name: "Shield", path: "M50 6 L84 18 V50 C84 72 68 88 50 94 C32 88 16 72 16 50 V18 Z" },
  { key: "compass", name: "Compass", path: "M50 4 A46 46 0 1 0 50.1 4 Z M50 12 A38 38 0 1 1 49.9 12 Z M38 38 L62 62 M62 38 L38 62" },
];

const PALETTES = [
  { name: "Ember", colors: ["#3B0A16", "#F97316", "#FDBA74"] },
  { name: "Abyss", colors: ["#020617", "#1D4ED8", "#60A5FA"] },
  { name: "Neon", colors: ["#1E0635", "#A855F7", "#E879F9"] },
  { name: "Jade", colors: ["#022C22", "#10B981", "#6EE7B7"] },
  { name: "Solar", colors: ["#422006", "#FACC15", "#FDE68A"] },
  { name: "Frost", colors: ["#0C1A2B", "#38BDF8", "#BAE6FD"] },
  { name: "Rose", colors: ["#3F0713", "#F43F5E", "#FDA4AF"] },
  { name: "Void", colors: ["#09090B", "#52525B", "#D4D4D8"] },
  { name: "Citrus", colors: ["#1A2E05", "#84CC16", "#D9F99D"] },
  { name: "Orchid", colors: ["#2E1065", "#8B5CF6", "#DDD6FE"] },
  { name: "Cobalt", colors: ["#071A3A", "#2563EB", "#93C5FD"] },
  { name: "Magma", colors: ["#2A0606", "#DC2626", "#FCA5A5"] },
  { name: "Mint", colors: ["#042F2E", "#2DD4BF", "#99F6E4"] },
  { name: "Sand", colors: ["#2A1B08", "#D97706", "#FCD34D"] },
  { name: "Steel", colors: ["#0F172A", "#64748B", "#CBD5E1"] },
  { name: "Aurora", colors: ["#0B1120", "#22D3EE", "#A7F3D0"] },
  { name: "Plum", colors: ["#2B0A2E", "#C026D3", "#F5D0FE"] },
  { name: "Lime", colors: ["#12210A", "#4ADE80", "#BBF7D0"] },
  { name: "Coral", colors: ["#300A10", "#FB7185", "#FECDD3"] },
  { name: "Twilight", colors: ["#1E1B4B", "#6366F1", "#C7D2FE"] },
  { name: "Onyx", colors: ["#000000", "#27272A", "#A1A1AA"] },
  { name: "Glacier", colors: ["#0B1E2E", "#0EA5E9", "#E0F2FE"] },
  { name: "Ruby", colors: ["#26040D", "#BE123C", "#FB7185"] },
  { name: "Toxic", colors: ["#0B1A02", "#65A30D", "#BEF264"] },
  { name: "Sunset", colors: ["#1A0A0A", "#F97316", "#FED7AA"] },
  { name: "Ocean", colors: ["#02161E", "#0EA5E9", "#7DD3FC"] },
  { name: "Lavender", colors: ["#1E1336", "#C084FC", "#E9D5FF"] },
  { name: "Pine", colors: ["#04140A", "#059669", "#6EE7B7"] },
  { name: "Cherry", colors: ["#1A0608", "#E11D48", "#FECACA"] },
  { name: "Mocha", colors: ["#1A1208", "#92400E", "#D6A874"] },
  { name: "Cobalt", colors: ["#08122A", "#2563EB", "#93C5FD"] },
];

const VARIANTS = [
  { name: "Nova", rings: 1, dots: 0, ghosts: 1, glow: 0.9 },
  { name: "Nebula", rings: 2, dots: 3, ghosts: 2, glow: 0.75 },
  { name: "Prism", rings: 1, dots: 2, ghosts: 3, glow: 0.6 },
  { name: "Halo", rings: 2, dots: 1, ghosts: 1, glow: 1 },
  { name: "Echo", rings: 0, dots: 2, ghosts: 2, glow: 0.85 },
];

// ————— Live family: every one of these is animated —————
export const MOTIONS = [
  { key: "clock", name: "Clock" },
  { key: "leaves", name: "Leaves" },
  { key: "rain", name: "Rain" },
  { key: "snow", name: "Snow" },
  { key: "orbit", name: "Orbit" },
  { key: "aurora", name: "Aurora" },
  { key: "bubbles", name: "Bubbles" },
  { key: "comet", name: "Comet" },
  { key: "pulse", name: "Pulse" },
  { key: "prism", name: "Prism" },
];

const LIVE_PALETTES = [
  { name: "Midnight", colors: ["#0B1020", "#312E81", "#A5B4FC"] },
  { name: "Horizon", colors: ["#1F0A0A", "#B91C1C", "#FCA5A5"] },
  { name: "Sea", colors: ["#031C26", "#0E7490", "#67E8F9"] },
  { name: "Forest", colors: ["#05180F", "#15803D", "#86EFAC"] },
  { name: "Dusk", colors: ["#1A0A2E", "#7E22CE", "#E9D5FF"] },
  { name: "Clay", colors: ["#21100A", "#B45309", "#FDBA74"] },
  { name: "Ice", colors: ["#0A1622", "#0369A1", "#BAE6FD"] },
  { name: "Bloom", colors: ["#240617", "#BE185D", "#FBCFE8"] },
  { name: "Gold", colors: ["#1C1204", "#A16207", "#FDE68A"] },
  { name: "Slate", colors: ["#0B1220", "#334155", "#CBD5E1"] },
];

const pseudo = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function tierFor(r) {
  return r < 0.38 ? "common" : r < 0.66 ? "rare" : r < 0.84 ? "epic" : r < 0.94 ? "legendary" : r < 0.985 ? "mythic" : "celestial";
}

function buildClassic() {
  const raw = [];
  let index = 0;
  for (const palette of PALETTES) {
    for (const glyph of GLYPHS) {
      for (const variant of VARIANTS) {
        raw.push({ index, palette, glyph, variant, tier: tierFor(pseudo(index + 7)), animated: index % 4 === 0 });
        index += 1;
      }
    }
  }
  return raw.map((item) => {
    const tier = TIERS[item.tier];
    return {
      id: `av_${item.index}`,
      name: `${tier.label} ${item.variant.name} ${item.palette.name} ${item.glyph.name}`,
      tier: item.tier,
      tierLabel: tier.label,
      animated: item.animated,
      price: Math.round(tier.price * (item.animated ? 1.6 : 1)),
      colors: item.palette.colors,
      glyph: item.glyph.path,
      glyphKey: item.glyph.key,
      variant: item.variant,
      motion: null,
      seed: item.index,
    };
  });
}

function buildLive() {
  const out = [];
  let index = 0;
  // 10 palettes x 10 glyphs x 10 motions = 1,000 unique animated avatars
  for (const motion of MOTIONS) {
    for (const palette of LIVE_PALETTES) {
      for (const glyph of GLYPHS) {
        const tier = tierFor(pseudo(index * 3 + 41) * 0.92);
        const t = TIERS[tier];
        out.push({
          id: `live_${index}`,
          name: `${motion.name} ${palette.name} ${glyph.name}`,
          tier,
          tierLabel: t.label,
          animated: true,
          price: Math.round(t.price * 1.45),
          colors: palette.colors,
          glyph: glyph.path,
          glyphKey: glyph.key,
          variant: VARIANTS[index % VARIANTS.length],
          motion: motion.key,
          seed: 10000 + index,
        });
        index += 1;
      }
    }
  }
  return out;
}

// ————— Illustrated family: real pictures, not shapes —————
export const SCENES = [
  { key: "leaf", name: "Leaf" },
  { key: "clock", name: "Clock" },
  { key: "cat", name: "Cat" },
  { key: "flower", name: "Flower" },
  { key: "fish", name: "Fish" },
  { key: "butterfly", name: "Butterfly" },
  { key: "snowflake", name: "Snowflake" },
  { key: "flame", name: "Flame" },
  { key: "robot", name: "Robot" },
  { key: "ghost", name: "Ghost" },
  { key: "crown", name: "Crown" },
  { key: "mushroom", name: "Mushroom" },
];

const SCENE_VARIANT = { rings: 1, dots: 0, ghosts: 0, glow: 0.95 };

function buildScenes() {
  const out = [];
  let index = 0;
  for (const scene of SCENES) {
    for (const palette of LIVE_PALETTES) {
      for (const variant of [0, 1]) {
        const tier = tierFor(pseudo(index * 5 + 13) * 0.98);
        const t = TIERS[tier];
        out.push({
          id: `pic_${index}`,
          name: `${scene.name} ${palette.name}${variant ? " Glow" : ""}`,
          tier,
          tierLabel: t.label,
          animated: true,
          price: Math.round(t.price * 1.35),
          colors: palette.colors,
          glyph: GLYPHS[(index + variant) % GLYPHS.length].path,
          glyphKey: "pic",
          scene: scene.key,
          variant: SCENE_VARIANT,
          motion: null,
          seed: 20000 + index,
        });
        index += 1;
      }
    }
  }
  return out;
}

export const AVATARS = [...buildClassic(), ...buildLive(), ...buildScenes()].sort((a, b) => {
  const t = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
  if (t !== 0) return t;
  return a.seed - b.seed;
});

export const AVATAR_COUNT = AVATARS.length;
export const ANIMATED_COUNT = AVATARS.filter((a) => a.animated).length;

const AVATAR_MAP = new Map(AVATARS.map((a) => [a.id, a]));

export const STARTER_AVATAR_ID = AVATARS.find((a) => a.tier === "common" && !a.animated)?.id || AVATARS[0].id;

export function getAvatar(id) {
  return AVATAR_MAP.get(id) || AVATAR_MAP.get(STARTER_AVATAR_ID);
}

export function countByTier() {
  return TIER_ORDER.map((tier) => ({
    tier,
    label: TIERS[tier].label,
    count: AVATARS.filter((a) => a.tier === tier).length,
  }));
}