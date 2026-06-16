<script lang="ts">
  import type { Decomposition } from '../../engine/types';

  let { decomposition, width = 760 }: { decomposition: Decomposition; width?: number } = $props();

  const KIND_COLOR: Record<string, string> = {
    gross: 'var(--labor)',
    tax: 'var(--tax)',
    transfer: 'var(--social)',
    social: 'var(--social)',
    housing: 'var(--capital)',
  };

  const rowH = 34;
  const gap = 8;
  const labelW = 220;
  const barArea = $derived(width - labelW - 90);

  // Build waterfall rows with running totals, plus a final capability total bar.
  const rows = $derived.by(() => {
    let running = 0;
    const out: { label: string; from: number; to: number; delta: number; color: string; total?: boolean }[] = [];
    for (const it of decomposition.items) {
      const from = running;
      running += it.delta;
      out.push({ label: it.label, from, to: running, delta: it.delta, color: KIND_COLOR[it.kind] });
    }
    out.push({ label: 'Real capability', from: 0, to: decomposition.capability, delta: decomposition.capability, color: 'var(--accent)', total: true });
    return out;
  });

  const xMax = $derived(Math.max(...rows.flatMap((r) => [r.from, r.to]), 1));
  const x = $derived((v: number) => (v / xMax) * barArea);
  const svgH = $derived(rows.length * (rowH + gap) + gap);

  const eur = (v: number) =>
    (v < 0 ? '−' : '') +
    '€' +
    new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.abs(v));
</script>

<svg viewBox="0 0 {width} {svgH}" class="waterfall" role="img" aria-label="Income decomposition waterfall">
  {#each rows as r, i}
    {@const y = gap + i * (rowH + gap)}
    {@const x0 = labelW + x(Math.min(r.from, r.to))}
    {@const w = Math.max(2, x(Math.abs(r.delta)))}
    <text x={labelW - 10} y={y + rowH / 2} text-anchor="end" dominant-baseline="middle" class="row-label">
      {r.label}
    </text>
    <rect x={x0} y={y} width={w} height={rowH} fill={r.color} rx="3" opacity={r.total ? 1 : 0.85} />
    <text x={x0 + w + 8} y={y + rowH / 2} dominant-baseline="middle" class="row-value">
      {r.delta < 0 ? '−' : '+'}{eur(Math.abs(r.delta)).replace('€', '€')}
    </text>
    {#if !r.total && i < rows.length - 1}
      <!-- connector to next running total -->
      <line x1={labelW + x(r.to)} y1={y + rowH} x2={labelW + x(r.to)} y2={y + rowH + gap} stroke="var(--line)" stroke-dasharray="2 2" />
    {/if}
  {/each}
</svg>

<style>
  .waterfall { width: 100%; height: auto; }
  .row-label { fill: var(--ink); font-size: 12px; font-family: system-ui, sans-serif; }
  .row-value { fill: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; font-family: system-ui, sans-serif; }
</style>
