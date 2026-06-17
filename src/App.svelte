<script lang="ts">
  import { runEconomy, evaluatePerson } from '../engine/economy';
  import { FINLAND_BASELINE } from '../data/finland-baseline';
  import type { Params } from '../engine/types';
  import Sankey from './lib/Sankey.svelte';
  import Waterfall from './lib/Waterfall.svelte';
  import Wedge from './lib/Wedge.svelte';
  import DecileBars from './lib/DecileBars.svelte';
  import Person from './lib/Person.svelte';
  import ChartCard from './lib/ChartCard.svelte';

  // Real policy levers over a (mostly) fixed pie. The productivity multiplier is the
  // one lever that changes the pie's *size* — a preview of the P3 physical layer.
  let productivityMultiplier = $state(FINLAND_BASELINE.productivityMultiplier.value);
  let wageShare = $state(FINLAND_BASELINE.wageShare.value);
  let taxLevel = $state(FINLAND_BASELINE.taxLevel.value);
  let taxProgressivity = $state(FINLAND_BASELINE.taxProgressivity.value);
  let vatRate = $state(FINLAND_BASELINE.vatRate.value);
  let employerContribRate = $state(FINLAND_BASELINE.employerContribRate.value);
  let socialWageFraction = $state(FINLAND_BASELINE.socialWageFraction.value);
  let seed = $state(42);

  const params = $derived.by<Params>(() => {
    const p = structuredClone(FINLAND_BASELINE);
    p.productivityMultiplier.value = productivityMultiplier;
    p.wageShare.value = wageShare;
    p.taxLevel.value = taxLevel;
    p.taxProgressivity.value = taxProgressivity;
    p.vatRate.value = vatRate;
    p.employerContribRate.value = employerContribRate;
    p.socialWageFraction.value = socialWageFraction;
    return p;
  });

  const year = $derived(runEconomy({ seed, params }).years[0]);

  // "You" — input your own income; runs through the same wedge, placed in the distribution.
  let myWage = $state(38_000);
  let myCapital = $state(0);
  let meEnabled = $state(false);
  const person = $derived(meEnabled ? evaluatePerson(year, params, myWage, myCapital) : null);

  const eur = (v: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const pct = (v: number) => (v * 100).toFixed(1) + '%';

  // CSV builders for the export buttons.
  const decileCsv = () => {
    const rows: (string | number)[][] = [['metric', 'decile', 'share', 'income_lo', 'income_hi']];
    for (const m of ['market', 'disposable', 'capability'] as const) {
      const b = year.distribution[m];
      b.shares.forEach((s, i) => rows.push([m, `D${i + 1}`, s, b.edges[i].lo, b.edges[i].hi]));
    }
    return rows;
  };
  const wedgeCsv = () => {
    const rows: (string | number)[][] = [['slice', 'kind', 'euro']];
    for (const s of year.wedge.slices) rows.push([s.label, s.kind, Math.round(s.amount)]);
    return rows;
  };

  function reset() {
    productivityMultiplier = FINLAND_BASELINE.productivityMultiplier.value;
    wageShare = FINLAND_BASELINE.wageShare.value;
    taxLevel = FINLAND_BASELINE.taxLevel.value;
    taxProgressivity = FINLAND_BASELINE.taxProgressivity.value;
    vatRate = FINLAND_BASELINE.vatRate.value;
    employerContribRate = FINLAND_BASELINE.employerContribRate.value;
    socialWageFraction = FINLAND_BASELINE.socialWageFraction.value;
  }
</script>

<main>
  <span class="phase-badge">Phase 2.5 · make it yours</span>
  <h1>Econflow</h1>
  <p class="tagline">There is no income before institutions.</p>

  <div class="cards">
    <div class="card">
      <div class="label">Income Gini (disposable)</div>
      <div class="value">{year.metrics.disposableGini.toFixed(3)}</div>
      <div class="label">market <span class="anchor">{year.metrics.marketGini.toFixed(2)}</span> → after redistribution</div>
    </div>
    <div class="card">
      <div class="label">Median tax wedge</div>
      <div class="value">{pct(year.metrics.medianTaxWedge)}</div>
      <div class="label">labour cost → consumption</div>
    </div>
    <div class="card">
      <div class="label">Top-1% wealth (proxy)</div>
      <div class="value">{pct(year.metrics.top1WealthShare)}</div>
      <div class="label">top 0.1%: <span class="anchor">{pct(year.metrics.top01WealthShare)}</span></div>
    </div>
    <div class="card">
      <div class="label">Median capability</div>
      <div class="value">€{eur(year.metrics.medianCapability)}</div>
    </div>
  </div>

  <section>
    <h2>This is about you</h2>
    <p class="note" style="margin-top:0">
      Enter your own income to see where you land, what your wedge looks like, and how the
      levers below move <em>your</em> number.
    </p>
    <div class="panel">
      <Person bind:grossWage={myWage} bind:capitalIncome={myCapital} bind:enabled={meEnabled} {person} />
    </div>
  </section>

  <section>
    <h2>Your “gross wage” is a line we chose to draw</h2>
    <p class="note" style="margin-top:0">
      The median worker, from what they cost their employer to what they can actually consume.
      Every euro the public takes — employer contributions, income tax, VAT — is one wedge.
      How it's <em>labelled</em> is a political choice; the real outcome is not.
    </p>
    <ChartCard title="The median worker's tax wedge" filename="econflow-wedge" csv={wedgeCsv}>
      <Wedge wedge={year.wedge} />
    </ChartCard>
  </section>

  <section>
    <h2>Change the machine — same effort, different income</h2>
    <div class="panel">
      <div class="levers">
        <label class="lever">
          <span class="top"><span>The machine (tech + infrastructure)</span><span class="v">{productivityMultiplier.toFixed(2)}×</span></span>
          <input type="range" min="0.5" max="1.5" step="0.01" bind:value={productivityMultiplier} />
          <span class="ends"><span>less built</span><span>more built</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Wage share of output</span><span class="v">{pct(wageShare)}</span></span>
          <input type="range" min="0.45" max="0.70" step="0.005" bind:value={wageShare} />
          <span class="ends"><span>to capital</span><span>to labour</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Tax level</span><span class="v">{taxLevel.toFixed(2)}×</span></span>
          <input type="range" min="0.4" max="1.4" step="0.02" bind:value={taxLevel} />
          <span class="ends"><span>low-tax</span><span>high-tax</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Tax progressivity</span><span class="v">{taxProgressivity.toFixed(2)}</span></span>
          <input type="range" min="0.6" max="1.6" step="0.02" bind:value={taxProgressivity} />
          <span class="ends"><span>flat</span><span>steep</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>VAT rate</span><span class="v">{pct(vatRate)}</span></span>
          <input type="range" min="0.0" max="0.35" step="0.005" bind:value={vatRate} />
          <span class="ends"><span>none</span><span>high</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Employer contributions</span><span class="v">{pct(employerContribRate)}</span></span>
          <input type="range" min="0.0" max="0.4" step="0.005" bind:value={employerContribRate} />
          <span class="ends"><span>none</span><span>high</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>In-kind public services</span><span class="v">{pct(socialWageFraction)}</span></span>
          <input type="range" min="0.1" max="0.8" step="0.01" bind:value={socialWageFraction} />
          <span class="ends"><span>cash instead</span><span>services</span></span>
        </label>
      </div>
      <p class="note">
        Only the machine lever changes the pie's <em>size</em>; the rest only change how it's
        <em>divided</em>. <button onclick={reset} style="margin-left:.4rem">reset to Finland</button>
      </p>
    </div>
  </section>

  <section>
    <h2>Who gets the GDP?</h2>
    <ChartCard title="Distribution by decile" filename="econflow-deciles" csv={decileCsv}>
      <DecileBars distribution={year.distribution} userDecile={person?.decile ?? null} />
    </ChartCard>
  </section>

  <section>
    <h2>Where did your income come from?</h2>
    <ChartCard title="Median worker income decomposition" filename="econflow-waterfall">
      <Waterfall decomposition={year.representative} />
    </ChartCard>
  </section>

  <section>
    <h2>The whole machine — money flows</h2>
    <ChartCard title="Money flows" filename="econflow-sankey">
      <Sankey links={year.flows.money} />
    </ChartCard>
    <div class="legend">
      <span><span class="swatch" style="background:var(--labor)"></span>labour / households</span>
      <span><span class="swatch" style="background:var(--capital)"></span>capital</span>
      <span><span class="swatch" style="background:var(--public)"></span>public budget</span>
      <span><span class="swatch" style="background:var(--tax)"></span>VAT</span>
      <span><span class="swatch" style="background:var(--social)"></span>services / transfers</span>
      <span><span class="swatch" style="background:var(--accent)"></span>real capability</span>
    </div>
  </section>

  <section>
    <h2>Determinism check</h2>
    <label>seed: <input type="range" min="1" max="100" bind:value={seed} /> <strong>{seed}</strong></label>
    <p class="note">Same seed → identical run. Every parameter is a sourced range in <code>data/sources.md</code>.</p>
  </section>
</main>
