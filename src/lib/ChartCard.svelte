<script lang="ts">
  import type { Snippet } from 'svelte';
  import { svgToPng, downloadCsv } from './export';

  let {
    title,
    filename,
    csv,
    children,
  }: {
    title: string;
    filename: string;
    csv?: () => (string | number)[][];
    children: Snippet;
  } = $props();

  let host: HTMLDivElement;

  function savePng() {
    const svg = host.querySelector('svg');
    if (svg) svgToPng(svg as unknown as SVGSVGElement, filename + '.png');
  }
  function saveCsv() {
    if (csv) downloadCsv(filename + '.csv', csv());
  }
</script>

<div class="chartcard" bind:this={host}>
  <div class="bar">
    <strong>{title}</strong>
    <span class="actions">
      <button onclick={savePng} title="Save as PNG">PNG</button>
      {#if csv}<button onclick={saveCsv} title="Download data as CSV">CSV</button>{/if}
    </span>
  </div>
  {@render children()}
</div>

<style>
  .chartcard { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 1.1rem 1.25rem; }
  .bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem; }
  .bar strong { font-size: 0.95rem; }
  .actions button {
    background: transparent; color: var(--muted); border: 1px solid var(--line);
    border-radius: 6px; padding: 0.15rem 0.55rem; margin-left: 0.35rem; cursor: pointer; font-size: 0.72rem;
  }
  .actions button:hover { color: var(--ink); border-color: var(--accent); }
</style>
