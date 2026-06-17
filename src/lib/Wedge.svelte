<script lang="ts">
  import type { Wedge } from '../../engine/types';

  let { wedge, width = 760 }: { wedge: Wedge; width?: number } = $props();

  const amt = (kind: string) => wedge.slices.find((s) => s.kind === kind)?.amount ?? 0;
  const savings = $derived(amt('savings'));
  const vat = $derived(amt('vat'));
  const realConsumption = $derived(amt('take_home'));
  const social = $derived(amt('social_wage'));
  const LST = $derived(wedge.labourSideTake);
  const TLC = $derived(wedge.totalLabourCost);

  // The relabel control: phi = share of the labour-side take *labelled* as employer
  // contribution (above the gross-wage line) vs income tax (below it). Pure labelling —
  // take-home, real consumption and the public budget are invariant by construction.
  const realPhi = $derived(LST > 0 ? (wedge.slices.find((s) => s.kind === 'employer_contrib')?.amount ?? 0) / LST : 0);
  let phi = $state<number | null>(null);
  const effPhi = $derived(phi ?? realPhi);

  const employerLabelled = $derived(effPhi * LST);
  const belowGrossLabelled = $derived((1 - effPhi) * LST);
  const grossWage = $derived(TLC - employerLabelled);
  const incomeTaxRate = $derived(grossWage > 0 ? belowGrossLabelled / grossWage : 0);

  const segments = $derived([
    { label: 'Employer contributions', value: employerLabelled, color: 'var(--public)' },
    { label: 'Income tax + employee contributions', value: belowGrossLabelled, color: 'var(--tax)' },
    { label: 'Savings → wealth', value: savings, color: 'var(--muted)' },
    { label: 'VAT', value: vat, color: 'var(--capital)' },
    { label: 'Real consumption (take-home)', value: realConsumption, color: 'var(--labor)' },
  ]);

  const scaleMax = $derived(TLC + social || 1);
  const x = $derived((v: number) => (v / scaleMax) * width);
  const barH = 46;
  const grossLineX = $derived(x(employerLabelled));

  const eur = (v: number) => '€' + new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const pct = (v: number) => (v * 100).toFixed(0) + '%';
</script>

<div class="wedge">
  <svg viewBox="0 0 {width} {barH + 54}" role="img" aria-label="Tax wedge from labour cost to capability">
    {#each segments as seg, i}
      {@const x0 = x(segments.slice(0, i).reduce((s, g) => s + g.value, 0))}
      {@const w = x(seg.value)}
      {#if seg.value > 0}
        <rect x={x0} y={24} width={Math.max(0, w - 1)} height={barH} fill={seg.color} opacity="0.9" />
      {/if}
    {/each}
    <!-- returned social wage, drawn beyond labour cost -->
    {#if social > 0}
      <rect x={x(TLC)} y={24} width={x(social) - 1} height={barH} fill="var(--social)" opacity="0.55" />
      <text x={x(TLC) + 4} y={24 + barH + 14} class="seg-cap">+ public services</text>
    {/if}

    <!-- gross-wage line marker -->
    <line x1={grossLineX} y1={12} x2={grossLineX} y2={24 + barH + 6} stroke="var(--ink)" stroke-width="2" />
    <text x={grossLineX} y={10} text-anchor="middle" class="gross-label">gross wage line</text>

    <!-- total labour cost bracket -->
    <text x={x(TLC) / 2} y={24 + barH + 30} text-anchor="middle" class="seg-cap">
      total labour cost {eur(TLC)}
    </text>
  </svg>

  <div class="readouts">
    <div><span class="k">Reported gross wage</span><span class="v">{eur(grossWage)}</span></div>
    <div><span class="k">Reported income-tax rate</span><span class="v" style="color:var(--tax)">{pct(incomeTaxRate)}</span></div>
    <div><span class="k">Real consumption 🔒</span><span class="v">{eur(realConsumption)}</span></div>
    <div><span class="k">Public budget 🔒</span><span class="v">{eur(LST)}</span></div>
  </div>

  <label class="relabel">
    <span>Where do we draw the “gross wage” line?</span>
    <input type="range" min="0" max="1" step="0.01" bind:value={() => effPhi, (v) => (phi = v)} />
    <span class="ends"><span>all as income tax</span><span>all as employer contribution</span></span>
  </label>
  <p class="hint">
    Drag it. Take-home and the public budget (🔒) never move — only the <em>labels</em> do.
    Push it right and the income-tax rate falls to <strong>0%</strong> with identical real outcomes.
    Your “gross wage” was never a fact of nature; it's a line we chose to draw.
  </p>
</div>

<style>
  .wedge { width: 100%; }
  svg { width: 100%; height: auto; }
  .gross-label { fill: var(--ink); font-size: 10px; font-family: system-ui, sans-serif; }
  .seg-cap { fill: var(--muted); font-size: 10px; font-family: system-ui, sans-serif; }
  .readouts { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.6rem; margin: 0.75rem 0; }
  .readouts div { display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 0.5rem 0.7rem; }
  .readouts .k { color: var(--muted); font-size: 0.72rem; }
  .readouts .v { font-size: 1.1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .relabel { display: flex; flex-direction: column; gap: 0.3rem; }
  .relabel input { accent-color: var(--accent); }
  .relabel .ends { display: flex; justify-content: space-between; color: var(--muted); font-size: 0.7rem; }
  .hint { color: var(--muted); font-size: 0.85rem; }
</style>
