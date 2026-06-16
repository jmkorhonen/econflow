// tests/engine.test.ts
import { describe, it, expect } from 'vitest';
import { runEconomy } from '../engine/economy';
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

  it('respects the accounting identity: factor incomes sum to real output', () => {
    const { years } = runEconomy({ seed: 7 });
    const y = years[0];
    const factorSum = y.citizens.reduce((s, c) => s + c.laborIncome + c.capitalIncome, 0);
    expect(factorSum).toBeCloseTo(y.physical.realOutput, 2);
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

  it('progressive tax: higher earners pay a higher effective rate', () => {
    const cs = runEconomy({ seed: 6 }).years[0].citizens.filter((c) => c.laborIncome > 0);
    const rate = (c: (typeof cs)[number]) => c.taxesPaid / (c.laborIncome + c.capitalIncome);
    const sorted = [...cs].sort((a, b) => a.laborIncome - b.laborIncome);
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
});
