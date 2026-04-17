import type {
  UniprotEntry, ReactomePathway, CompanyProduct, ChemblIndication,
  ClinicalTrial,
} from '@/lib/types'

export type DeltaDirection = 'positive' | 'negative' | 'neutral'

export interface DeltaResult {
  diff: number
  direction: DeltaDirection
  labelA: string
  labelB: string
}

export function computeDelta(
  a: number,
  b: number,
  higherIsGood: boolean = true,
): DeltaResult {
  const diff = a - b
  let direction: DeltaDirection = 'neutral'
  if (diff > 0) direction = higherIsGood ? 'positive' : 'negative'
  else if (diff < 0) direction = higherIsGood ? 'negative' : 'positive'

  return {
    diff: Math.abs(diff),
    direction,
    labelA: diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0',
    labelB: diff < 0 ? `+${Math.abs(diff)}` : diff > 0 ? `${-diff}` : '0',
  }
}

export function formatDelta(delta: DeltaResult): string {
  if (delta.direction === 'neutral') return 'equal'
  return `${delta.diff}`
}

export interface OverlapResult {
  sharedTargets: string[]
  sharedPathways: string[]
  sharedManufacturers: string[]
  sharedIndications: string[]
  onlyInA: {
    targets: string[]
    pathways: string[]
    manufacturers: string[]
    indications: string[]
  }
  onlyInB: {
    targets: string[]
    pathways: string[]
    manufacturers: string[]
    indications: string[]
  }
}

export function computeOverlaps(dataA: {
  uniprotEntries: UniprotEntry[]
  reactomePathways: ReactomePathway[]
  companies: CompanyProduct[]
  chemblIndications: ChemblIndication[]
}, dataB: {
  uniprotEntries: UniprotEntry[]
  reactomePathways: ReactomePathway[]
  companies: CompanyProduct[]
  chemblIndications: ChemblIndication[]
}): OverlapResult {
  const targetsA = new Set(dataA.uniprotEntries.map(u => u.geneName).filter(Boolean))
  const targetsB = new Set(dataB.uniprotEntries.map(u => u.geneName).filter(Boolean))
  const sharedTargets = intersection(targetsA, targetsB)
  const onlyATargets = difference(targetsA, targetsB)
  const onlyBTargets = difference(targetsB, targetsA)

  const pathwaysA = new Set(dataA.reactomePathways.map(p => p.name).filter(Boolean))
  const pathwaysB = new Set(dataB.reactomePathways.map(p => p.name).filter(Boolean))
  const sharedPathways = intersection(pathwaysA, pathwaysB)
  const onlyAPathways = difference(pathwaysA, pathwaysB)
  const onlyBPathways = difference(pathwaysB, pathwaysA)

  const mfrsA = new Set(dataA.companies.map(c => c.company).filter(Boolean))
  const mfrsB = new Set(dataB.companies.map(c => c.company).filter(Boolean))
  const sharedManufacturers = intersection(mfrsA, mfrsB)
  const onlyAMfrs = difference(mfrsA, mfrsB)
  const onlyBMfrs = difference(mfrsB, mfrsA)

  const indA = new Set(dataA.chemblIndications.map(i => i.meshHeading || i.condition).filter(Boolean))
  const indB = new Set(dataB.chemblIndications.map(i => i.meshHeading || i.condition).filter(Boolean))
  const sharedIndications = intersection(indA, indB)
  const onlyAInd = difference(indA, indB)
  const onlyBInd = difference(indB, indA)

  return {
    sharedTargets,
    sharedPathways,
    sharedManufacturers,
    sharedIndications,
    onlyInA: {
      targets: onlyATargets,
      pathways: onlyAPathways,
      manufacturers: onlyAMfrs,
      indications: onlyAInd,
    },
    onlyInB: {
      targets: onlyBTargets,
      pathways: onlyBPathways,
      manufacturers: onlyBMfrs,
      indications: onlyBInd,
    },
  }
}

export interface PhaseDistribution {
  phase1: number
  phase2: number
  phase3: number
  phase4: number
}

