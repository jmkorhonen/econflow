<script lang="ts">
  import type { Distribution } from '../../engine/types';

  let { distribution, width = 760, height = 260 }: { distribution: Distribution; width?: number; height?: number } = $props();

  type Metric = 'market' | 'disposable' | 'capability';
  let metric = $state<Metric>('disposable');

  const LABEL: Record<Metric, string> = {
    market: 'Market income (before tax & transfers)',
    disposable: 'Disposable income (after tax & transfers)',
    capability: 'Real capability (consumption + public services)',
  };

  const shares = $derived(distribution[metric]);
  const evenShare = 0.1; // a perfectly equal society: every decile gets 10%
  const maxShare = $derived(Math.max(...shares, 0.2));

  const padL = 36;
  const padB = 28;
  const plotW = $derived(width - padL - 8);
  const plotH = $derived(height - padB - 8);
  const bw = $derived((plotW / 10) * 0.74);
  const xs = $derived((i: number) => padL + (i + 0.5) * (plotW / 10));
  const y = $derived((s: number) => 8 + plotH * (1 - s / maxShare));

  const pct = (v: number) => (v * 100).toFixed(1) + '%';
</script>

<div class="decile">
  <div class="tabs">
    {#each ['market', 'disposable', 'capability'] as m}
      <button class:active={metric === m} onclick={() => (metric = m as Metric)}>{m}</button>
    {/each}
  </div>
  <p class="caption">{LABEL[metric]} — share of the total captured by each population decile</p>

  <svg viewBox="0 0 {width} {height}" role="img" aria-label="Distribution by decile">
    <!-- equality reference line at 10% -->
    <line x1={padL} y1={y(evenShare)} x2={width - 8} y2={y(evenShare)} stroke="var(--line)" stroke-dasharray="4 3" />
    <text x={width - 10} y={y(evenShare) - 4} text-anchor="end" class="ref">equal share (10%)</text>

    {#each shares as s, i}
      <rect x={xs(i) - bw / 2} y={y(s)} width={bw} height={8 + plotH - y(s)} rx="2"
        fill={i >= 9 ? 'var(--capital)' : 'var(--labor)'} opacity="0.9" />
      <text x={xs(i)} y={height - padB + 16} text-anchor="middle" class="axis">D{i + 1}</text>
    {/each}
  </svg>

  <div class="tail">
    <span>Top 10%: <strong>{pct(distribution.top10)}</strong></span>
    <span>Top 1%: <strong>{pct(distribution.top1)}</strong></span>
    <span>Top 0.1%: <strong>{pct(distribution.top01)}</strong></span>
  </div>
</div>

<style>
  .decile { width: 100%; }
  .tabs { display: flex; gap: 0.4rem; margin-bottom: 0.4rem; }
  .tabs button { background: var(--panel); color: var(--muted); border: 1px solid var(--line); border-radius: 6px; padding: 0.25rem 0.7rem; cursor: pointer; text-transform: capitalize; font-size: 0.8rem; }
  .tabs button.active { color: var(--ink); border-color: var(--accent); }
  .caption { color: var(--muted); font-size: 0.82rem; margin: 0 0 0.5rem; }
  svg { width: 100%; height: auto; }
  .axis { fill: var(--muted); font-size: 10px; font-family: system-ui, sans-serif; }
  .ref { fill: var(--muted); font-size: 9px; font-family: system-ui, sans-serif; }
  .tail { display: flex; gap: 1.25rem; margin-top: 0.5rem; font-size: 0.85rem; color: var(--muted); }
  .tail strong { color: var(--capital); font-variant-numeric: tabular-nums; }
</style>
