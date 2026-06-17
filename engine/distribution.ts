// engine/distribution.ts
// Primary (functional + personal) distribution: split real output into labour
// and capital pools, then allocate each across eligible citizens. The pools sum
// exactly to output — that accounting identity is what the "rules, not nature"
// argument rests on.
//
// Labour pay is lognormal (moderately dispersed). Capital ownership follows a
// Pareto law (a genuinely fat tail), so the top 1% / 0.1% are dominated by
// capital — which is where the "merit" story breaks down most visibly.

import type { Citizen, CitizenClass } from './types';
import { lognormal, type Rng } from './rng';

/** Classes that draw labour income, with a relative skill/pay weight. */
const LABOUR_WEIGHT: Partial<Record<CitizenClass, number>> = {
  worker: 1,
  professional: 1.9,
  small_business: 1.2,
};

/** Classes that own capital, with a relative ownership weight. */
const CAPITAL_WEIGHT: Partial<Record<CitizenClass, number>> = {
  capital_owner: 1,
  small_business: 0.2,
  professional: 0.08,
  retiree: 0.12,
};

/** Allocate the labour pool (total labour cost) via lognormal idiosyncratic draws. */
export function allocateLabour(citizens: Citizen[], pool: number, dispersion: number, rng: Rng): void {
  const eligible: { c: Citizen; w: number }[] = [];
  let totalW = 0;
  for (const c of citizens) {
    const base = LABOUR_WEIGHT[c.class];
    if (!base) continue;
    // Centre the lognormal so its mean ≈ 1 regardless of dispersion (pool is preserved).
    const w = base * lognormal(rng, -0.5 * dispersion * dispersion, dispersion);
    eligible.push({ c, w });
    totalW += w;
  }
  if (totalW === 0) return;
  for (const { c, w } of eligible) c.totalLabourCost = (pool * w) / totalW;
}

/** Allocate the capital pool with Pareto-distributed weights (controllable top tail). */
export function allocateCapital(citizens: Citizen[], pool: number, alpha: number, rng: Rng): void {
  const a = Math.max(1.05, alpha); // alpha ≤ 1 has no finite mean
  const eligible: { c: Citizen; w: number }[] = [];
  let totalW = 0;
  for (const c of citizens) {
    const base = CAPITAL_WEIGHT[c.class];
    if (!base) continue;
    // Pareto(alpha) draw: w = u^(-1/alpha). Lower alpha ⇒ fatter tail ⇒ more concentration.
    const u = Math.max(rng(), 1e-12);
    const w = base * Math.pow(u, -1 / a);
    eligible.push({ c, w });
    totalW += w;
  }
  if (totalW === 0) return;
  for (const { c, w } of eligible) c.capitalIncome = (pool * w) / totalW;
}
