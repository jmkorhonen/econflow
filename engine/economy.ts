// engine/economy.ts
// Orchestrates one simulated year: physical pie → functional split → personal
// distribution → progressive tax → cash transfers + in-kind social wage →
// housing → capability. Every step preserves an accounting identity, and the
// physical pie is fixed by parameters (P2 makes it endogenous), so politics
// redistributes the pie rather than conjuring it.

import type {
  Citizen,
  CitizenClass,
  Decomposition,
  DecompositionItem,
  Params,
  PhysicalState,
  SankeyLink,
  SimResult,
  YearState,
} from './types';
import { CITIZEN_CLASSES } from './types';
import { FINLAND_BASELINE } from '../data/finland-baseline';
import { makeRng, type Rng } from './rng';
import { allocateLabour, allocateCapital } from './distribution';
import { labourTax, capitalTax } from './fiscal';
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
    years.push(simulateYear(startYear + t, params, makeRng(seed * 7919 + t)));
  }
  return { years, seed };
}

const TRANSFER_CLASS: Partial<Record<CitizenClass, keyof Params['transfers']>> = {
  retiree: 'pension',
  unemployed: 'unemployment',
  student: 'study',
  child: 'child',
};

function simulateYear(year: number, p: Params, rng: Rng): YearState {
  const output = p.realOutput.value;
  const laborPool = output * p.wageShare.value;
  const capitalPool = output - laborPool; // identity: pools sum to output

  // 1. Population by class share.
  const citizens: Citizen[] = [];
  for (const cls of CITIZEN_CLASSES) {
    const count = Math.round(p.population * (p.classShares[cls] ?? 0));
    for (let i = 0; i < count; i++) citizens.push(blankCitizen(citizens.length, cls));
  }

  // 2. Primary distribution.
  allocateLabour(citizens, laborPool, p.wageDispersion.value, rng);
  allocateCapital(citizens, capitalPool, p.capitalDispersion.value, rng);

  // 3. Progressive labour tax + flat capital tax → public budget.
  let labourTaxTotal = 0;
  let capitalTaxTotal = 0;
  for (const c of citizens) {
    const lt = labourTax(c.laborIncome, p.taxLevel.value);
    const ct = capitalTax(c.capitalIncome, p.capitalTaxRate.value);
    c.taxesPaid = lt + ct;
    labourTaxTotal += lt;
    capitalTaxTotal += ct;
  }
  const publicBudget = labourTaxTotal + capitalTaxTotal;

  // 4. Split the budget into in-kind services (social wage) and cash transfers.
  const socialWageBudget = publicBudget * p.socialWageFraction.value;
  const cashBudget = publicBudget - socialWageBudget;
  const socialWagePerCapita = socialWageBudget / citizens.length;

  const desiredTransfer = (c: Citizen) => {
    const key = TRANSFER_CLASS[c.class];
    return key ? p.transfers[key].value : 0;
  };
  const desiredTotal = citizens.reduce((s, c) => s + desiredTransfer(c), 0);
  const transferScale = desiredTotal > 0 ? Math.min(1, cashBudget / desiredTotal) : 0;
  let transfersPaid = 0;
  for (const c of citizens) {
    c.transfers = desiredTransfer(c) * transferScale;
    transfersPaid += c.transfers;
  }

  // 5. Disposable income → housing → capability; crude wealth proxy (P3 adds dynamics).
  for (const c of citizens) {
    c.socialWageReceived = socialWagePerCapita;
    const disposable = c.laborIncome + c.capitalIncome - c.taxesPaid + c.transfers;
    c.housingCost = Math.max(0, disposable) * p.housingCostFraction.value * (0.7 + 0.6 * rng());
    c.capability = disposable + c.socialWageReceived - c.housingCost;
    // Wealth proxy: capitalised capital income (concentrated) + accumulated savings.
    c.wealth = Math.max(0, c.capitalIncome) * 12 + Math.max(0, disposable) * (1 + 4 * rng());
  }

  return {
    year,
    physical: physicalStub(p),
    flows: {
      money: moneySankey({
        laborPool,
        capitalPool,
        labourTaxTotal,
        capitalTaxTotal,
        socialWageBudget,
        transfersPaid,
      }),
      physical: [],
    },
    citizens,
    metrics: computeMetrics(citizens, output),
    representative: representativeWorker(citizens),
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

function disposableOf(c: Citizen): number {
  return c.laborIncome + c.capitalIncome - c.taxesPaid + c.transfers;
}

function computeMetrics(citizens: Citizen[], output: number) {
  const caps = citizens.map((c) => Math.max(0, c.capability));
  const wealth = citizens.map((c) => c.wealth);
  // Gini over adults only (no household equivalisation in P1). The market→disposable
  // drop shows what tax + transfers do; equivalisation would compress further toward 0.27.
  const adults = citizens.filter((c) => c.class !== 'child');
  const adultMarket = adults.map((c) => Math.max(0, c.laborIncome + c.capitalIncome));
  const adultDisposable = adults.map((c) => Math.max(0, disposableOf(c)));
  const totalTax = citizens.reduce((s, c) => s + c.taxesPaid, 0);
  return {
    gini: gini(caps),
    marketGini: gini(adultMarket),
    disposableGini: gini(adultDisposable),
    top1WealthShare: topShare(wealth, 0.01),
    top10WealthShare: topShare(wealth, 0.1),
    medianCapability: median(citizens.map((c) => c.capability)),
    avgEffectiveTaxRate: output > 0 ? totalTax / output : 0,
  };
}

/** Median-capability worker, decomposed into the sources of their capability. */
function representativeWorker(citizens: Citizen[]): Decomposition {
  const workers = citizens.filter((c) => c.class === 'worker').sort((a, b) => a.capability - b.capability);
  const c = workers[Math.floor(workers.length / 2)] ?? citizens[0];
  const gross = c.laborIncome + c.capitalIncome;
  const items: DecompositionItem[] = [
    { label: 'Gross labour income', delta: c.laborIncome, kind: 'gross' },
  ];
  if (c.capitalIncome > 0) items.push({ label: 'Capital income', delta: c.capitalIncome, kind: 'gross' });
  items.push({ label: 'Income & capital tax', delta: -c.taxesPaid, kind: 'tax' });
  if (c.transfers > 0) items.push({ label: 'Cash transfers', delta: c.transfers, kind: 'transfer' });
  items.push({ label: 'Public services (social wage)', delta: c.socialWageReceived, kind: 'social' });
  items.push({ label: 'Housing cost', delta: -c.housingCost, kind: 'housing' });
  return { citizenClass: c.class, grossIncome: gross, items, capability: c.capability };
}

interface FlowInputs {
  laborPool: number;
  capitalPool: number;
  labourTaxTotal: number;
  capitalTaxTotal: number;
  socialWageBudget: number;
  transfersPaid: number;
}

function moneySankey(f: FlowInputs): SankeyLink[] {
  const publicBudget = f.labourTaxTotal + f.capitalTaxTotal;
  const otherSpending = Math.max(0, publicBudget - f.socialWageBudget - f.transfersPaid);
  const netHousehold = f.laborPool + f.capitalPool - f.labourTaxTotal - f.capitalTaxTotal + f.transfersPaid;
  const links: SankeyLink[] = [
    { source: 'Real output', target: 'Labour income', value: f.laborPool },
    { source: 'Real output', target: 'Capital income', value: f.capitalPool },
    { source: 'Labour income', target: 'Public budget', value: f.labourTaxTotal },
    { source: 'Labour income', target: 'Net household income', value: f.laborPool - f.labourTaxTotal },
    { source: 'Capital income', target: 'Public budget', value: f.capitalTaxTotal },
    { source: 'Capital income', target: 'Net household income', value: f.capitalPool - f.capitalTaxTotal },
    { source: 'Public budget', target: 'Public services', value: f.socialWageBudget },
    { source: 'Public budget', target: 'Cash transfers', value: f.transfersPaid },
    { source: 'Public budget', target: 'Other spending', value: otherSpending },
    { source: 'Cash transfers', target: 'Net household income', value: f.transfersPaid },
    { source: 'Public services', target: 'Real capability', value: f.socialWageBudget },
    { source: 'Net household income', target: 'Real capability', value: netHousehold },
  ];
  return links.filter((l) => l.value > 0);
}

function physicalStub(p: Params): PhysicalState {
  const total = 1000;
  const primaryEnergy: Record<string, number> = {};
  for (const [src, share] of Object.entries(p.energyMix)) primaryEnergy[src] = total * share.value;
  return {
    primaryEnergy,
    eroi: p.eroi.value,
    usefulWork: total * 0.4,
    materialThroughput: total * 0.5,
    emissions: (primaryEnergy['fossil'] ?? 0) * 0.3,
    realOutput: p.realOutput.value,
  };
}
