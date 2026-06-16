<script lang="ts">
  import { runEconomy } from '../engine/economy';
  import { FINLAND_BASELINE } from '../data/finland-baseline';
  import type { Params } from '../engine/types';
  import Sankey from './lib/Sankey.svelte';
  import Waterfall from './lib/Waterfall.svelte';

  // Policy levers — the "machine" the user can change. Start at baseline midpoints.
  let wageShare = $state(FINLAND_BASELINE.wageShare.value);
  let taxLevel = $state(FINLAND_BASELINE.taxLevel.value);
  let socialWageFraction = $state(FINLAND_BASELINE.socialWageFraction.value);
  let wageDispersion = $state(FINLAND_BASELINE.wageDispersion.value);
  let seed = $state(42);

  const params = $derived.by<Params>(() => {
    const p = structuredClone(FINLAND_BASELINE);
    p.wageShare.value = wageShare;
    p.taxLevel.value = taxLevel;
    p.socialWageFraction.value = socialWageFraction;
    p.wageDispersion.value = wageDispersion;
    return p;
  });

  const year = $derived(runEconomy({ seed, params }).years[0]);

  const eur = (v: number) =>
    new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const pct = (v: number) => (v * 100).toFixed(1) + '%';

  function reset() {
    wageShare = FINLAND_BASELINE.wageShare.value;
    taxLevel = FINLAND_BASELINE.taxLevel.value;
    socialWageFraction = FINLAND_BASELINE.socialWageFraction.value;
    wageDispersion = FINLAND_BASELINE.wageDispersion.value;
  }

  const shownParams = [
    { name: 'wage share', p: FINLAND_BASELINE.wageShare },
    { name: 'wage dispersion', p: FINLAND_BASELINE.wageDispersion },
    { name: 'capital dispersion', p: FINLAND_BASELINE.capitalDispersion },
    { name: 'tax level', p: FINLAND_BASELINE.taxLevel },
    { name: 'social-wage fraction', p: FINLAND_BASELINE.socialWageFraction },
    { name: 'housing cost share', p: FINLAND_BASELINE.housingCostFraction },
  ];
</script>

<main>
  <span class="phase-badge">Phase 1 · distribution + flows</span>
  <h1>Econflow</h1>
  <p class="tagline">There is no income before institutions.</p>

  <div class="cards">
    <div class="card">
      <div class="label">Income Gini (disposable)</div>
      <div class="value">{year.metrics.disposableGini.toFixed(3)}</div>
      <div class="label">market <span class="anchor">{year.metrics.marketGini.toFixed(2)}</span> → after redistribution</div>
    </div>
    <div class="card">
      <div class="label">Median capability</div>
      <div class="value">€{eur(year.metrics.medianCapability)}</div>
    </div>
    <div class="card">
      <div class="label">Top-10% wealth (proxy)</div>
      <div class="value">{pct(year.metrics.top10WealthShare)}</div>
      <div class="label">Finland actual: <span class="anchor">52%</span></div>
    </div>
    <div class="card">
      <div class="label">Avg effective tax</div>
      <div class="value">{pct(year.metrics.avgEffectiveTaxRate)}</div>
    </div>
  </div>
  <p class="note" style="margin-top:0.75rem">
    Tax and transfers pull market inequality ({year.metrics.marketGini.toFixed(2)}) down to
    {year.metrics.disposableGini.toFixed(2)}. Finland's published figure is lower still (~0.27)
    because it equivalises income across households — a compression P1 doesn't yet model.
    That gap <em>is</em> the thesis: most of distribution happens before you ever see a tax form.
  </p>

  <section>
    <h2>Change the machine — same effort, different income</h2>
    <div class="panel">
      <div class="levers">
        <label class="lever">
          <span class="top"><span>Wage share of output</span><span class="v">{pct(wageShare)}</span></span>
          <input type="range" min="0.45" max="0.70" step="0.005" bind:value={wageShare} />
          <span class="ends"><span>more to capital</span><span>more to labour</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Tax level</span><span class="v">{taxLevel.toFixed(2)}×</span></span>
          <input type="range" min="0.4" max="1.4" step="0.02" bind:value={taxLevel} />
          <span class="ends"><span>low-tax</span><span>high-tax</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>In-kind public services</span><span class="v">{pct(socialWageFraction)}</span></span>
          <input type="range" min="0.1" max="0.8" step="0.01" bind:value={socialWageFraction} />
          <span class="ends"><span>cash instead</span><span>services</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Wage dispersion</span><span class="v">{wageDispersion.toFixed(2)}</span></span>
          <input type="range" min="0.2" max="1.2" step="0.02" bind:value={wageDispersion} />
          <span class="ends"><span>compressed</span><span>spread</span></span>
        </label>
      </div>
      <p class="note">
        These are <strong>rules</strong>, not physics — the real output pie is held fixed.
        Watch the Gini and the median worker's income below move as you redraw the institutions.
        <button onclick={reset} style="margin-left:.5rem">reset to Finland</button>
      </p>
    </div>
  </section>

  <section>
    <h2>Where did your income come from?</h2>
    <p class="note" style="margin-top:0">
      A representative median worker. Their real capability is gross pay
      <em>minus tax, plus the public services that pay buys collectively, minus housing</em>.
    </p>
    <Waterfall decomposition={year.representative} />
  </section>

  <section>
    <h2>The whole machine — money flows</h2>
    <Sankey links={year.flows.money} />
    <div class="legend">
      <span><span class="swatch" style="background:var(--labor)"></span>labour</span>
      <span><span class="swatch" style="background:var(--capital)"></span>capital</span>
      <span><span class="swatch" style="background:var(--public)"></span>public budget</span>
      <span><span class="swatch" style="background:var(--social)"></span>services / transfers</span>
      <span><span class="swatch" style="background:var(--accent)"></span>real capability</span>
    </div>
  </section>

  <section>
    <h2>Parameters carry ranges, not point estimates</h2>
    <table>
      <thead><tr><th>parameter</th><th>kind</th><th class="num">low</th><th class="num">value</th><th class="num">high</th></tr></thead>
      <tbody>
        {#each shownParams as { name, p }}
          <tr>
            <td>{name}</td>
            <td><span class="kind">{p.kind}</span></td>
            <td class="num range">{p.low}</td>
            <td class="num">{p.value}</td>
            <td class="num range">{p.high}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="note">
      <strong>empirical</strong> ranges encode measurement uncertainty;
      <strong>policy</strong> ranges are levers you set. They are never blended.
      Every value is sourced in <code>data/sources.md</code>.
    </p>
  </section>

  <section>
    <h2>Determinism check</h2>
    <label>seed: <input type="range" min="1" max="100" bind:value={seed} /> <strong>{seed}</strong></label>
    <p class="note">Same seed → identical run, every time.</p>
  </section>
</main>