export function computePhaseDistribution(trials: ClinicalTrial[]): PhaseDistribution {
  let phase1 = 0, phase2 = 0, phase3 = 0, phase4 = 0
  for (const t of trials) {
    const phase = (t.phase || '').toLowerCase()
    const hasP4 = phase.includes('phase 4')
    const hasP3 = phase.includes('phase 3')
    const hasP2 = phase.includes('phase 2')
    const hasP1 = phase.includes('phase 1')
    if (hasP4) phase4++
    else if (hasP3) phase3++
    else if (hasP2) phase2++
    else if (hasP1) phase1++
  }
  return { phase1, phase2, phase3, phase4 }
}

export interface NumericComparison {
  label: string
  valueA: number
  valueB: number
  higherIsGood: boolean
}

interface Countable {
  length: number
}

export function buildNumericComparisons(dataA: {
  companies: Countable
  ndcProducts: Countable
  orangeBookEntries: Countable
  drugLabels: Countable
  drugInteractions: Countable
  trials: ClinicalTrial[]
  adverseEvents: Countable
  drugRecalls: Countable
  chemblIndications: Countable
  chemblActivities: Countable
  uniprotEntries: Countable
  pdbStructures: Countable
  reactomePathways: Countable
  patents: Countable
  nihGrants: Countable
  literature: Countable
  semanticPapers: Countable
  ghsHazards: { pictogramUrls?: string[] } | null
}, dataB: typeof dataA): NumericComparison[] {
  return [
    { label: 'Manufacturers', valueA: dataA.companies.length, valueB: dataB.companies.length, higherIsGood: true },
    { label: 'NDC Products', valueA: dataA.ndcProducts.length, valueB: dataB.ndcProducts.length, higherIsGood: true },
    { label: 'Orange Book Entries', valueA: dataA.orangeBookEntries.length, valueB: dataB.orangeBookEntries.length, higherIsGood: true },
    { label: 'Drug Labels', valueA: dataA.drugLabels.length, valueB: dataB.drugLabels.length, higherIsGood: true },
    { label: 'Drug Interactions', valueA: dataA.drugInteractions.length, valueB: dataB.drugInteractions.length, higherIsGood: false },
    { label: 'Clinical Trials', valueA: dataA.trials.length, valueB: dataB.trials.length, higherIsGood: true },
    { label: 'Adverse Events', valueA: dataA.adverseEvents.length, valueB: dataB.adverseEvents.length, higherIsGood: false },
    { label: 'Drug Recalls', valueA: dataA.drugRecalls.length, valueB: dataB.drugRecalls.length, higherIsGood: false },
    { label: 'ChEMBL Indications', valueA: dataA.chemblIndications.length, valueB: dataB.chemblIndications.length, higherIsGood: true },
    { label: 'ChEMBL Activities', valueA: dataA.chemblActivities.length, valueB: dataB.chemblActivities.length, higherIsGood: true },
    { label: 'Protein Targets', valueA: dataA.uniprotEntries.length, valueB: dataB.uniprotEntries.length, higherIsGood: true },
    { label: 'PDB Structures', valueA: dataA.pdbStructures.length, valueB: dataB.pdbStructures.length, higherIsGood: true },
    { label: 'Reactome Pathways', valueA: dataA.reactomePathways.length, valueB: dataB.reactomePathways.length, higherIsGood: true },
    { label: 'Patents', valueA: dataA.patents.length, valueB: dataB.patents.length, higherIsGood: true },
    { label: 'NIH Grants', valueA: dataA.nihGrants.length, valueB: dataB.nihGrants.length, higherIsGood: true },
    { label: 'Publications', valueA: Math.max(dataA.literature.length, dataA.semanticPapers.length), valueB: Math.max(dataB.literature.length, dataB.semanticPapers.length), higherIsGood: true },
    { label: 'GHS Hazard Pictograms', valueA: dataA.ghsHazards?.pictogramUrls?.length ?? 0, valueB: dataB.ghsHazards?.pictogramUrls?.length ?? 0, higherIsGood: false },
  ]
}

function intersection(a: Set<string>, b: Set<string>): string[] {
  const result: string[] = []
  a.forEach(item => {
    if (b.has(item)) result.push(item)
  })
  return result.sort()
}

function difference(a: Set<string>, b: Set<string>): string[] {
  const result: string[] = []
  a.forEach(item => {
    if (!b.has(item)) result.push(item)
  })
  return result.sort()
}