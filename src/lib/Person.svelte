<script lang="ts">
  import type { PersonResult } from '../../engine/types';
  import Wedge from './Wedge.svelte';

  let {
    grossWage = $bindable(),
    capitalIncome = $bindable(),
    enabled = $bindable(),
    person,
  }: {
    grossWage: number;
    capitalIncome: number;
    enabled: boolean;
    person: PersonResult | null;
  } = $props();

  const eur = (v: number) => '€' + new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(v);
  const eurc = (v: number) => '€' + new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const pct = (v: number) => (v * 100).toFixed(0) + '%';

  // Finnish wages are quoted per month and exclude extras like the holiday bonus
  // (lomaraha, ≈ half a month). The engine works in annual €.
  // `baseAnnual` is the entered wage (excluding bonus); the entry unit only changes
  // how it's displayed, while the holiday-bonus checkbox adds to the annual the engine sees.
  let baseAnnual = $state(grossWage);
  let wageUnit = $state<'month' | 'year'>('month');
  let holidayBonus = $state(false);
  $effect(() => {
    grossWage = Math.round(baseAnnual * (holidayBonus ? 12.5 / 12 : 1));
  });
</script>

<div class="person">
  <div class="inputs">
    <div class="wagefield">
      <span class="lbl">Your gross (pre-tax) wage</span>
      <div class="row">
        <input
          type="number"
          min="0"
          step={wageUnit === 'year' ? 1000 : 100}
          bind:value={
            () => (wageUnit === 'month' ? Math.round(baseAnnual / 12) : baseAnnual),
            (v) => (baseAnnual = Math.round((v || 0) * (wageUnit === 'month' ? 12 : 1)))
          }
        />
        <select bind:value={wageUnit}>
          <option value="month">€ / month</option>
          <option value="year">€ / year</option>
        </select>
      </div>
      <label class="bonus">
        <input type="checkbox" bind:checked={holidayBonus} />
        <span>+ holiday bonus (lomaraha, ≈ ½ month)</span>
      </label>
      <span class="eq">= {eur(grossWage)} / year used by the model</span>
    </div>
    <label>
      <span>Your capital income (€/year)</span>
      <input type="number" min="0" step="1000" bind:value={capitalIncome} />
    </label>
    <label class="toggle">
      <input type="checkbox" bind:checked={enabled} />
      <span>show me on the charts</span>
    </label>
  </div>

  {#if enabled && person}
    <div class="results">
      <div class="stat">
        <div class="big">D{person.decile}</div>
        <div class="sub">richer than {person.percentile.toFixed(0)}% of adults</div>
      </div>
      <div class="stat">
        <div class="big">{eurc(person.capability)}</div>
        <div class="sub">your real capability</div>
      </div>
      <div class="stat">
        <div class="big">{pct(person.taxWedge)}</div>
        <div class="sub">your labour tax wedge</div>
      </div>
      <div class="stat">
        <div class="big">{eur(person.socialWage)}</div>
        <div class="sub">public services you receive</div>
      </div>
    </div>

    <h4>Your wedge — drag to relabel your own “gross wage”</h4>
    <Wedge wedge={person.wedge} />
  {/if}

  <p class="privacy">
    🔒 Everything here runs in your browser. Your income is never sent anywhere — it
    isn't stored, logged, or put in the URL.
  </p>
</div>

<style>
  .person { width: 100%; }
  .inputs { display: flex; flex-wrap: wrap; gap: 1rem 1.5rem; align-items: flex-end; }
  .inputs label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.82rem; color: var(--muted); }
  .inputs input[type='number'] { background: var(--bg); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 0.4rem 0.6rem; width: 11rem; font-size: 1rem; }
  .inputs .toggle { flex-direction: row; align-items: center; gap: 0.4rem; }
  .wagefield { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.82rem; color: var(--muted); }
  .wagefield .row { display: flex; gap: 0.4rem; }
  .wagefield input[type='number'] { background: var(--bg); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 0.4rem 0.6rem; width: 7rem; font-size: 1rem; }
  .wagefield select { background: var(--bg); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 0.4rem 0.5rem; font-size: 0.85rem; }
  .wagefield .bonus { flex-direction: row; align-items: center; gap: 0.35rem; font-size: 0.78rem; }
  .wagefield .eq { color: var(--accent); font-variant-numeric: tabular-nums; }
  .results { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin: 1rem 0; }
  .stat { background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 0.8rem 1rem; }
  .stat .big { font-size: 1.5rem; font-weight: 700; }
  .stat .sub { color: var(--muted); font-size: 0.78rem; margin-top: 0.2rem; }
  h4 { margin: 1.25rem 0 0.5rem; font-size: 0.92rem; }
  .privacy { color: var(--muted); font-size: 0.78rem; margin-top: 1rem; }
</style>
