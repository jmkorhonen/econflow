// engine/aggregate.ts
// Decile and top-fractile aggregation. Deciles are the public-facing display
// ("who gets the GDP"); classes remain the underlying mechanism.

/** Share of the total captured by each of ten equal-population deciles (index 0 = poorest). */
export function decileShares(values: number[]): number[] {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const n = xs.length;
  const out = new Array(10).fill(0);
  if (n === 0) return out;
  const total = xs.reduce((s, v) => s + v, 0);
  if (total === 0) return out;
  for (let d = 0; d < 10; d++) {
    const lo = Math.floor((d * n) / 10);
    const hi = Math.floor(((d + 1) * n) / 10);
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += xs[i];
    out[d] = sum / total;
  }
  return out;
}

/** Share of the total held by the top `fraction` (e.g. 0.001 → top 0.1%). */
export function topFractileShare(values: number[], fraction: number): number {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => b - a);
  const n = xs.length;
  if (n === 0) return 0;
  const total = xs.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  const k = Math.max(1, Math.round(n * fraction));
  let top = 0;
  for (let i = 0; i < k; i++) top += xs[i];
  return top / total;
}
