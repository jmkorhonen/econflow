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
  // Technology / total-factor residual. The physical layer (below) supplies the rest of
  // the output multiplier; both are 1.0 at the Finland baseline.
  productivityMultiplier: param(0.6, 1.5, 'policy', {
    value: 1.0,
    note: 'Know-how / total factor productivity not captured by energy + infrastructure.',
    source: 'tfp-lit',
  }),
  physical: {
    primaryEnergyIndex: param(0.6, 1.4, 'policy', {
      value: 1.0,
      note: 'Total primary energy per capita, index (1.0 = today). Efficiency/sufficiency lowers it.',
      source: 'statfi-energy',
    }),
    // Total energy consumption 2023: renewables 42%; fossil+peat ≈ 38%, nuclear ≈ 20%.
    energyMix: {
      fossil: param(0.34, 0.42, 'empirical', { value: 0.38, unit: 'share', source: 'statfi-energy' }),
      nuclear: param(0.16, 0.22, 'empirical', { value: 0.2, unit: 'share', source: 'statfi-energy' }),
      renewable: param(0.4, 0.44, 'empirical', { value: 0.42, unit: 'share', source: 'statfi-energy' }),
    },
    // Society-wide EROI is contested; broad literature ranges, not point estimates.
    eroi: {
      fossil: param(10, 25, 'empirical', { value: 17, unit: 'ratio', source: 'eroi-lit' }),
      nuclear: param(8, 20, 'empirical', { value: 14, unit: 'ratio', source: 'eroi-lit' }),
      renewable: param(9, 22, 'empirical', { value: 15, unit: 'ratio', source: 'eroi-lit' }),
    },
    conversionEfficiency: param(0.3, 0.5, 'empirical', {
      value: 0.4,
      note: 'Useful work ÷ net primary energy (society-wide exergy efficiency).',
      source: 'exergy-lit',
    }),
    infrastructure: param(0.5, 1.5, 'policy', {
      value: 1.0,
      note: 'Social overhead capital (roads, grid, schools, courts), index. <1 = a less-built machine.',
      source: 'infra-lit',
    }),
    energyElasticity: param(0.3, 0.7, 'empirical', {
      value: 0.5,
      note: 'α: output elasticity wrt net useful energy.',
      source: 'energy-output-lit',
    }),
    infraElasticity: param(0.1, 0.4, 'empirical', {
      value: 0.25,
      note: 'β: output elasticity wrt public infrastructure (Aschauer-type).',
      source: 'infra-lit',
    }),
    emissionFactorFossil: param(2.3, 2.9, 'empirical', {
      value: 2.63,
      note: 'CO₂ per unit fossil primary energy; baseline emissions index ≈ 1.0 (~7 tCO₂/capita).',
      source: 'statfi-energy',
    }),
    materialIntensity: param(0.6, 1.4, 'policy', {
      value: 1.0,
      note: 'Material throughput per unit output, index. Efficiency/dematerialisation lowers it.',
      source: 'material-lit',
    }),
    recyclingRate: param(0.05, 0.4, 'policy', {
      value: 0.15,
      note: 'Share of throughput met from recycled stock (circular material use; Finland is low).',
      source: 'material-lit',
    }),
  },

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

  // --- Long-run dynamics (P4) ---
  dynamics: {
    growthRate: param(0.005, 0.025, 'empirical', {
      value: 0.015,
      unit: 'real per year',
      note: 'g — exogenous productivity growth. Concentration runs when wealth grows faster than g.',
      source: 'growth-lit',
    }),
    returnConcentration: param(1.0, 1.3, 'empirical', {
      value: 1.12,
      note: 'φ — returns to wealth rise super-proportionally (big fortunes earn higher r; Piketty r>g).',
      source: 'piketty',
    }),
    inheritanceTax: param(0.0, 0.6, 'policy', {
      value: 0.15,
      note: 'Estate tax at generational turnover; the main brake on hereditary wealth.',
      source: 'vero-inheritance',
    }),
    captureStrength: param(0.0, 1.0, 'policy', {
      value: 0.0,
      note: 'Political capture intensity. 0 = rules stay democratic; >0 = concentrated wealth tilts them toward capital. Contested — default off.',
      source: 'capture-lit',
    }),
  },
};
