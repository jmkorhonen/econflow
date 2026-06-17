<script lang="ts">
  import { runEconomy, evaluatePerson } from '../engine/economy';
  import { computePhysical } from '../engine/physical';
  import { runDynamics } from '../engine/dynamics';
  import { FINLAND_BASELINE } from '../data/finland-baseline';
  import type { Params } from '../engine/types';
  import Sankey from './lib/Sankey.svelte';
  import Waterfall from './lib/Waterfall.svelte';
  import Wedge from './lib/Wedge.svelte';
  import DecileBars from './lib/DecileBars.svelte';
  import Person from './lib/Person.svelte';
  import ChartCard from './lib/ChartCard.svelte';
  import TimeSeries from './lib/TimeSeries.svelte';

  // Physical-economy levers (set the pie's *size* via energy + infrastructure).
  let technology = $state(FINLAND_BASELINE.productivityMultiplier.value);
  let primaryEnergy = $state(FINLAND_BASELINE.physical.primaryEnergyIndex.value);
  let fossilShare = $state(FINLAND_BASELINE.physical.energyMix.fossil.value);
  let infrastructure = $state(FINLAND_BASELINE.physical.infrastructure.value);
  let materialIntensity = $state(FINLAND_BASELINE.physical.materialIntensity.value);
  let recyclingRate = $state(FINLAND_BASELINE.physical.recyclingRate.value);
  const NUCLEAR = FINLAND_BASELINE.physical.energyMix.nuclear.value; // held fixed; fossil ⇄ renewable

  // Rules levers (set how the pie is *divided*).
  let wageShare = $state(FINLAND_BASELINE.wageShare.value);
  let taxLevel = $state(FINLAND_BASELINE.taxLevel.value);
  let taxProgressivity = $state(FINLAND_BASELINE.taxProgressivity.value);
  let vatRate = $state(FINLAND_BASELINE.vatRate.value);
  let employerContribRate = $state(FINLAND_BASELINE.employerContribRate.value);
  let socialWageFraction = $state(FINLAND_BASELINE.socialWageFraction.value);
  let seed = $state(42);

  const params = $derived.by<Params>(() => {
    const p = structuredClone(FINLAND_BASELINE);
    p.productivityMultiplier.value = technology;
    p.physical.primaryEnergyIndex.value = primaryEnergy;
    p.physical.energyMix.fossil.value = fossilShare;
    p.physical.energyMix.renewable.value = Math.max(0, 1 - NUCLEAR - fossilShare);
    p.physical.infrastructure.value = infrastructure;
    p.physical.materialIntensity.value = materialIntensity;
    p.physical.recyclingRate.value = recyclingRate;
    p.wageShare.value = wageShare;
    p.taxLevel.value = taxLevel;
    p.taxProgressivity.value = taxProgressivity;
    p.vatRate.value = vatRate;
    p.employerContribRate.value = employerContribRate;
    p.socialWageFraction.value = socialWageFraction;
    return p;
  });

  const year = $derived(runEconomy({ seed, params }).years[0]);
  const basePhysical = computePhysical(FINLAND_BASELINE); // for relative-to-baseline readouts

  // Long-run dynamics: your settings vs two reference attractors over the decades.
  let captureStrength = $state(FINLAND_BASELINE.dynamics.captureStrength.value);
  let inheritanceTax = $state(FINLAND_BASELINE.dynamics.inheritanceTax.value);
  let horizon = $state(80);
  const dynYours = $derived(runDynamics(params, { seed, years: horizon, captureStrength, inheritanceTax }));
  const dynGuard = $derived(runDynamics(params, { seed, years: horizon, captureStrength: 0, inheritanceTax: 0.5 }));
  const dynCapture = $derived(runDynamics(params, { seed, years: horizon, captureStrength: 1, inheritanceTax: 0.05 }));
  const drift = $derived(dynYours.snapshots[dynYours.snapshots.length - 1]);

  const series = (key: 'top10Wealth' | 'medianCapability') => [
    { label: 'Guardrails (high inheritance tax, no capture)', color: 'var(--social)', points: dynGuard.snapshots.map((s) => s[key]) },
    { label: 'Capture (low inheritance tax, capture on)', color: 'var(--tax)', points: dynCapture.snapshots.map((s) => s[key]) },
    { label: 'Your settings', color: 'var(--accent)', points: dynYours.snapshots.map((s) => s[key]), dash: true },
  ];
  const dynamicsCsv = () => {
    const rows: (string | number)[][] = [['year', 'top10_wealth', 'top1_wealth', 'disposable_gini', 'median_capability', 'wage_share', 'capital_tax', 'inheritance_tax']];
    for (const s of dynYours.snapshots) rows.push([s.year, s.top10Wealth, s.top1Wealth, s.disposableGini, Math.round(s.medianCapability), s.wageShare, s.capitalTaxRate, s.inheritanceTax]);
    return rows;
  };

  // "You" — input your own income; runs through the same wedge, placed in the distribution.
  let myWage = $state(38_400); // €3,200 / month
  let myCapital = $state(0);
  let meEnabled = $state(false);
  const person = $derived(meEnabled ? evaluatePerson(year, params, myWage, myCapital) : null);

  const eur = (v: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const pct = (v: number) => (v * 100).toFixed(1) + '%';

  // CSV builders for the export buttons.
  const decileCsv = () => {
    const rows: (string | number)[][] = [['metric', 'decile', 'share', 'income_lo', 'income_hi']];
    for (const m of ['market', 'disposable', 'capability'] as const) {
      const b = year.distribution[m].deciles;
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
    technology = FINLAND_BASELINE.productivityMultiplier.value;
    primaryEnergy = FINLAND_BASELINE.physical.primaryEnergyIndex.value;
    fossilShare = FINLAND_BASELINE.physical.energyMix.fossil.value;
    infrastructure = FINLAND_BASELINE.physical.infrastructure.value;
    materialIntensity = FINLAND_BASELINE.physical.materialIntensity.value;
    recyclingRate = FINLAND_BASELINE.physical.recyclingRate.value;
    wageShare = FINLAND_BASELINE.wageShare.value;
    taxLevel = FINLAND_BASELINE.taxLevel.value;
    taxProgressivity = FINLAND_BASELINE.taxProgressivity.value;
    vatRate = FINLAND_BASELINE.vatRate.value;
    employerContribRate = FINLAND_BASELINE.employerContribRate.value;
    socialWageFraction = FINLAND_BASELINE.socialWageFraction.value;
  }
</script>

<main>
  <span class="phase-badge">Phase 4 · the long run</span>
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
      <h3 class="levergroup">Physical economy — sets the <em>size</em> of the pie</h3>
      <div class="levers">
        <label class="lever">
          <span class="top"><span>Technology / know-how</span><span class="v">{technology.toFixed(2)}×</span></span>
          <input type="range" min="0.6" max="1.5" step="0.01" bind:value={technology} />
          <span class="ends"><span>less</span><span>more</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Primary energy per capita</span><span class="v">{primaryEnergy.toFixed(2)}×</span></span>
          <input type="range" min="0.6" max="1.4" step="0.01" bind:value={primaryEnergy} />
          <span class="ends"><span>less</span><span>more</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Energy mix</span><span class="v">{pct(Math.max(0, 1 - NUCLEAR - fossilShare))} renewable</span></span>
          <input type="range" min="0.0" max={1 - NUCLEAR} step="0.005" bind:value={fossilShare} />
          <span class="ends"><span>more renewable</span><span>more fossil</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Infrastructure</span><span class="v">{infrastructure.toFixed(2)}×</span></span>
          <input type="range" min="0.5" max="1.5" step="0.01" bind:value={infrastructure} />
          <span class="ends"><span>less built</span><span>more built</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Material intensity</span><span class="v">{materialIntensity.toFixed(2)}×</span></span>
          <input type="range" min="0.6" max="1.4" step="0.01" bind:value={materialIntensity} />
          <span class="ends"><span>lean</span><span>wasteful</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Recycling rate</span><span class="v">{pct(recyclingRate)}</span></span>
          <input type="range" min="0.05" max="0.6" step="0.01" bind:value={recyclingRate} />
          <span class="ends"><span>linear</span><span>circular</span></span>
        </label>
      </div>

      <h3 class="levergroup">Rules — set how the pie is <em>divided</em></h3>
      <div class="levers">
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
        Physical levers change the pie's <em>size</em>; rules only change how it's
        <em>divided</em>. <button onclick={reset} style="margin-left:.4rem">reset to Finland</button>
      </p>
    </div>
  </section>

  <section>
    <h2>Where the wealth actually comes from</h2>
    <p class="note" style="margin-top:0">
      Output isn't conjured by rules — it's energy and materials turned into useful work, on top
      of inherited infrastructure. Net energy lost to low EROI, a less-built machine, or simply
      using less energy all shrink the pie the rules then divide.
    </p>
    <div class="phys-metrics">
      <div class="pm"><span class="k">Output multiplier</span><span class="val">{year.physical.productivityFactor.toFixed(2)}×</span></div>
      <div class="pm"><span class="k">Useful energy</span><span class="val">{(year.physical.usefulWork / basePhysical.usefulWork).toFixed(2)}×</span></div>
      <div class="pm"><span class="k">Blended EROI</span><span class="val">{year.physical.eroiBlended.toFixed(1)}</span></div>
      <div class="pm"><span class="k">Renewable share</span><span class="val">{pct(year.physical.renewableShare)}</span></div>
      <div class="pm"><span class="k">CO₂ emissions</span><span class="val">{(year.physical.emissions / basePhysical.emissions).toFixed(2)}×</span></div>
      <div class="pm"><span class="k">Recycled material</span><span class="val">{pct(year.physical.materials.recycled / year.physical.materials.throughput)}</span></div>
    </div>
    <ChartCard title="Energy flows" filename="econflow-energy">
      <Sankey links={year.flows.physical} />
    </ChartCard>
    <div class="legend">
      <span><span class="swatch" style="background:var(--tax)"></span>fossil</span>
      <span><span class="swatch" style="background:var(--public)"></span>nuclear</span>
      <span><span class="swatch" style="background:var(--social)"></span>renewable</span>
      <span><span class="swatch" style="background:var(--labor)"></span>useful work</span>
      <span><span class="swatch" style="background:var(--muted)"></span>EROI + conversion losses</span>
    </div>
  </section>

  <section>
    <h2>Who gets the GDP?</h2>
    <ChartCard title="Distribution by decile" filename="econflow-deciles" csv={decileCsv}>
      <DecileBars
        distribution={year.distribution}
        userDecile={person?.decile ?? null}
        userPercentile={person?.percentile ?? null}
      />
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
    <h2>The long run — how today's rules become tomorrow's dynasty</h2>
    <p class="note" style="margin-top:0">
      Run the same economy for decades. Wealth compounds, big fortunes earn higher returns
      (r &gt; g), and the rich save more — so wealth concentrates unless inheritance taxes break
      it up. Turn on <em>political capture</em> and concentrated wealth starts rewriting the rules
      in its own favour: a self-reinforcing loop. The same starting point has two destinations.
    </p>
    <div class="panel">
      <div class="levers">
        <label class="lever">
          <span class="top"><span>Political capture</span><span class="v">{captureStrength.toFixed(2)}</span></span>
          <input type="range" min="0" max="1" step="0.02" bind:value={captureStrength} />
          <span class="ends"><span>democracy holds</span><span>wealth writes the rules</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Inheritance tax</span><span class="v">{pct(inheritanceTax)}</span></span>
          <input type="range" min="0" max="0.6" step="0.01" bind:value={inheritanceTax} />
          <span class="ends"><span>dynasties persist</span><span>broken up</span></span>
        </label>
        <label class="lever">
          <span class="top"><span>Horizon</span><span class="v">{horizon} yrs</span></span>
          <input type="range" min="20" max="120" step="5" bind:value={horizon} />
          <span class="ends"><span>near</span><span>far</span></span>
        </label>
      </div>
      <p class="note" style="margin-bottom:0">
        Under <em>your</em> settings, over {horizon} years the rules drift to:
        wage share <strong>{pct(dynYours.snapshots[0].wageShare)} → {pct(drift.wageShare)}</strong>,
        capital tax <strong>{pct(dynYours.snapshots[0].capitalTaxRate)} → {pct(drift.capitalTaxRate)}</strong>,
        inheritance tax <strong>{pct(inheritanceTax)} → {pct(drift.inheritanceTax)}</strong>.
        {#if dynYours.oligarchic}<span style="color:var(--tax)"> Wealth concentration ran away.</span>{/if}
      </p>
    </div>

    <ChartCard title="Top-10% wealth share over time" filename="econflow-dynamics" csv={dynamicsCsv}>
      <TimeSeries series={series('top10Wealth')} years={horizon} format="pct" />
    </ChartCard>

    <h3 style="font-size:1rem;margin:1.5rem 0 0.5rem">Median capability — does broad prosperity follow?</h3>
    <ChartCard title="Median capability over time" filename="econflow-dynamics-capability">
      <TimeSeries series={series('medianCapability')} years={horizon} format="eur" />
    </ChartCard>
  </section>

  <section>
    <h2>Determinism check</h2>
    <label>seed: <input type="range" min="1" max="100" bind:value={seed} /> <strong>{seed}</strong></label>
    <p class="note">Same seed → identical run. Every parameter is a sourced range in <code>data/sources.md</code>.</p>
  </section>
</main>
