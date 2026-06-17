// engine/types.ts
// Core domain types for the Econflow engine.
// The engine is pure, framework-free TypeScript and must never import from src/.

/**
 * How a parameter's [low, high] range should be interpreted.
 * This tag is what keeps the model honest: it separates "we don't know the
 * true value" from "this is yours to choose" from "this must hold by definition".
 */
export type ParamKind =
  | 'empirical' // measured-but-uncertain (wage share, EROI, top-1% share).
  //               Range = measurement uncertainty. These earn uncertainty bands.
  | 'policy' //    a lever or contested elasticity (tax rate, incentive feedback).
  //               Range = the span of the live debate. The user's to set — NOT uncertainty.
  | 'identity'; //  an accounting must-hold (incomes sum to output). Range is degenerate.

/** A single model parameter carrying its range, provenance, and kind. */
export interface Param {
  /** Operative value used by the engine. Defaults to the midpoint of [low, high]. */
  value: number;
  low: number;
  high: number;
  kind: ParamKind;
  unit?: string;
  /** Citation key into data/sources.md. */
  source?: string;
  note?: string;
}

export type CitizenClass =
  | 'worker'
  | 'professional'
  | 'small_business'
  | 'capital_owner'
  | 'retiree'
  | 'unemployed'
  | 'student'
  | 'child';

export const CITIZEN_CLASSES: readonly CitizenClass[] = [
  'worker',
  'professional',
  'small_business',
  'capital_owner',
  'retiree',
  'unemployed',
  'student',
  'child',
] as const;

export interface Citizen {
  id: number;
  class: CitizenClass;
  /** Reproducible percentile of effort/skill in [0,1]. Held constant lets us isolate
   *  "merit" from institutions — the same person re-run across machines (P4 avatar). */
  meritRank: number;

  // --- Primary distribution ---
  /** Compensation of employees (total labour cost to the employer, incl. employer contributions). */
  totalLabourCost: number;
  capitalIncome: number;

  // --- The wedge: labour cost → real consumption ---
  employerContrib: number; // social contributions paid by the employer (on top of gross)
  grossWage: number; // totalLabourCost − employerContrib ("your salary")
  employeeContrib: number; // social contributions withheld from gross
  incomeTax: number; // progressive tax on taxable labour income
  capitalTax: number; // flat tax on capital income
  transfers: number; // cash transfers received
  disposable: number; // cash in hand after tax + transfers
  savings: number; // set aside (becomes future wealth; not current consumption)
  vatPaid: number; // consumption tax embedded in spending
  realConsumption: number; // goods/services actually obtained after VAT
  socialWageReceived: number; // value of in-kind public services

  housingCost: number; // tracked sub-line of consumption (VAT-exempt rent)
  wealth: number; // crude proxy until P3 dynamics
  /** Headline real-welfare metric: real private consumption + social wage. */
  capability: number;

