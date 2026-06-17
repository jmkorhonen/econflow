// data/finland-baseline.ts
// Finland-anchored baseline. Incomes are in real € (per-capita-output scaled) so the
// progressive tax brackets in fiscal.ts and the wedge read in real €. Every
// empirical/policy value carries a [low, high] range and a source key into sources.md.

import type { Params } from '../engine/types';
import { param } from '../engine/param';

export const FINLAND_BASELINE: Params = {
  population: 10_000,

  // Stylised class shares (sum ≈ 1). Refined against Statistics Finland later.
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

  // --- Productive substrate ---
  // Finland GDP ≈ €270 bn / 5.6 m ≈ €48k per capita.
  perCapitaOutput: param(46_000, 52_000, 'empirical', { unit: '€/capita/year', source: 'statfi-gdp' }),
  // 1.0 = today's Finland. The P3 physical layer and "what-if technology/infrastructure"
  // counterfactual drive this; it scales the whole pie without touching distribution.
  productivityMultiplier: param(0.5, 1.5, 'policy', {
    value: 1.0,
    note: 'Tech + infrastructure regime. <1 = a less-built machine (smaller, more concentrated pie).',
    source: 'tfp-lit',
  }),
  energyMix: {
    fossil: param(0.34, 0.42, 'empirical', { unit: 'share', source: 'statfi-energy' }),
    nuclear: param(0.16, 0.22, 'empirical', { unit: 'share', source: 'statfi-energy' }),
    renewable: param(0.4, 0.44, 'empirical', { unit: 'share', source: 'statfi-energy' }),
  },
  eroi: param(8, 14, 'empirical', { unit: 'ratio', source: 'eroi-lit' }),

  // --- Distribution layer ---
  wageShare: param(0.55, 0.61, 'empirical', { unit: 'labour share of output', source: 'oecd-labour-share' }),
  wageDispersion: param(0.45, 0.75, 'policy', {
    note: 'Lognormal sigma of within-labour pay; lower = compressed (Nordic).',
    source: 'oecd-earnings-disp',
  }),
  capitalParetoAlpha: param(1.4, 2.2, 'empirical', {
    note: 'Pareto exponent of capital ownership; lower ⇒ fatter top tail. ~1.5 ≈ observed wealth concentration.',
    source: 'statfi-wealth',
  }),

  // --- Fiscal / wedge layer (the P2 named policy levers) ---
  employerContribRate: param(0.18, 0.24, 'policy', {
    unit: 'share of gross wage',
    note: 'Finnish employer social contributions (TyEL pension + others) ≈ 20% on top of gross.',
    source: 'vero-contrib',
  }),
  employeeContribRate: param(0.08, 0.12, 'policy', {
    unit: 'share of gross wage',
    note: 'Employee pension + unemployment + health contributions ≈ 10%.',
    source: 'vero-contrib',
  }),
  taxLevel: param(0.85, 1.15, 'policy', {
    note: 'Multiplier on the progressive labour-tax schedule (1.0 ≈ current Finland).',
    source: 'oecd-tax',
  }),
  taxProgressivity: param(0.6, 1.6, 'policy', {
    value: 1.0,
    note: '>1 steepens top brackets; <1 flattens toward a flat tax.',
    source: 'oecd-tax',
  }),
  capitalTaxRate: param(0.3, 0.34, 'policy', { unit: 'flat rate on capital income', source: 'vero-capital' }),
  vatRate: param(0.22, 0.27, 'policy', {
    unit: 'consumption tax rate',
    note: 'Finnish standard VAT 25.5% (2024); reduced rates on food/housing not modelled separately.',
    source: 'vero-vat',
  }),
  socialWageFraction: param(0.45, 0.6, 'policy', {
    note: 'Share of the public budget delivered as in-kind services vs cash transfers.',
    source: 'oecd-socx',
  }),
  housingCostFraction: param(0.2, 0.3, 'empirical', {
    unit: 'share of consumption spent on (VAT-exempt) housing',
    source: 'eurostat-housing',
  }),

  // --- Savings (rise with income → VAT is regressive on annual income) ---
  savingsRateBase: param(0.05, 0.12, 'empirical', {
    note: 'Savings rate at the median household.',
    source: 'statfi-savings',
  }),
  savingsRateSlope: param(0.1, 0.25, 'empirical', {
    note: 'Extra savings rate per unit of (income / median − 1); positive ⇒ the rich save more.',
    source: 'statfi-savings',
  }),

  // --- Cash transfers (annual €, stylised flat amounts) ---
  transfers: {
    pension: param(16_000, 22_000, 'policy', { unit: '€/year', source: 'kela-pension' }),
    unemployment: param(8_000, 13_000, 'policy', { unit: '€/year', source: 'kela-unemp' }),
    study: param(4_000, 7_000, 'policy', { unit: '€/year', source: 'kela-study' }),
    child: param(1_400, 2_200, 'policy', { unit: '€/year', source: 'kela-child' }),
  },
};
