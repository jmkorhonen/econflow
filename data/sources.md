# Data sources & provenance

Every empirical and policy parameter in `finland-baseline.ts` references a key
in this file. The rule: **no number without a traceable source and a plausible
range.** P0 values are stylized placeholders; the keys below are stubs to be
filled with proper citations in P1–P2.

| key | parameter | status | intended source |
|-----|-----------|--------|-----------------|
| `TODO-gdp` | real output total | placeholder | Statistics Finland — national accounts / GDP |
| `TODO-energy-mix` | primary energy shares | placeholder | Statistics Finland energy statistics / Eurostat |
| `TODO-eroi` | energy return on investment | placeholder | literature (Hall et al.); range, not point |
| `TODO-wage-share` | labor share of output | placeholder | OECD / Statistics Finland national accounts |
| `TODO-dispersion` | within-labor pay spread | placeholder | OECD earnings dispersion (D9/D1) |
| `TODO-tax-rate` | effective average tax rate | placeholder | VATT / OECD tax database |
| `TODO-social-wage` | in-kind vs cash split | placeholder | OECD social expenditure (SOCX) |
| `TODO-housing` | housing cost burden | placeholder | Eurostat SILC (housing cost overburden) |

## Conventions

- **`kind: empirical`** → range encodes *measurement uncertainty*; eligible for
  uncertainty bands on time-series/compare views.
- **`kind: policy`** → range encodes the *span of the live debate*; this is a
  user-set lever, not uncertainty. Never folded into the same Monte-Carlo draw.
- **`kind: identity`** → exact; accounting must-hold.

## Known caveats (to keep the methodology honest)

- Independent sampling across empirical ranges can produce incoherent worlds
  (e.g. high union density paired with high wage dispersion). Correlation
  structure is out of scope for the first uncertainty pass — documented, not hidden.
