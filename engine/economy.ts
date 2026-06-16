// engine/economy.ts
// Orchestrates the simulation. P0 is a deliberately minimal but identity-respecting
// single-year stub so the pipeline renders something real; P1 replaces simulateYear
// with the proper distribution + fiscal logic.

import type {
  Citizen,
  CitizenClass,
  Params,
  PhysicalState,
  SankeyLink,
  SimResult,
  YearState,
} from './types';
import { CITIZEN_CLASSES } from './types';
import { FINLAND_BASELINE } from '../data/finland-baseline';
import { makeRng, lognormal, type Rng } from './rng';
import { gini, topShare, median } from './metrics';

export interface RunOpts {
  seed?: number;
  years?: number;
  params?: Params;
  startYear?: number;
}

export function runEconomy(opts: RunOpts = {}): SimResult {
  const seed = opts.seed ?? 1;
  const params = opts.params ?? FINLAND_BASELINE;
  const yearsN = opts.years ?? 1;
  const startYear = opts.startYear ?? 2025;

  const years: YearState[] = [];
  for (let t = 0; t < yearsN; t++) {
    // Distinct stream per year, still fully determined by `seed`.
    years.push(simulateYear(startYear + t, params, makeRng(seed * 7919 + t)));
  }
  return { years, seed };
}

/** Which classes draw labor income, with a relative pay weight. */
const LABOR_WEIGHT: Partial<Record<CitizenClass, number>> = {
  worker: 1,
  professional: 1.8,
  small_business: 1.2,
};
/** Which classes draw capital income, with a relative ownership weight. */
const CAPITAL_WEIGHT: Partial<Record<CitizenClass, number>> = {
  capital_owner: 1,
  small_business: 0.25,
  professional: 0.1,
};

function simulateYear(year: number, p: Params, rng: Rng): YearState {
  const n = p.population;
  const output = p.realOutput.value;
  const laborPool = output * p.wageShare.value;
  const capitalPool = output - laborPool; // identity: pools sum to output

  // 1. Instantiate the population by class share.
  const citizens: Citizen[] = [];
  for (const cls of CITIZEN_CLASSES) {
    const count = Math.round(n * (p.classShares[cls] ?? 0));
    for (let i = 0; i < count; i++) {
      citizens.push(blankCitizen(citizens.length, cls));
    }
  }

  // 2. Allocate labor and capital pools across eligible citizens, weighting by
  //    class and a lognormal idiosyncratic draw (dispersion is a policy lever).
  allocatePool(citizens, laborPool, LABOR_WEIGHT, p.wageDispersion.value, rng, 'labor');
  allocatePool(citizens, capitalPool, CAPITAL_WEIGHT, p.wageDispersion.value, rng, 'capital');

  // 3. Fiscal layer (flat stub). Tax revenue funds transfers + the social wage.
  const taxRate = p.avgTaxRate.value;
  let revenue = 0;
  for (const c of citizens) {
    c.taxesPaid = (c.laborIncome + c.capitalIncome) * taxRate;
    revenue += c.taxesPaid;
  }
  const nonEarners = citizens.filter((c) => c.class === 'unemployed' || c.class === 'retiree' || c.class === 'student');
  const transferBudget = revenue * (1 - p.socialWageFraction.value);
  const perTransfer = nonEarners.length ? transferBudget / nonEarners.length : 0;
  for (const c of nonEarners) c.transfers = perTransfer;

  const socialWagePerCapita = (revenue * p.socialWageFraction.value) / citizens.length;

  // 4. Disposable income, housing, capability, and a placeholder wealth (P3 adds dynamics).
  for (const c of citizens) {
    c.socialWageReceived = socialWagePerCapita;
    const disposable = c.laborIncome + c.capitalIncome - c.taxesPaid + c.transfers;
    c.housingCost = Math.max(0, disposable) * p.housingCostFraction.value * (0.6 + 0.8 * rng());
    c.capability = disposable + c.socialWageReceived - c.housingCost;
    c.wealth = Math.max(0, disposable) * (2 + 6 * rng()); // crude stand-in until P3
  }

  return {
    year,
    physical: physicalStub(p),
    flows: { money: moneySankey(citizens, laborPool, capitalPool, revenue), physical: [] },
    citizens,
    metrics: computeMetrics(citizens),
  };
}

