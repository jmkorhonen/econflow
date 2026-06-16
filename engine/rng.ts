// engine/rng.ts
// Seedable, deterministic PRNG (mulberry32). Same seed → identical run,
// which is what lets scenario comparisons and golden-master tests be reproducible.

export type Rng = () => number;

/** Returns a function yielding deterministic floats in [0, 1). */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box–Muller, drawn from a uniform Rng. */
export function normal(rng: Rng, mean = 0, sd = 1): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sd * z;
}

/** Lognormal draw — useful for income/skill spreads. */
export function lognormal(rng: Rng, mu = 0, sigma = 1): number {
  return Math.exp(normal(rng, mu, sigma));
}
