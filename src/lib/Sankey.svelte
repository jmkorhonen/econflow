<script lang="ts">
  import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
  import type { SankeyLink } from '../../engine/types';

  let {
    links,
    width = 760,
    height = 440,
  }: { links: SankeyLink[]; width?: number; height?: number } = $props();

  // Colour each node by its role in the flow.
  const COLOR: Record<string, string> = {
    'Real output': 'var(--accent)',
    'Labour income': 'var(--labor)',
    'Capital income': 'var(--capital)',
    'Public budget': 'var(--public)',
    'Public services': 'var(--social)',
    'Cash transfers': 'var(--social)',
    'Other spending': 'var(--muted)',
    Households: 'var(--labor)',
    Savings: 'var(--muted)',
    Consumption: 'var(--labor)',
    VAT: 'var(--tax)',
    'Real consumption': 'var(--labor)',
    'Real capability': 'var(--accent)',
  };
  const nodeColor = (name: string) => COLOR[name] ?? 'var(--muted)';

  const graph = $derived.by(() => {
    const names = Array.from(new Set(links.flatMap((l) => [l.source, l.target])));
    const index = new Map(names.map((n, i) => [n, i]));
    const gen = sankey<{ name: string }, object>()
      .nodeWidth(14)
      .nodePadding(16)
      .extent([
        [1, 6],
        [width - 1, height - 6],
      ]);
    return gen({
      nodes: names.map((name) => ({ name })),
      links: links.map((l) => ({
        source: index.get(l.source)!,
        target: index.get(l.target)!,
        value: l.value,
      })),
    });
  });

  const eur = (v: number) =>
    new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
</script>

<svg viewBox="0 0 {width} {height}" class="sankey" role="img" aria-label="Money flow diagram">
  {#each graph.links as link}
    <path
      d={sankeyLinkHorizontal()(link)}
      fill="none"
      stroke={nodeColor((link.source as { name: string }).name)}
      stroke-opacity="0.32"
      stroke-width={Math.max(1, link.width ?? 1)}
    >
      <title>{(link.source as { name: string }).name} → {(link.target as { name: string }).name}: €{eur(link.value)}</title>
    </path>
  {/each}

  {#each graph.nodes as node}
    {@const n = node as { name: string; x0: number; x1: number; y0: number; y1: number }}
    <rect x={n.x0} y={n.y0} width={n.x1 - n.x0} height={Math.max(1, n.y1 - n.y0)} fill={nodeColor(n.name)} rx="2" />
    <text
      x={n.x0 < width / 2 ? n.x1 + 6 : n.x0 - 6}
      y={(n.y0 + n.y1) / 2}
      text-anchor={n.x0 < width / 2 ? 'start' : 'end'}
      dominant-baseline="middle"
      class="node-label"
    >
      {n.name}
    </text>
  {/each}
</svg>

<style>
  .sankey {
    width: 100%;
    height: auto;
  }
  .node-label {
    fill: var(--ink);
    font-size: 11px;
    font-family: system-ui, sans-serif;
  }
</style>
