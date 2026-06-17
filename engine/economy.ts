// engine/economy.ts
// Orchestrates one simulated year. The pie is fixed by the productive substrate
// (perCapitaOutput × population × productivityMultiplier — the P3 hook), then:
//   functional split → personal distribution → the tax wedge (labour cost →
//   real consumption through employer/employee contributions, income tax, VAT) →
//   in-kind social wage → real capability.
// Every euro extracted is conserved into one public budget.

import type {
  Citizen,
  CitizenClass,
  Decomposition,
  DecompositionItem,
  Distribution,
  Params,
  PersonResult,
  PhysicalState,
  SankeyLink,
  SimResult,
  Wedge,
  WedgeSlice,
  YearState,
} from './types';
import { CITIZEN_CLASSES } from './types';
import { FINLAND_BASELINE } from '../data/finland-baseline';
import { makeRng, type Rng } from './rng';
import { allocateLabour, allocateCapital } from './distribution';
import { labourTax, capitalTax } from './fiscal';
import { gini, median } from './metrics';
import { decileBreakdown, decileOf, topFractileShare } from './aggregate';

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
  const output = p.perCapitaOutput.value * p.population * p.productivityMultiplier.value;
  const laborPool = output * p.wageShare.value; // compensation of employees (incl. employer contributions)
  const capitalPool = output - laborPool; // identity: pools sum to output

  // 1. Population by class share, each with a reproducible merit rank.
  const citizens: Citizen[] = [];
  for (const cls of CITIZEN_CLASSES) {
    const count = Math.round(p.population * (p.classShares[cls] ?? 0));
    for (let i = 0; i < count; i++) citizens.push(blankCitizen(citizens.length, cls, rng()));
  }

  // 2. Primary distribution: labour (lognormal) and capital (Pareto tail).
  allocateLabour(citizens, laborPool, p.wageDispersion.value, rng);
  allocateCapital(citizens, capitalPool, p.capitalParetoAlpha.value, rng);

  // 3. The wedge, part 1: employer/employee contributions, income tax, capital tax.
  let labourSideTake = 0; // employer + employee + income tax
  let capitalTaxTotal = 0;
  for (const c of citizens) {
    applyTaxes(c, p);
    labourSideTake += c.employerContrib + c.employeeContrib + c.incomeTax;
    capitalTaxTotal += c.capitalTax;
  }
  const directTaxBudget = labourSideTake + capitalTaxTotal;

  // 4. Cash transfers funded from the direct-tax budget (the cash share of it).
  const servicesFromDirect = directTaxBudget * p.socialWageFraction.value;
  const cashBudget = directTaxBudget - servicesFromDirect;
  const desiredTransfer = (c: Citizen) => {
    const key = TRANSFER_CLASS[c.class];
    return key ? p.transfers[key].value : 0;
  };
  const desiredTotal = citizens.reduce((s, c) => s + desiredTransfer(c), 0);
  const transferScale = desiredTotal > 0 ? Math.min(1, cashBudget / desiredTotal) : 0;
  let transfersPaid = 0;
  for (const c of citizens) {
    c.transfers = desiredTransfer(c) * transferScale;
    c.disposable = c.grossWage - c.employeeContrib - c.incomeTax + c.capitalIncome - c.capitalTax + c.transfers;
    transfersPaid += c.transfers;
  }

  // 5. Savings rise with income → VAT bites the bottom harder. Needs the median first.
  const medDisposable = median(citizens.map((c) => c.disposable).filter((v) => v > 0)) || 1;
  let vatTotal = 0;
  for (const c of citizens) {
    applyConsumption(c, p, medDisposable);
    vatTotal += c.vatPaid;
  }

  // 6. Social wage: in-kind services funded by the direct-tax share + all VAT, per capita.
  const socialWageBudget = servicesFromDirect + vatTotal;
  const socialWagePerCapita = socialWageBudget / citizens.length;
  for (const c of citizens) {
    c.socialWageReceived = socialWagePerCapita;
    c.capability = c.realConsumption + c.socialWageReceived;
    c.taxesPaid = c.employerContrib + c.employeeContrib + c.incomeTax + c.capitalTax + c.vatPaid;
    c.wealth = Math.max(0, c.capitalIncome) * 15 + c.savings * 10; // proxy until P3
  }

  const totalBudget = directTaxBudget + vatTotal;
  const otherSpending = Math.max(0, directTaxBudget - servicesFromDirect - transfersPaid);

  return {
    year,
    physical: physicalStub(p, output),
    flows: {
      money: moneySankey({
        laborPool,
        capitalPool,
        labourSideTake,
        capitalTaxTotal,
        savingsTotal: sum(citizens, (c) => c.savings),
        expenditureTotal: sum(citizens, (c) => Math.max(0, c.disposable) - c.savings),
        realConsumptionTotal: sum(citizens, (c) => c.realConsumption),
        vatTotal,
        servicesFromDirect,
        transfersPaid,
        otherSpending,
        socialWageBudget,
      }),
      physical: [],
    },
    citizens,
    metrics: computeMetrics(citizens, output, totalBudget),
    representative: representativeWorker(citizens),
    distribution: computeDistribution(citizens),
    wedge: medianWedge(citizens),
  };
}

