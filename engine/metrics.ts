// engine/metrics.ts
// Distributional summary statistics.

/**
 * Gini coefficient of a list of (non-negative) values, in [0, 1].
 * Uses the cumulative-sum formula; empty or all-zero inputs return 0.
 */
export function gini(values: number[]): number {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const n = xs.length;
  if (n === 0) return 0;
  let cum = 0;
  let weighted = 0;
  for (let i = 0; i < n; i++) {
    cum += xs[i];
    weighted += cum;
  }
  if (cum === 0) return 0;
  return (n + 1 - (2 * weighted) / cum) / n;
}

/** Share of total held by the top `fraction` (e.g. 0.01 → top-1% share). */
export function topShare(values: number[], fraction: number): number {
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

export function median(values: number[]): number {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const n = xs.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}
