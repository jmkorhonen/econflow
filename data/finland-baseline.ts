// data/finland-baseline.ts
// Finland-anchored baseline. Incomes are scaled to ~GDP-per-capita euros so the
// progressive tax brackets in fiscal.ts and the income waterfall read in real €.
// Every empirical/policy value carries a [low, high] range and a source key into
// sources.md. The operative value defaults to the midpoint.

import type { Params } from '../engine/types';
import { param } from '../engine/param';

export const FINLAND_BASELINE: Params = {
  population: 1000,

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

  // --- Physical layer (stub until P2) ---
  // Finland GDP ≈ €270 bn / 5.6 m ≈ €48k per capita; scaled to 1000 citizens.
  realOutput: param(46_000_000, 52_000_000, 'empirical', {
    unit: '€/year (GDP per capita × 1000)',
    source: 'statfi-gdp',
  }),
  energyMix: {
    // Total energy consumption 2023: renewables 42%; fossil+peat and nuclear make up the rest.
    fossil: param(0.34, 0.42, 'empirical', { unit: 'share', source: 'statfi-energy' }),
    nuclear: param(0.16, 0.22, 'empirical', { unit: 'share', source: 'statfi-energy' }),
    renewable: param(0.4, 0.44, 'empirical', { unit: 'share', source: 'statfi-energy' }),
  },
  eroi: param(8, 14, 'empirical', { unit: 'ratio', source: 'eroi-lit' }),

  // --- Distribution layer ---
  // Finnish adjusted labour share ≈ 0.57–0.60 of GDP; definition-sensitive, hence the range.
  wageShare: param(0.55, 0.61, 'empirical', {
    unit: 'share of output to labour',
    source: 'oecd-labour-share',
  }),
  wageDispersion: param(0.45, 0.75, 'policy', {
    note: 'Lognormal sigma of within-labour pay; lower = compressed (Nordic). Calibrated so disposable Gini ≈ 0.27–0.32.',
    source: 'oecd-earnings-disp',
  }),
  capitalDispersion: param(0.9, 1.4, 'empirical', {
    note: 'Capital ownership is far more concentrated than wages; drives the top wealth share.',
    source: 'statfi-wealth',
  }),

  // --- Fiscal layer ---
  taxLevel: param(0.9, 1.1, 'policy', {
    note: 'Multiplier on the progressive labour-tax schedule (1.0 ≈ current Finland). Lower = low-tax society.',
    source: 'oecd-tax',
  }),
  capitalTaxRate: param(0.3, 0.34, 'policy', {
    unit: 'flat rate on capital income',
    source: 'vero-capital',
  }),
  socialWageFraction: param(0.45, 0.6, 'policy', {
    note: 'Share of the public budget delivered as in-kind services (health, education, infrastructure) vs cash transfers.',
    source: 'oecd-socx',
  }),
  housingCostFraction: param(0.18, 0.26, 'empirical', {
    unit: 'share of disposable income',
    note: 'Mean housing-cost share; note Finland’s 40%-overburden rate is only ~2.6% (Eurostat 2023).',
    source: 'eurostat-housing',
  }),

  // --- Cash transfers (annual €, stylised flat amounts) ---
  transfers: {
    pension: param(16_000, 22_000, 'policy', { unit: '€/year', source: 'kela-pension' }),
    unemployment: param(8_000, 13_000, 'policy', { unit: '€/year', source: 'kela-unemp' }),
    study: param(4_000, 7_000, 'policy', { unit: '€/year', source: 'kela-study' }),
    child: param(1_400, 2_200, 'policy', { unit: '€/year', source: 'kela-child' }),
  },
};
