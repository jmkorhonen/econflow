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

/**
 * Progressive tax on labour income. `level` (≈1.0) scales every marginal rate,
 * capped so an effective rate never exceeds 100%.
 */
export function labourTax(income: number, level: number): number {
  if (income <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const b of LABOUR_BRACKETS) {
    if (income <= lower) break;
    const band = Math.min(income, b.upTo) - lower;
    tax += band * Math.min(1, b.rate * level);
    lower = b.upTo;
  }
  return Math.min(tax, income);
}

/** Flat tax on capital income (Finland uses ~30–34%). */
export function capitalTax(income: number, rate: number): number {
  return Math.max(0, income) * rate;
}