function blankCitizen(id: number, cls: CitizenClass): Citizen {
  return {
    id,
    class: cls,
    laborIncome: 0,
    capitalIncome: 0,
    transfers: 0,
    taxesPaid: 0,
    socialWageReceived: 0,
    housingCost: 0,
    wealth: 0,
    capability: 0,
  };
}

/** Distribute `pool` exactly across eligible citizens, preserving the sum (an identity). */
function allocatePool(
  citizens: Citizen[],
  pool: number,
  weights: Partial<Record<CitizenClass, number>>,
  dispersion: number,
  rng: Rng,
  kind: 'labor' | 'capital',
): void {
  const eligible: { c: Citizen; w: number }[] = [];
  let totalW = 0;
  for (const c of citizens) {
    const base = weights[c.class];
    if (!base) continue;
    const w = base * lognormal(rng, 0, dispersion);
    eligible.push({ c, w });
    totalW += w;
  }
  if (totalW === 0) return;
  for (const { c, w } of eligible) {
    const amount = (pool * w) / totalW;
    if (kind === 'labor') c.laborIncome = amount;
    else c.capitalIncome = amount;
  }
}

function computeMetrics(citizens: Citizen[]) {
  const caps = citizens.map((c) => c.capability);
  const wealth = citizens.map((c) => c.wealth);
  return {
    gini: gini(caps.map((v) => Math.max(0, v))),
    top1WealthShare: topShare(wealth, 0.01),
    top10WealthShare: topShare(wealth, 0.1),
    medianCapability: median(caps),
  };
}

function moneySankey(
  citizens: Citizen[],
  laborPool: number,
  capitalPool: number,
  revenue: number,
): SankeyLink[] {
  const byClassLabor = new Map<CitizenClass, number>();
  const byClassCapital = new Map<CitizenClass, number>();
  for (const c of citizens) {
    byClassLabor.set(c.class, (byClassLabor.get(c.class) ?? 0) + c.laborIncome);
    byClassCapital.set(c.class, (byClassCapital.get(c.class) ?? 0) + c.capitalIncome);
  }
  const links: SankeyLink[] = [
    { source: 'Real output', target: 'Wages', value: laborPool },
    { source: 'Real output', target: 'Capital income', value: capitalPool },
    { source: 'Wages', target: 'Taxes', value: revenue * (laborPool / (laborPool + capitalPool)) },
    { source: 'Capital income', target: 'Taxes', value: revenue * (capitalPool / (laborPool + capitalPool)) },
  ];
  for (const [cls, v] of byClassLabor) if (v > 0) links.push({ source: 'Wages', target: label(cls), value: v });
  for (const [cls, v] of byClassCapital) if (v > 0) links.push({ source: 'Capital income', target: label(cls), value: v });
  return links;
}

function label(cls: CitizenClass): string {
  return cls.replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function physicalStub(p: Params): PhysicalState {
  // P0: report the energy mix shares scaled to a notional total; no real dynamics yet.
  const total = 1000;
  const primaryEnergy: Record<string, number> = {};
  for (const [src, share] of Object.entries(p.energyMix)) {
    primaryEnergy[src] = total * share.value;
  }
  return {
    primaryEnergy,
    eroi: p.eroi.value,
    usefulWork: total * 0.4,
    materialThroughput: total * 0.5,
    emissions: (primaryEnergy['fossil'] ?? 0) * 0.3,
    realOutput: p.realOutput.value,
  };
}
