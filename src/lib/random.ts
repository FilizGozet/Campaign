/** Deterministic pseudo-random utilities (used only for synthetic data generation). */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number) {
  const next = mulberry32(seed);
  const normal = () => {
    // Box–Muller
    const u = Math.max(next(), 1e-12);
    const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return {
    next,
    normal,
    uniform: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    chance: (p: number) => next() < p,
    /** Lognormal with the given arithmetic mean and log-sigma. */
    lognormal: (mean: number, sigma: number) => mean * Math.exp(sigma * normal() - (sigma * sigma) / 2),
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  };
}

export type Rng = ReturnType<typeof createRng>;
