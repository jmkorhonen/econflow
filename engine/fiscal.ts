// engine/fiscal.ts
// Progressive labour-income taxation. Brackets are stylised on Finnish combined
// state + municipal + social-insurance effective rates (annual €). The `level`
// lever scales the whole schedule, so "low-tax society" scenarios stay coherent
// instead of arbitrarily reassigning outcomes.

interface Bracket {
  upTo: number;
  rate: number;
}

/** Marginal-rate schedule on labour income, € per year. */
const LABOUR_BRACKETS: Bracket[] = [
  { upTo: 20_000, rate: 0.08 },
  { upTo: 35_000, rate: 0.2 },
  { upTo: 55_000, rate: 0.32 },
  { upTo: 90_000, rate: 0.44 },
  { upTo: Infinity, rate: 0.51 },
];

// Income around which progressivity pivots: above it rates steepen, below they flatten.
const PROGRESSIVITY_PIVOT = 35_000;

/**
 * Progressive tax on labour income.
 * - `level` (≈1.0) scales every marginal rate (overall tax burden).
 * - `progressivity` (≈1.0) tilts the schedule around a pivot income: >1 raises top-bracket
 *   rates and trims low ones (more progressive); <1 flattens toward a flat tax.
 * Effective rate is capped at 100%.
 */
export function labourTax(income: number, level: number, progressivity = 1): number {
  if (income <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const b of LABOUR_BRACKETS) {
    if (income <= lower) break;
    const band = Math.min(income, b.upTo) - lower;
    // Tilt this bracket's rate by how far its midpoint sits from the pivot.
    const mid = (lower + Math.min(income, b.upTo)) / 2;
    const tilt = 1 + (progressivity - 1) * Math.tanh((mid - PROGRESSIVITY_PIVOT) / PROGRESSIVITY_PIVOT);
    const rate = Math.max(0, Math.min(1, b.rate * level * tilt));
    tax += band * rate;
    lower = b.upTo;
  }
  return Math.min(tax, income);
}

/** Flat tax on capital income (Finland uses ~30–34%). */
export function capitalTax(income: number, rate: number): number {
  return Math.max(0, income) * rate;
}
