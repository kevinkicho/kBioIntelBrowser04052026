import {
  computeDelta,
  formatDelta,
  computeOverlaps,
  computePhaseDistribution,
  buildNumericComparisons,
  type DeltaResult,
} from '@/app/compare/comparisonUtils'

describe('computeDelta', () => {
  it('returns neutral when values are equal', () => {
    const result = computeDelta(5, 5)
    expect(result.diff).toBe(0)
    expect(result.direction).toBe('neutral')
    expect(result.labelA).toBe('0')
    expect(result.labelB).toBe('0')
  })

  it('returns positive direction when A is higher and higherIsGood=true', () => {
    const result = computeDelta(10, 3, true)
    expect(result.diff).toBe(7)
    expect(result.direction).toBe('positive')
    expect(result.labelA).toBe('+7')
    expect(result.labelB).toBe('-7')
  })

  it('returns negative direction when A is higher and higherIsGood=false', () => {
    const result = computeDelta(10, 3, false)
    expect(result.diff).toBe(7)
    expect(result.direction).toBe('negative')
  })

  it('returns negative direction when B is higher and higherIsGood=true', () => {
    const result = computeDelta(3, 10, true)
    expect(result.diff).toBe(7)
    expect(result.direction).toBe('negative')
  })

  it('returns positive direction when B is higher and higherIsGood=false', () => {
    const result = computeDelta(3, 10, false)
    expect(result.direction).toBe('positive')
  })

  it('handles zero values', () => {
    const result = computeDelta(0, 5, true)
    expect(result.diff).toBe(5)
    expect(result.direction).toBe('negative')
  })

  it('returns correct labels when B is higher', () => {
    const result = computeDelta(3, 10, true)
    expect(result.diff).toBe(7)
    expect(result.direction).toBe('negative')
    expect(result.labelA).toBe('-7')
    expect(result.labelB).toBe('+7')
  })
})

describe('formatDelta', () => {
  it('returns "equal" for neutral', () => {
    expect(formatDelta({ diff: 0, direction: 'neutral', labelA: '0', labelB: '0' } as DeltaResult)).toBe('equal')
  })

  it('returns diff as string for non-neutral', () => {
    expect(formatDelta({ diff: 7, direction: 'positive', labelA: '+7', labelB: '-7' } as DeltaResult)).toBe('7')
  })
})

