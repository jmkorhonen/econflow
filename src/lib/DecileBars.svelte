<script lang="ts">
  import type { Distribution } from '../../engine/types';

  let {
    distribution,
    userDecile = null,
    userPercentile = null,
    width = 760,
    height = 300,
  }: {
    distribution: Distribution;
    userDecile?: number | null;
    userPercentile?: number | null;
    width?: number;
    height?: number;
  } = $props();

  type Metric = 'market' | 'disposable' | 'capability';
  type View = 'decile' | 'percentile';
  let metric = $state<Metric>('disposable');
  let view = $state<View>('decile');

  const LABEL: Record<Metric, string> = {
    market: 'Market income (before tax & transfers)',
    disposable: 'Disposable income (after tax & transfers)',
    capability: 'Real capability (consumption + public services)',
  };

  const md = $derived(distribution[metric]);
  const bucket = $derived(view === 'decile' ? md.deciles : md.percentiles);
  const n = $derived(bucket.shares.length);
  const equalShare = $derived(1 / n);
  const maxShare = $derived(Math.max(...bucket.shares, equalShare * 1.2));

  const padL = 46;
  const padR = 12;
  const padB = 42;
  const padT = 18;
  const plotW = $derived(width - padL - padR);
  const plotH = $derived(height - padB - padT);
  const band = $derived(plotW / n);
  const bw = $derived(view === 'decile' ? band * 0.72 : band * 0.86);
  const xs = $derived((i: number) => padL + (i + 0.5) * band);
  const y = $derived((s: number) => padT + plotH * (1 - s / maxShare));
  const baseY = $derived(padT + plotH);

  // The "Your income" marker — only meaningful on the disposable tab (where the
  // person's percentile is defined). Positioned by exact percentile.
  const showYou = $derived(metric === 'disposable' && userPercentile != null);
  const youX = $derived(padL + ((userPercentile ?? 0) / 100) * plotW);

  // Decile group outlines in percentile view (every 10 percentiles = one decile).
  const groups = $derived(view === 'percentile' ? Array.from({ length: 10 }, (_, g) => g) : []);

  // Top-tail zoom-box scaling.
  const tmax = $derived(Math.max(md.top1, 0.02));
  const ty = $derived((v: number) => 8 + 40 * (1 - v / tmax));

  const eur = (v: number) => '€' + new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const pct1 = (v: number) => (v * 100).toFixed(1) + '%';
</script>

