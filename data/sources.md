# Data sources & provenance

Every empirical and policy parameter in `finland-baseline.ts` references a key
below. The rule: **no number without a traceable source and a plausible range.**
Ranges are deliberate — `empirical` ranges encode measurement uncertainty,
`policy` ranges encode the span of the live debate (a lever you set), and
`identity` values are exact accounting must-holds.

| key | parameter | central figure used | source |
|-----|-----------|---------------------|--------|
| `statfi-gdp` | per-capita output | GDP ≈ €270 bn / 5.6 m ≈ €48k pc | [Statistics Finland — national accounts](https://stat.fi/en/statistics/vtp) |
| `tfp-lit` | productivity multiplier | infrastructure/TFP elasticity of output | Aschauer (1989); Hall & Jones (1999) — illustrative, not a point estimate |
| `statfi-energy` | primary energy shares | renewables **42%** of total energy consumption, 2023 | [Statistics Finland — energy supply 2023](https://stat.fi/en/publication/cln32y7ve5mem0bvzcoduq5xx) |
| `eroi-lit` | energy return on investment | per-source ranges (fossil ~10–25, nuclear ~8–20, renewable ~9–22) | Hall, Lambert & Balogh (2014), *Energy Policy*; Murphy et al. — contested literature ranges |
| `exergy-lit` | conversion efficiency | society-wide exergy efficiency ~0.3–0.5 | Ayres & Warr, *The Economic Growth Engine* (2009) |
| `energy-output-lit` | energy–output elasticity (α) | ~0.3–0.7 | Stern (2011), *Annals NY Acad. Sci.*; Ayres & Warr — energy & growth |
| `infra-lit` | infrastructure elasticity (β) + stock | ~0.1–0.4 | Aschauer (1989), *J. Monetary Economics* |
| `material-lit` | material intensity & circularity | Finland circular material use rate is low (<10%) | Eurostat / Statistics Finland material flow accounts; Circle Economy |
| `oecd-labour-share` | labour share of output | adjusted labour share ≈ 0.57–0.60 | [OECD compendium of productivity indicators 2025](https://www.oecd.org/en/publications/oecd-compendium-of-productivity-indicators-2025_b024d9e1-en.html) |
| `oecd-earnings-disp` | within-labour pay spread | Finland earnings D9/D1 ≈ 2.5 (low) | OECD Earnings distribution database |
| `statfi-wealth` | capital/wealth concentration | top-10% own **52%** of net wealth, 2023 | [Statistics Finland — households' assets 2023](https://stat.fi/en/publication/cm1hek7m45vlf07vxdwvayu3c) |
| `vero-contrib` | employer/employee social contributions | employer ≈ 20%, employee ≈ 10% of gross | Finnish Tax Administration (Vero) / TyEL |
| `oecd-tax` | tax level + progressivity | total tax ≈ **43%** of GDP; avg-worker tax wedge ≈ 43% | [OECD — tax revenue / taxing wages, Finland](https://data.oecd.org/tax/tax-revenue.htm) |
| `vero-capital` | capital income tax rate | 30% up to €30k, 34% above | Finnish Tax Administration (Vero) |
| `vero-vat` | VAT rate | standard rate **25.5%** (2024) | Finnish Tax Administration (Vero) |
| `oecd-socx` | in-kind vs cash split | SOCX in-kind ≈ half of social spending | OECD Social Expenditure database (SOCX) |
| `eurostat-housing` | housing cost burden | overburden (>40%) rate **2.6%**, 2023 | [Eurostat — housing conditions](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Living_conditions_in_Europe_-_housing) |
| `statfi-savings` | savings rate by income | household saving rate, rising with income | Statistics Finland — household income & consumption |
| `kela-pension` | pension transfer | full national+earnings pension band | Kela / Finnish Centre for Pensions |
| `kela-unemp` | unemployment benefit | basic + earnings-related band | Kela |
| `kela-study` | study grant | study grant + housing supplement | Kela |
| `kela-child` | child benefit | ~€95–170/month per child | Kela |

## Calibration anchors (validation targets, not inputs)

- **Equivalised disposable-income Gini ≈ 0.266** (Eurostat, 2023). The model
  reports `disposableGini` (adults, un-equivalised in P1) as the comparable figure.
- **Top-10% net wealth share ≈ 52%** (Statistics Finland, 2023) — target for the
  wealth proxy once P3 adds real accumulation dynamics.

## Known caveats (kept visible, not hidden)

- P1 does **not** equivalise income by household, so `disposableGini` runs a few
  points above the Eurostat figure; it is a calibration guide, not a published claim.
- Independent sampling across empirical ranges can produce incoherent worlds
  (e.g. high union density with high wage dispersion). Correlation structure is
  out of scope for the first uncertainty pass — documented, not assumed away.
- The wealth metric is a crude proxy until P3; treat top-share figures as
  illustrative for now.
