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
  laborIncome: number;
  capitalIncome: number;
  transfers: number;
  taxesPaid: number;
  /** Value of in-kind public services received (the "social wage"). */
  socialWageReceived: number;
  housingCost: number;
  wealth: number;
  /** Headline metric: disposable income + social wage − housing cost. */
  capability: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface PhysicalState {
  /** Primary energy by source, in arbitrary energy units. */
  primaryEnergy: Record<string, number>;
  /** Energy return on energy invested. */
  eroi: number;
  usefulWork: number;
  materialThroughput: number;
  emissions: number;
  /** Real output of the physical economy (the "pie" before any rules). */
  realOutput: number;
}

export interface Metrics {
  gini: number;
  top1WealthShare: number;
  top10WealthShare: number;
  medianCapability: number;
}

export interface YearState {
  year: number;
  physical: PhysicalState;
  flows: { money: SankeyLink[]; physical: SankeyLink[] };
  citizens: Citizen[];
  metrics: Metrics;
}

export interface SimResult {
  years: YearState[];
  seed: number;
}

/**
 * The full parameter set the engine consumes. Empirical/policy entries are
 * Params (carrying ranges + sources); structural counts are plain numbers.
 */
export interface Params {
  population: number;
  classShares: Record<CitizenClass, number>;

  // Physical layer (stubbed in P0, fleshed out in P2).
  realOutput: Param; // total annual real output, €
  energyMix: Record<string, Param>; // shares by source, should sum to ~1
  eroi: Param;

  // Distribution layer.
  wageShare: Param; // fraction of output flowing to labor
  wageDispersion: Param; // spread of within-labor pay (lognormal sigma-ish)

  // Fiscal layer (flat stub in P0; progressive in P1).
  avgTaxRate: Param;
  socialWageFraction: Param; // fraction of tax revenue returned as in-kind services
  housingCostFraction: Param; // share of disposable income spent on housing
}
