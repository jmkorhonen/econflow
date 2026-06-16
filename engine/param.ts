// engine/param.ts
// Constructors and helpers for range-carrying parameters.

import type { Param, ParamKind } from './types';

/**
 * Build a Param from its range. The operative value defaults to the midpoint
 * unless an explicit `value` is supplied in opts — so a deterministic
 * midpoint run and a future Monte-Carlo run share one data structure.
 */
export function param(
  low: number,
  high: number,
  kind: ParamKind,
  opts: { value?: number; unit?: string; source?: string; note?: string } = {},
): Param {
  const { value, ...rest } = opts;
  return {
    low,
    high,
    kind,
    value: value ?? (low + high) / 2,
    ...rest,
  };
}

/** A known exact value carries a degenerate range and the `identity` kind. */
export function exact(value: number, opts: { unit?: string; note?: string } = {}): Param {
  return { low: value, high: value, value, kind: 'identity', ...opts };
}

export function midpoint(p: Param): number {
  return (p.low + p.high) / 2;
}

/** Linearly position a draw within a Param's range. t=0 → low, t=1 → high. */
export function atFraction(p: Param, t: number): number {
  return p.low + (p.high - p.low) * t;
}