describe('computePhaseDistribution', () => {
  it('returns zeros when no trials', () => {
    const result = computePhaseDistribution([])
    expect(result).toEqual({ phase1: 0, phase2: 0, phase3: 0, phase4: 0 })
  })

  it('counts each phase correctly', () => {
    const trials = [
      { phase: 'Phase 1', nctId: '1', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { phase: 'Phase 1', nctId: '2', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { phase: 'Phase 2', nctId: '3', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { phase: 'Phase 3', nctId: '4', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { phase: 'Phase 4', nctId: '5', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { phase: 'phase 2', nctId: '6', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
    ]
    const result = computePhaseDistribution(trials)
    expect(result).toEqual({ phase1: 2, phase2: 2, phase3: 1, phase4: 1 })
  })

  it('ignores trials without a phase', () => {
    const trials = [
      { phase: '', nctId: '1', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { phase: 'Not Applicable', nctId: '2', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
    ]
    const result = computePhaseDistribution(trials)
    expect(result).toEqual({ phase1: 0, phase2: 0, phase3: 0, phase4: 0 })
  })

  it('counts multi-phase trials only in the highest phase', () => {
    const trials = [
      { phase: 'Phase 1/Phase 2', nctId: '1', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { phase: 'Phase 2/Phase 3', nctId: '2', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
    ]
    const result = computePhaseDistribution(trials)
    expect(result).toEqual({ phase1: 0, phase2: 1, phase3: 1, phase4: 0 })
  })

  it('counts Phase 1/Phase 2/Phase 3 only in Phase 3', () => {
    const trials = [
      { phase: 'Phase 1/Phase 2/Phase 3', nctId: '1', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
    ]
    const result = computePhaseDistribution(trials)
    expect(result).toEqual({ phase1: 0, phase2: 0, phase3: 1, phase4: 0 })
  })
})

describe('computeOverlaps', () => {
  const makeData = (overrides: Record<string, unknown> = {}) => ({
    uniprotEntries: [] as Array<{ accession: string; proteinName: string; geneName: string; organism: string }>,
    reactomePathways: [] as Array<{ stId: string; name: string; url: string; species: string }>,
    companies: [] as Array<{ company: string; brandName: string; genericName: string; productType: string; route: string; applicationNumber: string }>,
    chemblIndications: [] as Array<{ indicationId: string; moleculeName: string; condition: string; maxPhase: number; maxPhaseForIndication: number; meshId: string; meshHeading: string; efoId: string; efoTerm: string; url: string }>,
    ...overrides,
  })

  it('returns empty overlaps when no data', () => {
    const result = computeOverlaps(makeData(), makeData())
    expect(result.sharedTargets).toEqual([])
    expect(result.sharedPathways).toEqual([])
    expect(result.sharedManufacturers).toEqual([])
    expect(result.sharedIndications).toEqual([])
  })

  it('computes shared targets from UniProt entries', () => {
    const a = makeData({
      uniprotEntries: [
        { accession: 'P1', proteinName: 'A', geneName: 'BRCA1', organism: 'Human' },
        { accession: 'P2', proteinName: 'B', geneName: 'TP53', organism: 'Human' },
      ],
    })
    const b = makeData({
      uniprotEntries: [
        { accession: 'P3', proteinName: 'C', geneName: 'TP53', organism: 'Human' },
        { accession: 'P4', proteinName: 'D', geneName: 'EGFR', organism: 'Human' },
      ],
    })
    const result = computeOverlaps(a, b)
    expect(result.sharedTargets).toEqual(['TP53'])
    expect(result.onlyInA.targets).toEqual(['BRCA1'])
    expect(result.onlyInB.targets).toEqual(['EGFR'])
  })

  it('computes shared pathways from Reactome entries', () => {
    const a = makeData({
      reactomePathways: [
        { stId: '1', name: 'Apoptosis', url: '', species: 'Homo sapiens' },
        { stId: '2', name: 'Metabolism', url: '', species: 'Homo sapiens' },
      ],
    })
    const b = makeData({
      reactomePathways: [
        { stId: '3', name: 'Apoptosis', url: '', species: 'Homo sapiens' },
        { stId: '4', name: 'Signaling', url: '', species: 'Homo sapiens' },
      ],
    })
    const result = computeOverlaps(a, b)
    expect(result.sharedPathways).toEqual(['Apoptosis'])
    expect(result.onlyInA.pathways).toEqual(['Metabolism'])
    expect(result.onlyInB.pathways).toEqual(['Signaling'])
  })

  it('computes shared manufacturers', () => {
    const a = makeData({
      companies: [
        { company: 'Pfizer', brandName: 'X', genericName: 'Y', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
        { company: 'Novartis', brandName: 'X', genericName: 'Y', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
      ],
    })
    const b = makeData({
      companies: [
        { company: 'Pfizer', brandName: 'Z', genericName: 'W', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
        { company: 'Roche', brandName: 'Z', genericName: 'W', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
      ],
    })
    const result = computeOverlaps(a, b)
    expect(result.sharedManufacturers).toEqual(['Pfizer'])
    expect(result.onlyInA.manufacturers).toEqual(['Novartis'])
    expect(result.onlyInB.manufacturers).toEqual(['Roche'])
  })

  it('computes shared indications using meshHeading', () => {
    const a = makeData({
      chemblIndications: [
        { indicationId: '1', moleculeName: 'A', condition: 'Diabetes', maxPhase: 3, maxPhaseForIndication: 3, meshId: 'M1', meshHeading: 'Diabetes Mellitus', efoId: 'E1', efoTerm: 'DM', url: '' },
      ],
    })
    const b = makeData({
      chemblIndications: [
        { indicationId: '2', moleculeName: 'B', condition: 'Diabetes', maxPhase: 2, maxPhaseForIndication: 2, meshId: 'M1', meshHeading: 'Diabetes Mellitus', efoId: 'E1', efoTerm: 'DM', url: '' },
        { indicationId: '3', moleculeName: 'B', condition: 'Hypertension', maxPhase: 2, maxPhaseForIndication: 2, meshId: 'M2', meshHeading: 'Hypertension', efoId: 'E2', efoTerm: 'HTN', url: '' },
      ],
    })
    const result = computeOverlaps(a, b)
    expect(result.sharedIndications).toEqual(['Diabetes Mellitus'])
    expect(result.onlyInB.indications).toEqual(['Hypertension'])
  })

  it('falls back to condition when meshHeading is empty', () => {
    const a = makeData({
      chemblIndications: [
        { indicationId: '1', moleculeName: 'A', condition: 'Asthma', maxPhase: 3, maxPhaseForIndication: 3, meshId: 'M1', meshHeading: '', efoId: 'E1', efoTerm: '', url: '' },
      ],
    })
    const b = makeData({
      chemblIndications: [
        { indicationId: '2', moleculeName: 'B', condition: 'Asthma', maxPhase: 2, maxPhaseForIndication: 2, meshId: 'M2', meshHeading: '', efoId: 'E2', efoTerm: '', url: '' },
      ],
    })
    const result = computeOverlaps(a, b)
    expect(result.sharedIndications).toEqual(['Asthma'])
  })

  it('filters out entries with empty geneName, company, or pathway name', () => {
    const a = makeData({
      uniprotEntries: [
        { accession: 'P1', proteinName: 'A', geneName: '', organism: 'Human' },
        { accession: 'P2', proteinName: 'B', geneName: 'BRCA1', organism: 'Human' },
      ],
      reactomePathways: [
        { stId: '1', name: '', url: '', species: 'Homo sapiens' },
        { stId: '2', name: 'Apoptosis', url: '', species: 'Homo sapiens' },
      ],
      companies: [
        { company: '', brandName: 'X', genericName: 'Y', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
        { company: 'Pfizer', brandName: 'X', genericName: 'Y', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
      ],
      chemblIndications: [
        { indicationId: '1', moleculeName: 'A', condition: '', maxPhase: 3, maxPhaseForIndication: 3, meshId: 'M1', meshHeading: '', efoId: 'E1', efoTerm: '', url: '' },
      ],
    })
    const b = makeData({
      uniprotEntries: [
        { accession: 'P3', proteinName: 'C', geneName: 'BRCA1', organism: 'Human' },
      ],
      reactomePathways: [
        { stId: '3', name: 'Apoptosis', url: '', species: 'Homo sapiens' },
      ],
      companies: [
        { company: 'Pfizer', brandName: 'Z', genericName: 'W', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
      ],
      chemblIndications: [],
    })
    const result = computeOverlaps(a, b)
    expect(result.sharedTargets).toEqual(['BRCA1'])
    expect(result.sharedPathways).toEqual(['Apoptosis'])
    expect(result.sharedManufacturers).toEqual(['Pfizer'])
    expect(result.sharedIndications).toEqual([])
  })

  it('computes onlyInA and onlyInB for pathways', () => {
    const a = makeData({
      reactomePathways: [
        { stId: '1', name: 'Apoptosis', url: '', species: 'Homo sapiens' },
        { stId: '2', name: 'Metabolism', url: '', species: 'Homo sapiens' },
      ],
    })
    const b = makeData({
      reactomePathways: [
        { stId: '3', name: 'Apoptosis', url: '', species: 'Homo sapiens' },
        { stId: '4', name: 'Signaling', url: '', species: 'Homo sapiens' },
      ],
    })
    const result = computeOverlaps(a, b)
    expect(result.sharedPathways).toEqual(['Apoptosis'])
    expect(result.onlyInA.pathways).toEqual(['Metabolism'])
    expect(result.onlyInB.pathways).toEqual(['Signaling'])
  })

  it('computes onlyInA and onlyInB for manufacturers', () => {
    const a = makeData({
      companies: [
        { company: 'Pfizer', brandName: 'X', genericName: 'Y', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
        { company: 'Novartis', brandName: 'X', genericName: 'Y', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
      ],
    })
    const b = makeData({
      companies: [
        { company: 'Pfizer', brandName: 'Z', genericName: 'W', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
        { company: 'Roche', brandName: 'Z', genericName: 'W', productType: 'TYPE', route: 'R', applicationNumber: 'A' },
      ],
    })
    const result = computeOverlaps(a, b)
    expect(result.sharedManufacturers).toEqual(['Pfizer'])
    expect(result.onlyInA.manufacturers).toEqual(['Novartis'])
    expect(result.onlyInB.manufacturers).toEqual(['Roche'])
  })

  it('computes onlyInA and onlyInB for indications', () => {
    const a = makeData({
      chemblIndications: [
        { indicationId: '1', moleculeName: 'A', condition: 'Diabetes', maxPhase: 3, maxPhaseForIndication: 3, meshId: 'M1', meshHeading: 'Diabetes Mellitus', efoId: 'E1', efoTerm: 'DM', url: '' },
        { indicationId: '2', moleculeName: 'A', condition: 'Arthritis', maxPhase: 2, maxPhaseForIndication: 2, meshId: 'M2', meshHeading: 'Arthritis', efoId: 'E2', efoTerm: '', url: '' },
      ],
    })
    const b = makeData({
      chemblIndications: [
        { indicationId: '3', moleculeName: 'B', condition: 'Diabetes', maxPhase: 2, maxPhaseForIndication: 2, meshId: 'M1', meshHeading: 'Diabetes Mellitus', efoId: 'E1', efoTerm: 'DM', url: '' },
        { indicationId: '4', moleculeName: 'B', condition: 'Hypertension', maxPhase: 2, maxPhaseForIndication: 2, meshId: 'M3', meshHeading: 'Hypertension', efoId: 'E3', efoTerm: 'HTN', url: '' },
      ],
    })
    const result = computeOverlaps(a, b)
    expect(result.sharedIndications).toEqual(['Diabetes Mellitus'])
    expect(result.onlyInA.indications).toEqual(['Arthritis'])
    expect(result.onlyInB.indications).toEqual(['Hypertension'])
  })
})

describe('buildNumericComparisons', () => {
  const makeData = (overrides: Record<string, unknown> = {}) => ({
    companies: [] as Array<unknown>,
    ndcProducts: [] as Array<unknown>,
    orangeBookEntries: [] as Array<unknown>,
    drugLabels: [] as Array<unknown>,
    drugInteractions: [] as Array<unknown>,
    trials: [] as Array<{ phase: string; nctId: string; title: string; status: string; startDate: string; completionDate: string; conditions: string[]; interventions: string[]; sponsor: string }>,
    adverseEvents: [] as Array<unknown>,
    drugRecalls: [] as Array<unknown>,
    chemblIndications: [] as Array<unknown>,
    chemblActivities: [] as Array<unknown>,
    uniprotEntries: [] as Array<unknown>,
    pdbStructures: [] as Array<unknown>,
    reactomePathways: [] as Array<unknown>,
    patents: [] as Array<unknown>,
    nihGrants: [] as Array<unknown>,
    literature: [] as Array<unknown>,
    semanticPapers: [] as Array<unknown>,
    ghsHazards: null as { pictogramUrls?: string[] } | null,
    ...overrides,
  })

  it('builds comparisons for all metric categories', () => {
    const comparisons = buildNumericComparisons(makeData() as any, makeData() as any)
    expect(comparisons.length).toBeGreaterThanOrEqual(15)
  })

  it('marks adverse events and recalls as higherIsGood=false', () => {
    const comparisons = buildNumericComparisons(makeData() as any, makeData() as any)
    const adverse = comparisons.find(c => c.label === 'Adverse Events')
    const recalls = comparisons.find(c => c.label === 'Drug Recalls')
    const interactions = comparisons.find(c => c.label === 'Drug Interactions')
    const hazards = comparisons.find(c => c.label === 'GHS Hazard Pictograms')
    expect(adverse?.higherIsGood).toBe(false)
    expect(recalls?.higherIsGood).toBe(false)
    expect(interactions?.higherIsGood).toBe(false)
    expect(hazards?.higherIsGood).toBe(false)
  })

  it('marks research metrics as higherIsGood=true', () => {
    const comparisons = buildNumericComparisons(makeData() as any, makeData() as any)
    const trials = comparisons.find(c => c.label === 'Clinical Trials')
    const patents = comparisons.find(c => c.label === 'Patents')
    const grants = comparisons.find(c => c.label === 'NIH Grants')
    expect(trials?.higherIsGood).toBe(true)
    expect(patents?.higherIsGood).toBe(true)
    expect(grants?.higherIsGood).toBe(true)
  })

  it('uses pictogramUrls length when ghsHazards is non-null', () => {
    const a = makeData({ ghsHazards: { pictogramUrls: ['url1', 'url2', 'url3'] } })
    const b = makeData({ ghsHazards: { pictogramUrls: ['url1'] } })
    const comparisons = buildNumericComparisons(a as any, b as any)
    const hazards = comparisons.find(c => c.label === 'GHS Hazard Pictograms')
    expect(hazards?.valueA).toBe(3)
    expect(hazards?.valueB).toBe(1)
  })

  it('uses 0 for ghsHazards when pictogramUrls is missing', () => {
    const a = makeData({ ghsHazards: {} })
    const b = makeData({ ghsHazards: null })
    const comparisons = buildNumericComparisons(a as any, b as any)
    const hazards = comparisons.find(c => c.label === 'GHS Hazard Pictograms')
    expect(hazards?.valueA).toBe(0)
    expect(hazards?.valueB).toBe(0)
  })

  it('computes correct valueA and valueB for all metrics', () => {
    const a = makeData({
      companies: [1, 2, 3],
      ndcProducts: [1],
      orangeBookEntries: [1, 2],
      drugLabels: [1, 2, 3, 4],
      drugInteractions: [1],
      trials: [
        { phase: 'Phase 1', nctId: '1', title: '', status: '', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      ],
      adverseEvents: [1, 2],
      drugRecalls: [1],
      chemblIndications: [1, 2],
      chemblActivities: [1, 2, 3, 4, 5],
      uniprotEntries: [1],
      pdbStructures: [1, 2],
      reactomePathways: [1],
      patents: [1, 2, 3],
      nihGrants: [1],
      literature: [1, 2],
      semanticPapers: [1, 2, 3],
      ghsHazards: { pictogramUrls: ['u1', 'u2'] },
    })
    const b = makeData({
      companies: [1],
      ndcProducts: [1, 2, 3],
      orangeBookEntries: [1],
      drugLabels: [1],
      drugInteractions: [1, 2, 3],
      trials: [] as Array<{ phase: string; nctId: string; title: string; status: string; startDate: string; completionDate: string; conditions: string[]; interventions: string[]; sponsor: string }>,
      adverseEvents: [],
      drugRecalls: [1, 2],
      chemblIndications: [1, 2, 3, 4],
      chemblActivities: [1],
      uniprotEntries: [1, 2, 3],
      pdbStructures: [],
      reactomePathways: [1, 2, 3],
      patents: [1],
      nihGrants: [1, 2, 3],
      literature: [1],
      semanticPapers: [],
      ghsHazards: null,
    })
    const comparisons = buildNumericComparisons(a as any, b as any)

    const find = (label: string) => comparisons.find(c => c.label === label)!
    expect(find('Manufacturers').valueA).toBe(3)
    expect(find('Manufacturers').valueB).toBe(1)
    expect(find('NDC Products').valueA).toBe(1)
    expect(find('NDC Products').valueB).toBe(3)
    expect(find('Orange Book Entries').valueA).toBe(2)
    expect(find('Orange Book Entries').valueB).toBe(1)
    expect(find('Drug Labels').valueA).toBe(4)
    expect(find('Drug Labels').valueB).toBe(1)
    expect(find('Drug Interactions').valueA).toBe(1)
    expect(find('Drug Interactions').valueB).toBe(3)
    expect(find('Clinical Trials').valueA).toBe(1)
    expect(find('Clinical Trials').valueB).toBe(0)
    expect(find('Adverse Events').valueA).toBe(2)
    expect(find('Adverse Events').valueB).toBe(0)
    expect(find('Drug Recalls').valueA).toBe(1)
    expect(find('Drug Recalls').valueB).toBe(2)
    expect(find('ChEMBL Indications').valueA).toBe(2)
    expect(find('ChEMBL Indications').valueB).toBe(4)
    expect(find('ChEMBL Activities').valueA).toBe(5)
    expect(find('ChEMBL Activities').valueB).toBe(1)
    expect(find('Protein Targets').valueA).toBe(1)
    expect(find('Protein Targets').valueB).toBe(3)
    expect(find('PDB Structures').valueA).toBe(2)
    expect(find('PDB Structures').valueB).toBe(0)
    expect(find('Reactome Pathways').valueA).toBe(1)
    expect(find('Reactome Pathways').valueB).toBe(3)
    expect(find('Patents').valueA).toBe(3)
    expect(find('Patents').valueB).toBe(1)
    expect(find('NIH Grants').valueA).toBe(1)
    expect(find('NIH Grants').valueB).toBe(3)
    expect(find('Publications').valueA).toBe(3)
    expect(find('Publications').valueB).toBe(1)
    expect(find('GHS Hazard Pictograms').valueA).toBe(2)
    expect(find('GHS Hazard Pictograms').valueB).toBe(0)
  })
})