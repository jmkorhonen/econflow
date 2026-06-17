// engine/dynamics.ts
// The long run. A persistent population accumulates wealth over decades:
//   - labour income is tied to each person's fixed merit rank (so it persists);
//   - capital income is the capital share of output, allocated ∝ wealth^φ — big
//     fortunes earn super-proportional returns (Piketty's r > g);
//   - the rich save a larger share, so wealth concentrates;
//   - every generation, inheritance passes wealth on, taxed at inheritanceTax
//     (the brake), the proceeds redistributed equally (social inheritance);
//   - if captureStrength > 0, the top decile's wealth tilts the rules toward
//     capital (lower wage share, capital tax, inheritance tax) — the loop that
//     turns inequality self-reinforcing. Set capture to 0 and it stays put.
//
// This is a separate path from the single-year model (capital here comes from
// accumulated wealth, not a fresh Pareto draw); it reuses the fiscal functions.

import type { DynamicsOptions, DynamicsParams, DynamicsResult, DynSnapshot, Params } from './types';
import { computePhysical } from './physical';
import { labourTax, capitalTax } from './fiscal';
import { gini, median } from './metrics';
import { topFractileShare } from './aggregate';
import { makeRng } from './rng';

const POP = 2000; // dynamics population (smaller than the static 10k, for snappy multi-decade runs)
const GENERATION = 30; // years between inheritance events
const OLIGARCHY_THRESHOLD = 0.7; // top-10% wealth share that counts as "runaway"

interface Agent {
  meritRank: number; // fixed in [0,1] → persistent labour-earning potential
  labourWeight: number; // derived from merit + class, fixed
  wealth: number;
}

export function runDynamics(base: Params, opts: DynamicsOptions = {}): DynamicsResult {
  const years = opts.years ?? 60;
  const rng = makeRng((opts.seed ?? 1) * 2654435761);

  // Mutable copy of the levers the capture loop is allowed to move.
  const d: DynamicsParams = base.dynamics;
  let wageShare = base.wageShare.value;
  let capitalTaxRate = base.capitalTaxRate.value;
  let inheritanceTax = opts.inheritanceTax ?? d.inheritanceTax.value;
  let taxProgressivity = base.taxProgressivity.value;
  const captureStrength = opts.captureStrength ?? d.captureStrength.value;
  const phi = d.returnConcentration.value;
  const g = d.growthRate.value;

  // Year-0 output and a Pareto-seeded initial wealth distribution.
  const baseOutput = computePhysical(base).realOutput * (POP / base.population);
  const alpha = Math.max(1.05, base.capitalParetoAlpha.value);

  const agents: Agent[] = [];
  let weightTotal = 0;
  for (let i = 0; i < POP; i++) {
    const meritRank = rng();
    // Labour weight: spread around 1 by merit (persistent, no annual redraw).
    const labourWeight = 0.3 + 1.7 * meritRank;
    // Initial wealth ~ Pareto, so there is starting inequality to evolve.
    const w = Math.pow(Math.max(rng(), 1e-12), -1 / alpha);
    agents.push({ meritRank, labourWeight, wealth: w });
    weightTotal += labourWeight;
  }
  // Normalise initial wealth to a few years of output (a plausible wealth/income ratio).
  const w0 = agents.reduce((s, a) => s + a.wealth, 0);
  const targetWealth = baseOutput * 4;
  for (const a of agents) a.wealth *= targetWealth / w0;

  const snapshots: DynSnapshot[] = [];
  let oligarchic = false;

  for (let t = 0; t <= years; t++) {
    const output = baseOutput * Math.pow(1 + g, t);
    const labourPool = output * wageShare;
    const capitalPool = output - labourPool;

    // Capital allocation ∝ wealth^φ (super-proportional returns to large fortunes).
    let cwTotal = 0;
    const cw = agents.map((a) => {
      const x = Math.pow(Math.max(0, a.wealth), phi);
      cwTotal += x;
      return x;
    });

    const disposables: number[] = [];
    const capabilities: number[] = [];

    // First pass: incomes, taxes → public budget.
    let budget = 0;
    const rows = agents.map((a, i) => {
      const totalLabourCost = labourPool * (a.labourWeight / weightTotal);
      const capitalIncome = cwTotal > 0 ? capitalPool * (cw[i] / cwTotal) : 0;
      const grossWage = totalLabourCost / (1 + base.employerContribRate.value);
      const employerContrib = totalLabourCost - grossWage;
      const employeeContrib = grossWage * base.employeeContribRate.value;
      const incomeTax = labourTax(grossWage - employeeContrib, base.taxLevel.value, taxProgressivity);
      const capTax = capitalTax(capitalIncome, capitalTaxRate);
      budget += employerContrib + employeeContrib + incomeTax + capTax;
      const disposable = grossWage - employeeContrib - incomeTax + capitalIncome - capTax;
      return { a, capitalIncome, disposable };
    });

    const medDisp = median(rows.map((r) => r.disposable).filter((v) => v > 0)) || 1;
    const socialWage = (budget * base.socialWageFraction.value) / POP;

    // Second pass: savings (rise with income) → wealth; capability.
    for (const r of rows) {
      const rel = r.disposable / medDisp - 1;
      const sRate = clamp(base.savingsRateBase.value + base.savingsRateSlope.value * rel, 0, 0.6);
      const spendable = Math.max(0, r.disposable);
      const savings = spendable * sRate;
      const expenditure = spendable - savings;
      const vat = expenditure * (base.vatRate.value / (1 + base.vatRate.value));
      r.a.wealth = Math.max(0, r.a.wealth + savings);
      disposables.push(Math.max(0, r.disposable));
      capabilities.push(expenditure - vat + socialWage);
    }

    const wealths = agents.map((a) => a.wealth);
    const top10 = topFractileShare(wealths, 0.1);
    const snap: DynSnapshot = {
      year: t,
      disposableGini: gini(disposables),
      top1Wealth: topFractileShare(wealths, 0.01),
      top10Wealth: top10,
      bottom50Wealth: bottomShare(wealths, 0.5),
      medianCapability: median(capabilities),
      output,
      wageShare,
      capitalTaxRate,
      inheritanceTax,
    };
    snapshots.push(snap);
    if (top10 > OLIGARCHY_THRESHOLD) oligarchic = true;

    // Generational inheritance: tax estates, redistribute the proceeds equally.
    if (t > 0 && t % GENERATION === 0 && inheritanceTax > 0) {
      let pot = 0;
      for (const a of agents) {
        const taxed = a.wealth * inheritanceTax;
        a.wealth -= taxed;
        pot += taxed;
      }
      const perHead = pot / POP;
      for (const a of agents) a.wealth += perHead;
    }

    // Political capture: the top decile's excess wealth tilts the rules toward capital.
    if (captureStrength > 0) {
      const influence = Math.max(0, top10 - 0.1) * captureStrength;
      wageShare = clamp(wageShare - influence * 0.08, 0.4, 0.65);
      capitalTaxRate = clamp(capitalTaxRate - influence * 0.12, 0, 0.4);
      inheritanceTax = clamp(inheritanceTax - influence * 0.2, 0, 0.6);
      taxProgressivity = clamp(taxProgressivity - influence * 0.2, 0.5, 1.6);
    }
  }

  return { snapshots, oligarchic };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function bottomShare(values: number[], fraction: number): number {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const n = xs.length;
  if (n === 0) return 0;
  const total = xs.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  const k = Math.max(1, Math.round(n * fraction));
  let bottom = 0;
  for (let i = 0; i < k; i++) bottom += xs[i];
  return bottom / total;
}
