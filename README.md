# Econflow

> There is no income before institutions.

An educational, browser-based model showing two coupled things:

1. **Distribution** — the same physical output and the same effort yield very
   different incomes depending on institutional rules (bargaining, taxation,
   public services, housing, inheritance). "Earnings" are an output of a rule
   system, not a natural fact.
2. **Physical economy** — that output itself flows from **energy and material
   throughput**, directed through the economy by money. Wealth has a biophysical
   base, visualised as flows that change with the rules.

Runs entirely in the browser (no server, no cost) and deploys to GitHub Pages.

## Design principles

- **`engine/` is pure, framework-free TypeScript and never imports from `src/`.**
  The economic logic must be auditable on its own — that is the defense against
  "just socialism with sliders."
- **Every parameter carries a `[low, high]` range and a source**, tagged
  `empirical` (measurement uncertainty), `policy` (a lever you set), or
  `identity` (an accounting must-hold). See [`data/sources.md`](data/sources.md).
- The physical layer's constraints are **shared across all scenarios**; politics
  redistributes the pie, it doesn't conjure it.

## Roadmap

| Phase | Deliverable |
|-------|-------------|
| **P0** | Scaffold: range-based engine skeleton, tests, Pages auto-deploy ✓ |
| **P1** | Distribution + progressive fiscal engine, Finland baseline, money Sankey, income waterfall ✓ |
| **P2** | Tax wedge (labour cost → consumption) + relabel demo, named policy levers, ~10k agents + Pareto top tail, decile / top-fractile views ✓ |
| **P3** | Physical layer (energy/materials/EROI/emissions) + physical Sankey, driving the productivity multiplier |
| **P4** | Dynamics & political economy: r>g, inheritance, the cross-regime "merit-held-constant" avatar, intergenerational mobility, wealth→power capture loop |
| **P5** | Scenarios + side-by-side compare ("another Finland / another era"), uncertainty bands, accessibility, share/embed |

## Develop

```bash
npm install
npm run dev      # local dev server
npm run test     # engine unit tests
npm run build    # production build → dist/
```

## Layout

```
engine/   pure model logic (auditable, tested)
data/     Finland baseline parameters + sources
src/      Svelte + D3 UI
tests/    engine unit + golden-master tests
```

## Deploy

Pushing to `main` runs the tests and publishes `dist/` to GitHub Pages via
`.github/workflows/deploy.yml`. Enable Pages → "GitHub Actions" in repo settings once.