<div class="decile">
  <div class="controls">
    <div class="tabs">
      {#each ['market', 'disposable', 'capability'] as m}
        <button class:active={metric === m} onclick={() => (metric = m as Metric)}>{m}</button>
      {/each}
    </div>
    <div class="tabs">
      <button class:active={view === 'decile'} onclick={() => (view = 'decile')}>deciles</button>
      <button class:active={view === 'percentile'} onclick={() => (view = 'percentile')}>percentiles</button>
    </div>
  </div>
  <p class="caption">{LABEL[metric]} — share of the total held by each {view === 'decile' ? 'tenth' : 'hundredth'} of the adult population</p>

  <svg viewBox="0 0 {width} {height}" role="img" aria-label="Distribution by {view}">
    <!-- equality reference line -->
    <line x1={padL} y1={y(equalShare)} x2={padL + plotW} y2={y(equalShare)} stroke="var(--accent)" stroke-dasharray="4 3" opacity="0.7" />
    <text x={padL + 2} y={y(equalShare) - 4} class="ref">{pct1(equalShare)} — if distribution were equal</text>

    <!-- decile group outlines (percentile view only) -->
    {#each groups as g}
      <rect x={padL + g * band * 10} y={padT} width={band * 10} height={plotH} fill="none" stroke="var(--line)" />
      <text x={padL + (g + 0.5) * band * 10} y={baseY + 15} text-anchor="middle" class="axis">D{g + 1}</text>
    {/each}

    {#each bucket.shares as s, i}
      {@const isHi = view === 'decile' && metric === 'disposable' && userDecile === i + 1}
      <rect x={xs(i) - bw / 2} y={y(s)} width={bw} height={baseY - y(s)} rx={view === 'decile' ? 2 : 0} fill="var(--labor)" opacity={isHi ? 1 : 0.82} />
      <title>{view === 'decile' ? 'D' : 'P'}{i + 1}: {eur(bucket.edges[i].lo)}–{eur(bucket.edges[i].hi)} · {pct1(s)} of total</title>
      {#if view === 'decile'}
        <text x={xs(i)} y={y(s) - 5} text-anchor="middle" class="val">{pct1(s)}</text>
        <text x={xs(i)} y={baseY + 15} text-anchor="middle" class="axis" font-weight={isHi ? 700 : 400} fill={isHi ? 'var(--accent)' : 'var(--muted)'}>D{i + 1}</text>
      {/if}
    {/each}

    <!-- your-income marker -->
    {#if showYou}
      <line x1={youX} y1={padT - 6} x2={youX} y2={baseY} stroke="var(--accent)" stroke-width="2" />
      <text x={Math.min(youX, padL + plotW - 4)} y={padT - 9} text-anchor={youX > padL + plotW - 70 ? 'end' : 'middle'} class="youlbl">Your income</text>
    {/if}

    <!-- axis titles -->
    <text x={padL + plotW / 2} y={height - 4} text-anchor="middle" class="axistitle">Income {view} (poorest → richest)</text>
    <text x={4} y={padT - 6} class="axistitle">% of total</text>
  </svg>

  <!-- separate top-tail zoom box -->
  <div class="tailbox">
    <span class="tailtitle">within the top decile (zoom)</span>
    <svg viewBox="0 0 220 70" role="img" aria-label="Top fractiles">
      <rect x={40} y={ty(md.top1)} width={26} height={48 - ty(md.top1)} fill="var(--capital)" opacity="0.9" />
      <text x={53} y={ty(md.top1) - 4} text-anchor="middle" class="tval">{pct1(md.top1)}</text>
      <text x={53} y={64} text-anchor="middle" class="tlbl">top 1%</text>
      <rect x={150} y={ty(md.top01)} width={9} height={48 - ty(md.top01)} fill="var(--tax)" opacity="0.95" />
      <text x={154} y={ty(md.top01) - 4} text-anchor="middle" class="tval">{pct1(md.top01)}</text>
      <text x={154} y={64} text-anchor="middle" class="tlbl">top 0.1%</text>
    </svg>
  </div>

  <div class="summary">
    <span>Bottom 10%: <strong>{pct1(md.bottom10)}</strong></span>
    <span>Median: <strong>{eur(md.median)}</strong></span>
    <span>Top 10%: <strong>{pct1(md.top10)}</strong></span>
    <span>Top 1%: <strong>{pct1(md.top1)}</strong></span>
    <span>Top 0.1%: <strong>{pct1(md.top01)}</strong></span>
    <span class="hint">hover a bar for its € range</span>
  </div>
</div>

<style>
  .decile { width: 100%; }
  .controls { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem; }
  .tabs { display: flex; gap: 0.4rem; }
  .tabs button { background: var(--bg); color: var(--muted); border: 1px solid var(--line); border-radius: 6px; padding: 0.25rem 0.7rem; cursor: pointer; text-transform: capitalize; font-size: 0.8rem; }
  .tabs button.active { color: var(--ink); border-color: var(--accent); }
  .caption { color: var(--muted); font-size: 0.82rem; margin: 0 0 0.5rem; }
  svg { width: 100%; height: auto; }
  .axis { fill: var(--muted); font-size: 10px; font-family: system-ui, sans-serif; }
  .axistitle { fill: var(--muted); font-size: 10px; font-family: system-ui, sans-serif; }
  .val { fill: var(--ink); font-size: 9px; font-variant-numeric: tabular-nums; font-family: system-ui, sans-serif; }
  .ref { fill: var(--accent); font-size: 9.5px; font-family: system-ui, sans-serif; }
  .youlbl { fill: var(--accent); font-size: 10px; font-weight: 600; font-family: system-ui, sans-serif; }

  .tailbox { margin-top: 0.8rem; border: 1px dashed var(--line); border-radius: 10px; padding: 0.4rem 0.75rem; display: inline-flex; align-items: center; gap: 1rem; font-style: italic; }
  .tailtitle { color: var(--muted); font-size: 0.78rem; font-style: italic; }
  .tailbox svg { width: 220px; }
  .tval { fill: var(--ink); font-size: 9px; font-style: italic; font-variant-numeric: tabular-nums; font-family: system-ui, sans-serif; }
  .tlbl { fill: var(--muted); font-size: 9px; font-style: italic; font-family: system-ui, sans-serif; }

  .summary { display: flex; gap: 1.25rem; margin-top: 0.7rem; font-size: 0.85rem; color: var(--muted); flex-wrap: wrap; }
  .summary strong { color: var(--ink); font-variant-numeric: tabular-nums; }
  .summary .hint { font-style: italic; }
</style>
