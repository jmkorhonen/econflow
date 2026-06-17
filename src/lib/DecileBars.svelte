<script lang="ts">
  import type { Distribution } from '../../engine/types';

  let {
    distribution,
    userDecile = null,
    width = 760,
    height = 300,
  }: { distribution: Distribution; userDecile?: number | null; width?: number; height?: number } = $props();

  type Metric = 'market' | 'disposable' | 'capability';
  let metric = $state<Metric>('disposable');

  const LABEL: Record<Metric, string> = {
    market: 'Market income (before tax & transfers)',
    disposable: 'Disposable income (after tax & transfers)',
    capability: 'Real capability (consumption + public services)',
  };

  const breakdown = $derived(distribution[metric]);
  const shares = $derived(breakdown.shares);
  const edges = $derived(breakdown.edges);
  const maxShare = $derived(Math.max(...shares, distribution.top1, 0.15));

  const padL = 40;
  const padB = 40;
  const padR = 78; // room for the top-fractile zoom slivers
  const padT = 16;
  const plotW = $derived(width - padL - padR);
  const plotH = $derived(height - padB - padT);
  const band = $derived(plotW / 10);
  const bw = $derived(band * 0.72);
  const xs = $derived((i: number) => padL + (i + 0.5) * band);
  const y = $derived((s: number) => padT + plotH * (1 - s / maxShare));
  const baseY = $derived(padT + plotH);

  // Highlight the user's decile only when the displayed metric is the income decile.
  const highlight = $derived(metric === 'disposable' ? userDecile : null);

  // Top-fractile zoom slivers (subsets of D10): 1% normal-ish, 0.1% at 10% bar width.
  const sliverX1 = $derived(padL + plotW + 14);
  const sliverW1 = $derived(bw * 0.3);
  const sliverX01 = $derived(sliverX1 + sliverW1 + 8);
  const sliverW01 = $derived(bw * 0.1);

  const eur = (v: number) => '€' + new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const pct = (v: number) => (v * 100).toFixed(1) + '%';
</script>

<div class="decile">
  <div class="tabs">
    {#each ['market', 'disposable', 'capability'] as m}
      <button class:active={metric === m} onclick={() => (metric = m as Metric)}>{m}</button>
    {/each}
  </div>
  <p class="caption">{LABEL[metric]} — share of the total held by each tenth of the adult population</p>

  <svg viewBox="0 0 {width} {height}" role="img" aria-label="Distribution by decile">
    <!-- equality reference line at 10% -->
    <line x1={padL} y1={y(0.1)} x2={padL + plotW} y2={y(0.1)} stroke="var(--accent)" stroke-dasharray="4 3" opacity="0.6" />
    <text x={padL - 6} y={y(0.1) + 3} text-anchor="end" class="ref">10%</text>

    {#each shares as s, i}
      {@const isHi = highlight === i + 1}
      <g>
        <rect
          x={xs(i) - bw / 2}
          y={y(s)}
          width={bw}
          height={baseY - y(s)}
          rx="2"
          fill={i === 9 ? 'var(--capital)' : 'var(--labor)'}
          opacity={isHi ? 1 : 0.85}
          stroke={isHi ? 'var(--accent)' : 'none'}
          stroke-width={isHi ? 2.5 : 0}
        />
        <title>D{i + 1}: {eur(edges[i].lo)}–{eur(edges[i].hi)} · {pct(s)} of total{isHi ? ' · you are here' : ''}</title>
        <text x={xs(i)} y={y(s) - 5} text-anchor="middle" class="val">{(s * 100).toFixed(0)}</text>
        <text x={xs(i)} y={baseY + 15} text-anchor="middle" class="axis" font-weight={isHi ? 700 : 400} fill={isHi ? 'var(--accent)' : 'var(--muted)'}>D{i + 1}</text>
      </g>
    {/each}

    <!-- divider before the zoom slivers -->
    <line x1={padL + plotW + 6} y1={padT} x2={padL + plotW + 6} y2={baseY} stroke="var(--line)" />

    <rect x={sliverX1} y={y(distribution.top1)} width={sliverW1} height={baseY - y(distribution.top1)} fill="var(--capital)" opacity="0.9" />
    <title>Top 1%: {pct(distribution.top1)} of total (within D10)</title>
    <text x={sliverX1 + sliverW1 / 2} y={baseY + 15} text-anchor="middle" class="axis">1%</text>

    <rect x={sliverX01} y={y(distribution.top01)} width={sliverW01} height={baseY - y(distribution.top01)} fill="var(--tax)" opacity="0.95" />
    <text x={sliverX01 + sliverW01 / 2} y={baseY + 15} text-anchor="middle" class="axis">0.1%</text>

    <text x={padL + plotW + 16} y={baseY + 30} text-anchor="middle" class="zoomcap">↑ within D10</text>

    <!-- axis titles -->
    <text x={padL + plotW / 2} y={height - 4} text-anchor="middle" class="axistitle">Income decile (D1 = poorest → D10 = richest)</text>
    <text x={4} y={padT - 4} class="axistitle">% of total</text>
  </svg>

  <div class="tail">
    <span>Top 10%: <strong>{pct(distribution.top10)}</strong></span>
    <span>Top 1%: <strong>{pct(distribution.top1)}</strong></span>
    <span>Top 0.1%: <strong>{pct(distribution.top01)}</strong></span>
    <span class="hint">hover a bar for its € range</span>
  </div>
</div>

<style>
  .decile { width: 100%; }
  .tabs { display: flex; gap: 0.4rem; margin-bottom: 0.4rem; }
  .tabs button { background: var(--bg); color: var(--muted); border: 1px solid var(--line); border-radius: 6px; padding: 0.25rem 0.7rem; cursor: pointer; text-transform: capitalize; font-size: 0.8rem; }
  .tabs button.active { color: var(--ink); border-color: var(--accent); }
  .caption { color: var(--muted); font-size: 0.82rem; margin: 0 0 0.5rem; }
  svg { width: 100%; height: auto; }
  .axis { fill: var(--muted); font-size: 10px; font-family: system-ui, sans-serif; }
  .axistitle { fill: var(--muted); font-size: 10px; font-family: system-ui, sans-serif; }
  .val { fill: var(--ink); font-size: 9px; font-variant-numeric: tabular-nums; font-family: system-ui, sans-serif; }
  .ref { fill: var(--accent); font-size: 9px; font-family: system-ui, sans-serif; }
  .zoomcap { fill: var(--muted); font-size: 8.5px; font-family: system-ui, sans-serif; }
  .tail { display: flex; gap: 1.25rem; margin-top: 0.5rem; font-size: 0.85rem; color: var(--muted); flex-wrap: wrap; }
  .tail strong { color: var(--capital); font-variant-numeric: tabular-nums; }
  .tail .hint { font-style: italic; }
</style>
