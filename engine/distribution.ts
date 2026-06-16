// engine/distribution.ts
// Primary (functional + personal) distribution: split real output into labour
// and capital pools, then allocate each across eligible citizens. The pools sum
// exactly to output — that accounting identity is what the "rules, not nature"
// argument rests on.

import type { Citizen, CitizenClass } from './types';
import { lognormal, type Rng } from './rng';

/** Classes that draw labour income, with a relative skill/pay weight. */
const LABOUR_WEIGHT: Partial<Record<CitizenClass, number>> = {
  worker: 1,
  professional: 1.9,
  small_business: 1.2,
};

/** Classes that draw capital income, with a relative ownership weight. */
const CAPITAL_WEIGHT: Partial<Record<CitizenClass, number>> = {
  capital_owner: 1,
  small_business: 0.2,
  professional: 0.08,
  retiree: 0.12,
};

export function allocateLabour(citizens: Citizen[], pool: number, dispersion: number, rng: Rng): void {
  allocate(citizens, pool, LABOUR_WEIGHT, dispersion, rng, 'labor');
}

export function allocateCapital(citizens: Citizen[], pool: number, dispersion: number, rng: Rng): void {
  allocate(citizens, pool, CAPITAL_WEIGHT, dispersion, rng, 'capital');
}

function allocate(
  citizens: Citizen[],
  pool: number,
  weights: Partial<Record<CitizenClass, number>>,
  dispersion: number,
  rng: Rng,
  field: 'labor' | 'capital',
): void {
  const eligible: { c: Citizen; w: number }[] = [];
  let totalW = 0;
  for (const c of citizens) {
    const base = weights[c.class];
    if (!base) continue;
    // Lognormal idiosyncratic draw; centred so the mean multiplier ≈ 1 and the
    // pool is preserved regardless of dispersion.
    const w = base * lognormal(rng, -0.5 * dispersion * dispersion, dispersion);
    eligible.push({ c, w });
    totalW += w;
  }
  if (totalW === 0) return;
  for (const { c, w } of eligible) {
    const amount = (pool * w) / totalW;
    if (field === 'labor') c.laborIncome = amount;
    else c.capitalIncome = amount;
  }
}
