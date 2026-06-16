<script lang="ts">
  import { runEconomy } from '../engine/economy';
  import { FINLAND_BASELINE } from '../data/finland-baseline';
  import type { Param } from '../engine/types';

  let seed = $state(42);

  const result = $derived(runEconomy({ seed }));
  const year = $derived(result.years[0]);

  const laborPool = $derived(
    year.flows.money.find((l) => l.source === 'Real output' && l.target === 'Wages')?.value ?? 0,
  );
  const capitalPool = $derived(
    year.flows.money.find((l) => l.source === 'Real output' && l.target === 'Capital income')?.value ?? 0,
  );
  const wagePct = $derived(Math.round((100 * laborPool) / (laborPool + capitalPool)));

  const eur = (v: number) =>
    new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

  // Surface a few parameters to show the range-carrying data model in action.
  const shownParams: { name: string; p: Param }[] = [
    { name: 'wage share', p: FINLAND_BASELINE.wageShare },
    { name: 'wage dispersion', p: FINLAND_BASELINE.wageDispersion },
    { name: 'avg tax rate', p: FINLAND_BASELINE.avgTaxRate },
    { name: 'social-wage fraction', p: FINLAND_BASELINE.socialWageFraction },
    { name: 'housing cost share', p: FINLAND_BASELINE.housingCostFraction },
  ];
</script>

<main>
  <span class="phase-badge">Phase 0 · scaffold</span>
  <h1>Econflow</h1>
  <p class="tagline">There is no income before institutions.</p>

  <div class="cards">
    <div class="card">
      <div class="label">Gini (capability)</div>
      <div class="value">{year.metrics.gini.toFixed(3)}</div>
    </div>
    <div class="card">
      <div class="label">Median capability</div>
      <div class="value">€{eur(year.metrics.medianCapability)}</div>
    </div>
    <div class="card">
      <div class="label">Top-1% wealth share</div>
      <div class="value">{(year.metrics.top1WealthShare * 100).toFixed(1)}%</div>
    </div>
    <div class="card">
      <div class="label">EROI</div>
      <div class="value">{year.physical.eroi.toFixed(1)}</div>
    </div>
  </div>

  <section>
    <h2>Functional split — where output goes first</h2>
    <div class="bar">
      <div class="labor" style="width: {wagePct}%">Wages {wagePct}%</div>
      <div class="capital" style="width: {100 - wagePct}%">Capital {100 - wagePct}%</div>
    </div>
    <p class="note">
      Before any tax, output divides into wages and capital income — a split set by
      bargaining institutions, not nature. This is the pre-distribution moment P1 makes interactive.
    </p>
  </section>

  <section>
    <h2>Money flows (Sankey input)</h2>
    <table>
      <thead><tr><th>from</th><th>to</th><th class="num">€</th></tr></thead>
      <tbody>
        {#each year.flows.money as link}
          <tr><td>{link.source}</td><td>{link.target}</td><td class="num">{eur(link.value)}</td></tr>
        {/each}
      </tbody>
    </table>
    <p class="note">These links feed the D3 Sankey diagram arriving in P1.</p>
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
    </p>
  </section>

  <section>
    <h2>Determinism check</h2>
    <label>
      seed:
      <input type="range" min="1" max="100" bind:value={seed} />
      <strong>{seed}</strong>
    </label>
    <p class="note">
      Same seed → identical run, every time. Drag to confirm the metrics above
      move only when the seed changes.
    </p>
  </section>
</main>
