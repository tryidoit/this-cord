// Deterministic seeded RNG — mulberry32
// Any client that knows the seed and participant list computes the same winner.
export function seededRNG(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick `count` winners deterministically from participant list using seed.
export function pickGiveawayWinners(participantIds, count, seed) {
  if (!participantIds || participantIds.length === 0) return [];
  const rng = seededRNG(String(seed));
  const pool = [...participantIds];
  const winners = [];
  const winnerCount = Math.min(count, pool.length);
  for (let i = 0; i < winnerCount; i++) {
    const idx = Math.floor(rng() * pool.length);
    winners.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return winners;
}

// Generate a random seed string
export function generateSeed() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}