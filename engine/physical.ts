// engine/physical.ts
// The physical economy: energy and materials are where output actually comes
// from; money only directs them. This module turns the physical parameters into
// a PhysicalState and, crucially, a `productivityFactor` that scales the economic
// pie — so switching the energy mix, dropping infrastructure, or losing net
// energy to a low-EROI source makes everyone poorer (and changes emissions),
// which is the whole "wealth comes from energy and material flows" argument.
//
// The factor is normalised to exactly 1.0 at the Finland baseline, so P3 does not
// move any economic number until you actually change a physical lever.

import type { Params, PhysicalParams, PhysicalState, SankeyLink } from './types';
import { FINLAND_BASELINE } from '../data/finland-baseline';

const SOURCES = ['fossil', 'nuclear', 'renewable'] as const;
type Source = (typeof SOURCES)[number];

/** Net useful energy per capita: gross energy, minus the energy spent getting it (EROI), × efficiency. */
function netUsefulEnergy(e: PhysicalParams): { net: number; useful: number; bySource: Record<Source, number> } {
  let net = 0;
  const bySource = { fossil: 0, nuclear: 0, renewable: 0 } as Record<Source, number>;
  for (const s of SOURCES) {
    const gross = e.primaryEnergyIndex.value * e.energyMix[s].value;
    const eroi = Math.max(1.01, e.eroi[s].value);
    const n = gross * (1 - 1 / eroi); // net energy after energy-investment
    bySource[s] = n;
    net += n;
  }
  return { net, useful: net * e.conversionEfficiency.value, bySource };
}

// Reference net useful energy at the baseline, so the factor is 1.0 there.
const REF = netUsefulEnergy(FINLAND_BASELINE.physical).useful;

export function computePhysical(p: Params): PhysicalState {
  const e = p.physical;
  const { net, useful, bySource } = netUsefulEnergy(e);

  // Productivity from energy (sublinear) and infrastructure (sublinear), normalised to baseline.
  const energyFactor = Math.pow(useful / REF, e.energyElasticity.value);
  const infraFactor = Math.pow(Math.max(0.01, e.infrastructure.value), e.infraElasticity.value);
  const productivityFactor = energyFactor * infraFactor;

  const realOutput = p.perCapitaOutput.value * p.population * p.productivityMultiplier.value * productivityFactor;

  const primaryEnergy: Record<string, number> = {};
  let grossTotal = 0;
  for (const s of SOURCES) {
    primaryEnergy[s] = e.primaryEnergyIndex.value * e.energyMix[s].value;
    grossTotal += primaryEnergy[s];
  }
  const emissions = primaryEnergy['fossil'] * e.emissionFactorFossil.value;
  const eroiBlended = grossTotal > 0 ? grossTotal / (grossTotal - net) : 0;

  // Materials scale with the (normalised) size of the economy and material intensity.
  const scale = productivityFactor * p.productivityMultiplier.value;
  const throughput = scale * e.materialIntensity.value;
  const recycled = throughput * e.recyclingRate.value;
  const virgin = throughput - recycled;
  const waste = virgin; // virgin material eventually leaves the stock (single-year proxy)

  return {
    primaryEnergy,
    netEnergy: net,
    usefulWork: useful,
    eroiBlended,
    renewableShare: grossTotal > 0 ? primaryEnergy['renewable'] / grossTotal : 0,
    emissions,
    materials: { throughput, virgin, recycled, waste },
    productivityFactor,
    realOutput,
  };
}

/** Energy Sankey: each source splits into useful work, EROI+conversion losses, and (fossil) emissions. */
export function energySankey(p: Params, phys: PhysicalState): SankeyLink[] {
  const e = p.physical;
  const eff = e.conversionEfficiency.value;
  const links: SankeyLink[] = [];
  const COLOR_BY: Record<Source, string> = { fossil: 'Fossil', nuclear: 'Nuclear', renewable: 'Renewable' };
  for (const s of SOURCES) {
    const gross = phys.primaryEnergy[s];
    if (gross <= 0) continue;
    const eroi = Math.max(1.01, e.eroi[s].value);
    const net = gross * (1 - 1 / eroi);
    const useful = net * eff;
    const node = COLOR_BY[s];
    links.push({ source: 'Primary energy', target: node, value: gross });
    links.push({ source: node, target: 'Useful work', value: useful });
    links.push({ source: node, target: 'Lost (EROI + conversion)', value: gross - useful });
  }
  links.push({ source: 'Useful work', target: 'Economic output', value: phys.usefulWork });
  return links.filter((l) => l.value > 0);
}
