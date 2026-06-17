// engine/aggregate.ts
// Decile and top-fractile aggregation. Deciles are the public-facing display
// ("who gets the GDP"); classes remain the underlying mechanism.

import type { DecileBreakdown } from './types';

/** Share of the total captured by each of ten equal-population deciles (index 0 = poorest). */
export function decileShares(values: number[]): number[] {
  return decileBreakdown(values).shares;
}

/** Decile shares plus the income range (€ lo–hi) defining each decile, for tooltips. */
export function decileBreakdown(values: number[]): DecileBreakdown {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const n = xs.length;
  const shares = new Array(10).fill(0);
  const edges = Array.from({ length: 10 }, () => ({ lo: 0, hi: 0 }));
  if (n === 0) return { shares, edges };
  const total = xs.reduce((s, v) => s + v, 0);
  for (let d = 0; d < 10; d++) {
    const lo = Math.floor((d * n) / 10);
    const hi = Math.floor(((d + 1) * n) / 10);
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += xs[i];
    shares[d] = total === 0 ? 0 : sum / total;
    edges[d] = { lo: xs[lo], hi: xs[Math.max(lo, hi - 1)] };
  }
  return { shares, edges };
}

/** Decile (1–10) a value falls into, given an ascending-sorted reference array. */
export function decileOf(sortedAsc: number[], value: number): number {
  const n = sortedAsc.length;
  if (n === 0) return 1;
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return Math.min(10, Math.max(1, Math.floor((lo / n) * 10) + 1));
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