function blankCitizen(id: number, cls: CitizenClass, meritRank: number): Citizen {
  return {
    id,
    class: cls,
    meritRank,
    totalLabourCost: 0,
    capitalIncome: 0,
    employerContrib: 0,
    grossWage: 0,
    employeeContrib: 0,
    incomeTax: 0,
    capitalTax: 0,
    transfers: 0,
    disposable: 0,
    savings: 0,
    vatPaid: 0,
    realConsumption: 0,
    socialWageReceived: 0,
    housingCost: 0,
    wealth: 0,
    capability: 0,
    laborIncome: 0,
    taxesPaid: 0,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const sum = (cs: Citizen[], f: (c: Citizen) => number) => cs.reduce((s, c) => s + f(c), 0);

function computeMetrics(citizens: Citizen[], output: number, totalBudget: number) {
  const caps = citizens.map((c) => Math.max(0, c.capability));
  const wealth = citizens.map((c) => c.wealth);
  const adults = citizens.filter((c) => c.class !== 'child');
  const adultMarket = adults.map((c) => Math.max(0, c.grossWage + c.capitalIncome));
  const adultDisposable = adults.map((c) => Math.max(0, c.disposable));
  const w = medianWedge(citizens);
  return {
    gini: gini(caps),
    marketGini: gini(adultMarket),
    disposableGini: gini(adultDisposable),
    top1WealthShare: topFractileShare(wealth, 0.01),
    top10WealthShare: topFractileShare(wealth, 0.1),
    top01WealthShare: topFractileShare(wealth, 0.001),
    medianCapability: median(citizens.map((c) => c.capability)),
    avgEffectiveTaxRate: output > 0 ? totalBudget / output : 0,
    // OECD-style labour tax wedge: employer + employee contributions + income tax,
    // as a share of total labour cost. Savings and VAT are not part of it.
    medianTaxWedge: w.totalLabourCost > 0 ? w.labourSideTake / w.totalLabourCost : 0,
  };
}

function computeDistribution(citizens: Citizen[]): Distribution {
  // Distribution among the adult population (children are not income units).
  const adults = citizens.filter((c) => c.class !== 'child');
  const disposable = adults.map((c) => Math.max(0, c.disposable));
  return {
    market: decileBreakdown(adults.map((c) => Math.max(0, c.grossWage + c.capitalIncome))),
    disposable: decileBreakdown(disposable),
    capability: decileBreakdown(adults.map((c) => Math.max(0, c.capability))),
    top10: topFractileShare(disposable, 0.1),
    top1: topFractileShare(disposable, 0.01),
    top01: topFractileShare(disposable, 0.001),
  };
}

/** Apply the contribution/tax stage to a citizen whose totalLabourCost (and capitalIncome) are set. */
function applyTaxes(c: Citizen, p: Params): void {
  const eRate = p.employerContribRate.value;
  c.grossWage = c.totalLabourCost / (1 + eRate);
  c.employerContrib = c.totalLabourCost - c.grossWage;
  c.employeeContrib = c.grossWage * p.employeeContribRate.value;
  const taxable = c.grossWage - c.employeeContrib;
  c.incomeTax = labourTax(taxable, p.taxLevel.value, p.taxProgressivity.value);
  c.capitalTax = capitalTax(c.capitalIncome, p.capitalTaxRate.value);
  c.laborIncome = c.grossWage;
}

/** Apply the savings/VAT/consumption stage to a citizen whose disposable is set. */
function applyConsumption(c: Citizen, p: Params, medDisposable: number): void {
  const rel = c.disposable / medDisposable - 1;
  const sRate = clamp(p.savingsRateBase.value + p.savingsRateSlope.value * rel, 0, 0.6);
  const spendable = Math.max(0, c.disposable);
  c.savings = spendable * sRate;
  const expenditure = spendable - c.savings;
  c.housingCost = expenditure * p.housingCostFraction.value; // VAT-exempt rent
  const vatable = expenditure - c.housingCost;
  c.vatPaid = vatable * (p.vatRate.value / (1 + p.vatRate.value));
  c.realConsumption = expenditure - c.vatPaid; // housing + goods actually obtained
}

/** The median-grossWage worker, decomposed into the sources of their capability. */
function representativeWorker(citizens: Citizen[]): Decomposition {
  const c = medianWorker(citizens);
  const items: DecompositionItem[] = [
    { label: 'Gross wage', delta: c.grossWage, kind: 'gross' },
  ];
  if (c.capitalIncome > 0) items.push({ label: 'Capital income', delta: c.capitalIncome, kind: 'gross' });
  items.push({ label: 'Employee contributions + income tax', delta: -(c.employeeContrib + c.incomeTax + c.capitalTax), kind: 'tax' });
  if (c.transfers > 0) items.push({ label: 'Cash transfers', delta: c.transfers, kind: 'transfer' });
  items.push({ label: 'Savings (becomes future wealth)', delta: -c.savings, kind: 'housing' });
  items.push({ label: 'VAT on spending', delta: -c.vatPaid, kind: 'tax' });
  items.push({ label: 'Public services (social wage)', delta: c.socialWageReceived, kind: 'social' });
  return { citizenClass: c.class, grossIncome: c.grossWage + c.capitalIncome, items, capability: c.capability };
}

function medianWorker(citizens: Citizen[]): Citizen {
  const workers = citizens.filter((c) => c.class === 'worker').sort((a, b) => a.grossWage - b.grossWage);
  return workers[Math.floor(workers.length / 2)] ?? citizens[0];
}

function medianWedge(citizens: Citizen[]): Wedge {
  return wedgeForCitizen(medianWorker(citizens));
}

/** A citizen's full labour-cost → capability wedge (drives the relabel demo). */
function wedgeForCitizen(c: Citizen): Wedge {
  const takeHome = c.savings + (c.realConsumption - c.housingCost) + c.housingCost; // = expenditure + savings
  const slices: WedgeSlice[] = [
    { label: 'Employer contributions', amount: c.employerContrib, kind: 'employer_contrib', side: 'above_gross' },
    { label: 'Employee contributions', amount: c.employeeContrib, kind: 'employee_contrib', side: 'below_gross' },
    { label: 'Income tax', amount: c.incomeTax, kind: 'income_tax', side: 'below_gross' },
    { label: 'Savings', amount: c.savings, kind: 'savings', side: 'consumption' },
    { label: 'VAT', amount: c.vatPaid, kind: 'vat', side: 'consumption' },
    { label: 'Real consumption', amount: c.realConsumption, kind: 'take_home', side: 'consumption' },
    { label: 'Public services returned', amount: c.socialWageReceived, kind: 'social_wage', side: 'returned' },
  ];
  return {
    totalLabourCost: c.totalLabourCost,
    grossWage: c.grossWage,
    takeHome,
    realConsumption: c.realConsumption,
    capability: c.capability,
    labourSideTake: c.employerContrib + c.employeeContrib + c.incomeTax,
    slices,
  };
}

interface FlowInputs {
  laborPool: number;
  capitalPool: number;
  labourSideTake: number;
  capitalTaxTotal: number;
  savingsTotal: number;
  expenditureTotal: number;
  realConsumptionTotal: number;
  vatTotal: number;
  servicesFromDirect: number;
  transfersPaid: number;
  otherSpending: number;
  socialWageBudget: number;
}

/** Acyclic macro flow: output → factor incomes → public budget / households → uses → capability. */
function moneySankey(f: FlowInputs): SankeyLink[] {
  const links: SankeyLink[] = [
    { source: 'Real output', target: 'Labour income', value: f.laborPool },
    { source: 'Real output', target: 'Capital income', value: f.capitalPool },
    { source: 'Labour income', target: 'Public budget', value: f.labourSideTake },
    { source: 'Labour income', target: 'Households', value: f.laborPool - f.labourSideTake },
    { source: 'Capital income', target: 'Public budget', value: f.capitalTaxTotal },
    { source: 'Capital income', target: 'Households', value: f.capitalPool - f.capitalTaxTotal },
    { source: 'Public budget', target: 'Cash transfers', value: f.transfersPaid },
    { source: 'Public budget', target: 'Public services', value: f.servicesFromDirect },
    { source: 'Public budget', target: 'Other spending', value: f.otherSpending },
    { source: 'Cash transfers', target: 'Households', value: f.transfersPaid },
    { source: 'Households', target: 'Savings', value: f.savingsTotal },
    { source: 'Households', target: 'Consumption', value: f.expenditureTotal },
    { source: 'Consumption', target: 'VAT', value: f.vatTotal },
    { source: 'Consumption', target: 'Real consumption', value: f.realConsumptionTotal },
    { source: 'VAT', target: 'Public services', value: f.vatTotal },
    { source: 'Real consumption', target: 'Real capability', value: f.realConsumptionTotal },
    { source: 'Public services', target: 'Real capability', value: f.socialWageBudget },
  ];
  return links.filter((l) => l.value > 0);
}

/**
 * Run a user's own income through the *same* wedge as the synthetic population,
 * and locate them in the adult disposable-income distribution. Pure and
 * client-side — the income never leaves the function.
 */
export function evaluatePerson(
  year: YearState,
  p: Params,
  grossWage: number,
  capitalIncome: number,
): PersonResult {
  const socialWagePerCapita = year.citizens[0]?.socialWageReceived ?? 0;
  const medDisposable = median(year.citizens.map((c) => c.disposable).filter((v) => v > 0)) || 1;

  const c = blankCitizen(-1, 'worker', 0.5);
  c.totalLabourCost = Math.max(0, grossWage) * (1 + p.employerContribRate.value);
  c.capitalIncome = Math.max(0, capitalIncome);
  applyTaxes(c, p);
  c.disposable = c.grossWage - c.employeeContrib - c.incomeTax + c.capitalIncome - c.capitalTax;
  applyConsumption(c, p, medDisposable);
  c.socialWageReceived = socialWagePerCapita;
  c.capability = c.realConsumption + c.socialWageReceived;

  const adultDisp = year.citizens
    .filter((x) => x.class !== 'child')
    .map((x) => Math.max(0, x.disposable))
    .sort((a, b) => a - b);
  const below = adultDisp.filter((v) => v <= c.disposable).length;
  const w = wedgeForCitizen(c);
  return {
    grossWage: c.grossWage,
    capitalIncome: c.capitalIncome,
    totalLabourCost: c.totalLabourCost,
    disposable: c.disposable,
    savings: c.savings,
    vatPaid: c.vatPaid,
    realConsumption: c.realConsumption,
    socialWage: c.socialWageReceived,
    capability: c.capability,
    taxWedge: w.totalLabourCost > 0 ? w.labourSideTake / w.totalLabourCost : 0,
    decile: decileOf(adultDisp, Math.max(0, c.disposable)),
    percentile: adultDisp.length ? (below / adultDisp.length) * 100 : 0,
    wedge: w,
  };
}

function physicalStub(p: Params, output: number): PhysicalState {
  const total = 1000;
  const primaryEnergy: Record<string, number> = {};
  for (const [src, share] of Object.entries(p.energyMix)) primaryEnergy[src] = total * share.value;
  return {
    primaryEnergy,
    eroi: p.eroi.value,
    usefulWork: total * 0.4,
    materialThroughput: total * 0.5,
    emissions: (primaryEnergy['fossil'] ?? 0) * 0.3,
    realOutput: output,
  };
}
