// tests/engine.test.ts
import { describe, it, expect } from 'vitest';
import { runEconomy, evaluatePerson } from '../engine/economy';
import { FINLAND_BASELINE } from '../data/finland-baseline';
import { gini, topShare, median } from '../engine/metrics';
import { param, exact, midpoint } from '../engine/param';

describe('param', () => {
  it('defaults value to the midpoint of the range', () => {
    const p = param(0.5, 0.7, 'empirical');
    expect(p.value).toBeCloseTo(0.6);
    expect(midpoint(p)).toBeCloseTo(0.6);
  });
  it('respects an explicit value override', () => {
    const p = param(0.5, 0.7, 'policy', { value: 0.55 });
    expect(p.value).toBeCloseTo(0.55);
  });
  it('exact() produces a degenerate identity range', () => {
    const p = exact(42);
    expect(p.low).toBe(42);
    expect(p.high).toBe(42);
    expect(p.kind).toBe('identity');
  });
});

describe('metrics', () => {
  it('gini is 0 for perfect equality and ~1 for extreme concentration', () => {
    expect(gini([5, 5, 5, 5])).toBeCloseTo(0);
    expect(gini([0, 0, 0, 100])).toBeGreaterThan(0.7);
  });
  it('topShare returns the share held by the top fraction', () => {
    expect(topShare([1, 1, 1, 97], 0.25)).toBeCloseTo(0.97);
  });
  it('median handles even and odd lengths', () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe('runEconomy', () => {
  it('is deterministic for a given seed', () => {
    const a = runEconomy({ seed: 42 });
    const b = runEconomy({ seed: 42 });
    expect(a.years[0].metrics.gini).toBe(b.years[0].metrics.gini);
  });

  it('different seeds generally differ', () => {
    const a = runEconomy({ seed: 1 });
    const b = runEconomy({ seed: 2 });
    expect(a.years[0].metrics.gini).not.toBe(b.years[0].metrics.gini);
  });

  it('respects the accounting identity: compensation + capital sum to real output', () => {
    const { years } = runEconomy({ seed: 7 });
    const y = years[0];
    const factorSum = y.citizens.reduce((s, c) => s + c.totalLabourCost + c.capitalIncome, 0);
    expect(factorSum).toBeCloseTo(y.physical.realOutput, 1);
  });

  it('produces a Gini within [0, 1]', () => {
    const y = runEconomy({ seed: 3 }).years[0];
    expect(y.metrics.gini).toBeGreaterThanOrEqual(0);
    expect(y.metrics.gini).toBeLessThanOrEqual(1);
  });

  it('emits a money Sankey whose output splits into wages + capital', () => {
    const y = runEconomy({ seed: 5 }).years[0];
    const fromOutput = y.flows.money.filter((l) => l.source === 'Real output');
    const total = fromOutput.reduce((s, l) => s + l.value, 0);
    expect(total).toBeCloseTo(y.physical.realOutput, 2);
  });

  it('runs multiple years', () => {
    const r = runEconomy({ seed: 9, years: 5 });
    expect(r.years).toHaveLength(5);
    expect(r.years[4].year).toBe(2029);
  });

  it('redistribution lowers inequality: disposable Gini < market Gini', () => {
    const m = runEconomy({ seed: 11 }).years[0].metrics;
    expect(m.disposableGini).toBeGreaterThan(0.2);
    expect(m.disposableGini).toBeLessThan(0.55);
    expect(m.disposableGini).toBeLessThan(m.marketGini);
  });

  it('the representative waterfall reconstructs capability', () => {
    const d = runEconomy({ seed: 4 }).years[0].representative;
    const sum = d.items.reduce((s, it) => s + it.delta, 0);
    expect(sum).toBeCloseTo(d.capability, 2);
  });

  it('progressive tax: higher earners pay a higher effective income-tax rate', () => {
    const cs = runEconomy({ seed: 6 }).years[0].citizens.filter((c) => c.grossWage > 0);
    const rate = (c: (typeof cs)[number]) => c.incomeTax / c.grossWage;
    const sorted = [...cs].sort((a, b) => a.grossWage - b.grossWage);
    const low = rate(sorted[Math.floor(sorted.length * 0.1)]);
    const high = rate(sorted[Math.floor(sorted.length * 0.9)]);
    expect(high).toBeGreaterThan(low);
  });

  it('the social wage lifts everyone equally (in-kind, per capita)', () => {
    const cs = runEconomy({ seed: 8 }).years[0].citizens;
    const first = cs[0].socialWageReceived;
    expect(first).toBeGreaterThan(0);
    expect(cs.every((c) => Math.abs(c.socialWageReceived - first) < 1e-6)).toBe(true);
  });

  it('population scales to the configured N', () => {
    expect(runEconomy({ seed: 1 }).years[0].citizens.length).toBeGreaterThan(9000);
  });

  it('the wedge slices (excluding the returned social wage) reconstruct total labour cost', () => {
    const w = runEconomy({ seed: 5 }).years[0].wedge;
    const sum = w.slices.filter((s) => s.side !== 'returned').reduce((s, x) => s + x.amount, 0);
    expect(sum).toBeCloseTo(w.totalLabourCost, 1);
  });

  it('decile shares of capability sum to 1 and rise monotonically', () => {
    const d = runEconomy({ seed: 5 }).years[0].distribution.capability.deciles.shares;
    expect(d.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThanOrEqual(d[i - 1]);
  });

  it('percentile breakdown has 100 buckets summing to 1', () => {
    const p = runEconomy({ seed: 5 }).years[0].distribution.disposable.percentiles.shares;
    expect(p).toHaveLength(100);
    expect(p.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
  });

  it('decile edges are ascending and bound each decile', () => {
    const e = runEconomy({ seed: 5 }).years[0].distribution.disposable.deciles.edges;
    expect(e).toHaveLength(10);
    for (let i = 0; i < 10; i++) expect(e[i].hi).toBeGreaterThanOrEqual(e[i].lo);
    for (let i = 1; i < 10; i++) expect(e[i].lo).toBeGreaterThanOrEqual(e[i - 1].lo);
  });

  it('top fractiles nest: top 0.1% ≤ top 1% ≤ top 10%', () => {
    const d = runEconomy({ seed: 5 }).years[0].distribution.disposable;
    expect(d.top01).toBeLessThanOrEqual(d.top1);
    expect(d.top1).toBeLessThanOrEqual(d.top10);
    expect(d.bottom10).toBeLessThanOrEqual(0.1); // bottom decile holds less than an equal share
    expect(d.median).toBeGreaterThan(0);
  });

  it('evaluatePerson is consistent with the engine and ranks higher incomes higher', () => {
    const year = runEconomy({ seed: 5 }).years[0];
    const low = evaluatePerson(year, FINLAND_BASELINE, 25_000, 0);
    const high = evaluatePerson(year, FINLAND_BASELINE, 90_000, 40_000);
    // wedge reconstructs labour cost; capability is positive; ordering holds.
    const sum = low.wedge.slices.filter((s) => s.side !== 'returned').reduce((s, x) => s + x.amount, 0);
    expect(sum).toBeCloseTo(low.wedge.totalLabourCost, 1);
    expect(high.disposable).toBeGreaterThan(low.disposable);
    expect(high.decile).toBeGreaterThanOrEqual(low.decile);
    expect(high.percentile).toBeGreaterThan(low.percentile);
    expect(low.capability).toBeGreaterThan(0);
  });

  it('VAT is regressive on income: the bottom spends a larger income-share on VAT', () => {
    const cs = runEconomy({ seed: 5 }).years[0].citizens.filter((c) => c.disposable > 0);
    const sorted = [...cs].sort((a, b) => a.disposable - b.disposable);
    const lowBurden = sorted[Math.floor(sorted.length * 0.1)].vatPaid / sorted[Math.floor(sorted.length * 0.1)].disposable;
    const highBurden = sorted[Math.floor(sorted.length * 0.9)].vatPaid / sorted[Math.floor(sorted.length * 0.9)].disposable;
    expect(lowBurden).toBeGreaterThan(highBurden);
  });
});