  /** @deprecated alias for grossWage, kept so older call-sites read clearly. */
  laborIncome: number;
  /** Total tax + contributions reaching the public budget from this citizen. */
  taxesPaid: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface PhysicalState {
  /** Gross primary energy by source (per-capita index units). */
  primaryEnergy: Record<string, number>;
  /** Net energy after the energy spent getting energy (EROI losses). */
  netEnergy: number;
  /** Useful work delivered to the economy (net energy × conversion efficiency). */
  usefulWork: number;
  /** Society-wide blended EROI across the mix. */
  eroiBlended: number;
  renewableShare: number;
  /** CO₂ emissions, per-capita index (fossil energy × emission factor). */
  emissions: number;
  materials: { throughput: number; virgin: number; recycled: number; waste: number };
  /** Physical contribution to the output multiplier (= 1.0 at the Finland baseline). */
  productivityFactor: number;
  /** Real output of the physical economy (the "pie" before any rules). */
  realOutput: number;
}

export interface Metrics {
  /** Gini of capability (the headline real-welfare metric). */
  gini: number;
  /** Gini of pre-tax, pre-transfer (market) income — before secondary distribution acts. */
  marketGini: number;
  /** Gini of disposable income (after tax + transfers), un-equivalised. Sits above the
   *  household-equivalised Eurostat figure (~0.27); the gap demonstrates what redistribution does. */
  disposableGini: number;
  top1WealthShare: number;
  top10WealthShare: number;
  top01WealthShare: number; // top 0.1%
  medianCapability: number;
  /** Realized average effective tax rate on factor income, for display. */
  avgEffectiveTaxRate: number;
  /** OECD-style tax wedge for the median worker: (labour cost − real consumption) / labour cost. */
  medianTaxWedge: number;
}

/** Per-quantile shares plus the income range (€ lo–hi) that defines each quantile. */
export interface QuantileBreakdown {
  shares: number[]; // index 0 = poorest; sums to 1
  edges: { lo: number; hi: number }[]; // income bounds of each quantile, for tooltips
}

/** A single income concept (market / disposable / capability), summarised every way the chart needs. */
export interface MetricDistribution {
  deciles: QuantileBreakdown; // 10 buckets
  percentiles: QuantileBreakdown; // 100 buckets
  bottom10: number; // share held by the bottom decile
  top10: number;
  top1: number;
  top01: number;
  median: number; // € median value
}

export interface Distribution {
  market: MetricDistribution;
  disposable: MetricDistribution;
  capability: MetricDistribution;
}

/** Result of running a user's own income through the same wedge as the synthetic population. */
export interface PersonResult {
  grossWage: number;
  capitalIncome: number;
  totalLabourCost: number;
  disposable: number;
  savings: number;
  vatPaid: number;
  realConsumption: number;
  socialWage: number;
  capability: number;
  /** OECD-style labour tax wedge for this person. */
  taxWedge: number;
  /** 1–10, by disposable income against the adult population. */
  decile: number;
  /** 0–100 percentile by disposable income. */
  percentile: number;
  wedge: Wedge;
}

/** A single euro-slice of the median worker's labour-cost → capability wedge. */
export interface WedgeSlice {
  label: string;
  amount: number; // €, always ≥ 0
  kind: 'employer_contrib' | 'employee_contrib' | 'income_tax' | 'vat' | 'savings' | 'take_home' | 'social_wage';
  /** Where the slice sits relative to the "gross wage" line, for the relabel demo. */
  side: 'above_gross' | 'below_gross' | 'consumption' | 'returned';
}

export interface Wedge {
  totalLabourCost: number;
  grossWage: number;
  takeHome: number; // net cash the worker can spend or save
  realConsumption: number;
  capability: number;
  /** Total labour-side public take (employer + employee contributions + income tax) — the
   *  amount the relabel slider redistributes between "employer contribution" and "income tax". */
  labourSideTake: number;
  slices: WedgeSlice[];
}

/** One step in the "where did your income come from?" decomposition. */
export interface DecompositionItem {
  label: string;
  /** Signed contribution to capability (€). Negative for tax/housing. */
  delta: number;
  kind: 'gross' | 'tax' | 'transfer' | 'social' | 'housing';
}

export interface Decomposition {
  citizenClass: CitizenClass;
  grossIncome: number;
  items: DecompositionItem[];
  capability: number;
}

export interface YearState {
  year: number;
  physical: PhysicalState;
  flows: { money: SankeyLink[]; physical: SankeyLink[] };
  citizens: Citizen[];
  metrics: Metrics;
  /** Income decomposition for a representative median worker (the headline graphic). */
  representative: Decomposition;
  /** Decile / top-fractile distribution of income and capability. */
  distribution: Distribution;
  /** The median worker's labour-cost → capability wedge (drives the relabel demo). */
  wedge: Wedge;
}

export interface SimResult {
  years: YearState[];
  seed: number;
}

/** Physical-economy parameters: energy, infrastructure, materials. */
export interface PhysicalParams {
  primaryEnergyIndex: Param; // total primary energy per capita (1.0 = baseline)
  energyMix: { fossil: Param; nuclear: Param; renewable: Param }; // shares, sum ≈ 1
  eroi: { fossil: Param; nuclear: Param; renewable: Param }; // energy return on energy invested
  conversionEfficiency: Param; // useful work ÷ net primary energy
  infrastructure: Param; // social-overhead-capital stock index (1.0 = baseline)
  energyElasticity: Param; // α: output elasticity wrt net useful energy
  infraElasticity: Param; // β: output elasticity wrt infrastructure
  emissionFactorFossil: Param; // CO₂ per unit fossil primary energy
  materialIntensity: Param; // material throughput per unit output (1.0 = baseline)
  recyclingRate: Param; // share of throughput met from recycled stock
}

/**
 * The full parameter set the engine consumes. Empirical/policy entries are
 * Params (carrying ranges + sources); structural counts are plain numbers.
 */
export interface Params {
  population: number;
  classShares: Record<CitizenClass, number>;

  // Physical / productive substrate.
  // Pie = perCapitaOutput × population × productivityMultiplier × physical.productivityFactor.
  // The physical factor is computed from energy + infrastructure (P3); productivityMultiplier
  // is the residual "technology / know-how" lever. Both are 1.0 at the Finland baseline.
  perCapitaOutput: Param; // € of real output per capita
  productivityMultiplier: Param; // technology / total-factor residual (1.0 = baseline)
  physical: PhysicalParams;

  // Distribution layer. These are structural parameters the (P4) policy-capture loop and
  // predistribution levers will write to; the engine only reads them.
  wageShare: Param; // labour share of output (compensation of employees ÷ output)
  wageDispersion: Param; // lognormal sigma of within-labour pay
  capitalParetoAlpha: Param; // Pareto exponent of capital ownership (lower ⇒ fatter top tail)

  // Fiscal / wedge layer (the P2 named policy levers).
  employerContribRate: Param; // employer social contributions as a share of gross wage
  employeeContribRate: Param; // employee social contributions as a share of gross wage
  taxLevel: Param; // multiplier on the progressive labour-tax schedule
  taxProgressivity: Param; // tilts the schedule: >1 steepens top brackets, <1 flattens
  capitalTaxRate: Param; // flat rate on capital income
  vatRate: Param; // value-added / consumption tax rate
  socialWageFraction: Param; // share of public budget delivered as in-kind services vs cash
  housingCostFraction: Param; // share of consumption spent on (VAT-exempt) housing

  // Savings rise with income → VAT is regressive on annual income.
  savingsRateBase: Param; // savings rate at the median
  savingsRateSlope: Param; // additional savings rate per unit of (income / median − 1)

  // Cash transfers (annual €, before means-testing — stylised flat amounts).
  transfers: {
    pension: Param;
    unemployment: Param;
    study: Param;
    child: Param;
  };
}
