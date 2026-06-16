// data/finland-baseline.ts
// Finland-anchored baseline parameters. Every empirical/policy value carries a
// [low, high] range and a source key into sources.md. The operative value
// defaults to the midpoint. These are P0 placeholders with plausible ranges;
// P1 replaces the numbers with properly sourced figures (see sources.md TODOs).

import type { Params } from '../engine/types';
import { param } from '../engine/param';

export const FINLAND_BASELINE: Params = {
  population: 1000,

  // Stylized class shares (sum ≈ 1). Refined against Statistics Finland in P1.
  classShares: {
    worker: 0.34,
    professional: 0.16,
    small_business: 0.06,
    capital_owner: 0.02,
    retiree: 0.18,
    unemployed: 0.05,
    student: 0.07,
    child: 0.12,
  },

  // --- Physical layer (stub until P2) ---
  realOutput: param(250_000_000, 270_000_000, 'empirical', {
    unit: '€/year (notional, scaled)',
    source: 'TODO-gdp',
    note: 'Notional total real output for 1000 synthetic citizens; rescaled in P2.',
  }),
  energyMix: {
    fossil: param(0.33, 0.43, 'empirical', { unit: 'share', source: 'TODO-energy-mix' }),
    nuclear: param(0.2, 0.3, 'empirical', { unit: 'share', source: 'TODO-energy-mix' }),
    renewable: param(0.3, 0.42, 'empirical', { unit: 'share', source: 'TODO-energy-mix' }),
  },
  eroi: param(8, 14, 'empirical', { unit: 'ratio', source: 'TODO-eroi' }),

  // --- Distribution layer ---
  wageShare: param(0.55, 0.62, 'empirical', {
    unit: 'share of output to labor',
    source: 'TODO-wage-share',
  }),
  wageDispersion: param(0.3, 0.7, 'policy', {
    note: 'Lognormal sigma of within-labor pay; lower = more compressed (Nordic).',
    source: 'TODO-dispersion',
  }),

  // --- Fiscal layer ---
  avgTaxRate: param(0.3, 0.45, 'policy', {
    unit: 'effective average rate on factor income',
    source: 'TODO-tax-rate',
  }),
  socialWageFraction: param(0.4, 0.6, 'policy', {
    note: 'Fraction of tax revenue delivered as in-kind public services vs cash transfers.',
    source: 'TODO-social-wage',
  }),
  housingCostFraction: param(0.18, 0.3, 'empirical', {
    unit: 'share of disposable income',
    source: 'TODO-housing',
  }),
};
