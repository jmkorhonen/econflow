<script lang="ts">
  interface Series {
    label: string;
    color: string;
    points: number[]; // one value per year (index 0 = start)
    dash?: boolean;
  }

  let {
    series,
    years,
    format = 'pct',
    width = 760,
    height = 280,
  }: { series: Series[]; years: number; format?: 'pct' | 'eur'; width?: number; height?: number } = $props();

  const padL = 54;
  const padR = 12;
  const padT = 16;
  const padB = 30;
  const plotW = $derived(width - padL - padR);
  const plotH = $derived(height - padT - padB);

  const yMax = $derived(Math.max(...series.flatMap((s) => s.points), format === 'pct' ? 0.1 : 1) * 1.1);
  const x = $derived((t: number) => padL + (t / Math.max(1, years)) * plotW);
  const y = $derived((v: number) => padT + plotH * (1 - v / yMax));

  const path = $derived((pts: number[]) => pts.map((v, t) => `${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' '));

  const fmt = (v: number) =>
    format === 'pct'
      ? (v * 100).toFixed(0) + '%'
      : '€' + new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

  const yTicks = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax));
  const xTicks = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * years)));
</script>

<svg viewBox="0 0 {width} {height}" role="img" aria-label="Trajectory over time">
  {#each yTicks as t}
    <line x1={padL} y1={y(t)} x2={padL + plotW} y2={y(t)} stroke="var(--line)" opacity="0.5" />
    <text x={padL - 6} y={y(t) + 3} text-anchor="end" class="tick">{fmt(t)}</text>
  {/each}
  {#each xTicks as t}
    <text x={x(t)} y={height - 8} text-anchor="middle" class="tick">+{t}y</text>
  {/each}

  {#each series as s}
    <path d={path(s.points)} fill="none" stroke={s.color} stroke-width="2.5" stroke-dasharray={s.dash ? '5 4' : 'none'} />
  {/each}
</svg>

<div class="legend">
  {#each series as s}
    <span><span class="swatch" style="background:{s.color}"></span>{s.label}</span>
  {/each}
</div>

<style>
  svg { width: 100%; height: auto; }
  .tick { fill: var(--muted); font-size: 10px; font-family: system-ui, sans-serif; font-variant-numeric: tabular-nums; }
  .legend { display: flex; flex-wrap: wrap; gap: 0.5rem 1.1rem; font-size: 0.8rem; color: var(--muted); margin-top: 0.4rem; }
  .legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
  .swatch { width: 14px; height: 3px; border-radius: 2px; display: inline-block; }
</style>
