import {
  claimProvenanceDeepLink,
  claimTypeDeepLink,
  diseaseDeepLink,
  originSourceDeepLink,
} from '@/lib/originDeepLinks'

describe('originSourceDeepLink', () => {
  const ctx = { name: 'Aspirin', cid: 2244, chemblId: 'CHEMBL25', diseaseName: 'pain' }

  test('PubChem deep-links to compound page', () => {
    const r = originSourceDeepLink('PubChem', ctx)
    expect(r.href).toBe('https://pubchem.ncbi.nlm.nih.gov/compound/2244')
  })

  test('DGIdb uses drug results search for molecule name', () => {
    const r = originSourceDeepLink('dgidb', ctx)
    expect(r.href).toBe(
      'https://www.dgidb.org/results?searchType=drug&searchTerms=Aspirin',
    )
  })

  test('DGIdb prefers gene results when geneSymbol is set', () => {
    const r = originSourceDeepLink('dgidb', { ...ctx, geneSymbol: 'PTGS2' })
    expect(r.href).toBe(
      'https://www.dgidb.org/results?searchType=gene&searchTerms=PTGS2',
    )
  })

  test('ClinicalTrials includes name and disease', () => {
    const r = originSourceDeepLink('clinicaltrials-intervention', ctx)
    expect(r.href).toContain('clinicaltrials.gov/search')
    expect(r.href).toContain('Aspirin')
  })

  test('ChEMBL prefers explore compound page', () => {
    const r = originSourceDeepLink('chembl-indication', ctx)
    expect(r.href).toContain('CHEMBL25')
    expect(r.href).toContain('explore/compound')
  })

  test('manual has no external link', () => {
    const r = originSourceDeepLink('manual', ctx)
    expect(r.href).toBeNull()
  })

  test('OpenFDA (FAERS) pack source → DailyMed', () => {
    const r = originSourceDeepLink('OpenFDA (FAERS)', ctx)
    expect(r.href).toContain('dailymed')
    expect(r.href).toContain('Aspirin')
  })

  test('ChEMBL Mechanisms → explore compound page', () => {
    const r = originSourceDeepLink('ChEMBL Mechanisms', ctx)
    expect(r.href).toContain('CHEMBL25')
    expect(r.href).toContain('explore/compound')
  })
})

describe('diseaseDeepLink', () => {
  test('EFO/ot id → Open Targets disease page', () => {
    const r = diseaseDeepLink({
      name: 'type 2 diabetes mellitus',
      id: 'EFO_0001360',
      idNamespace: 'efo',
    })
    expect(r.href).toContain('platform.opentargets.org/disease/')
    expect(r.href).toContain('EFO_0001360')
  })

  test('name-only → Open Targets search', () => {
    const r = diseaseDeepLink({ name: 'pain', idNamespace: 'name' })
    expect(r.href).toContain('platform.opentargets.org/search')
    expect(r.href).toContain('pain')
  })
})

describe('claimTypeDeepLink', () => {
  const ctx = { name: 'Aspirin', cid: 2244, chemblId: 'CHEMBL25', diseaseName: 'pain' }

  test('trial → ClinicalTrials.gov', () => {
    const r = claimTypeDeepLink('trial', ctx)
    expect(r.href).toContain('clinicaltrials.gov')
    expect(r.href).toContain('Aspirin')
  })

  test('safety → DailyMed', () => {
    const r = claimTypeDeepLink('safety', ctx)
    expect(r.href).toContain('dailymed')
  })

  test('mechanism → ChEMBL', () => {
    const r = claimTypeDeepLink('mechanism', ctx)
    expect(r.href).toContain('chembl')
  })

  test('indicated-for → Open Targets', () => {
    const r = claimTypeDeepLink('indicated-for', ctx)
    expect(r.href).toContain('opentargets.org')
  })
})

describe('claimProvenanceDeepLink', () => {
  test('prefers explicit sourceUrl', () => {
    const r = claimProvenanceDeepLink(
      { source: 'ClinicalTrials.gov', sourceUrl: 'https://clinicaltrials.gov/study/NCT1' },
      { name: 'Aspirin' },
    )
    expect(r.href).toBe('https://clinicaltrials.gov/study/NCT1')
  })

  test('falls back to origin mapper without sourceUrl', () => {
    const r = claimProvenanceDeepLink(
      { source: 'PubChem' },
      { name: 'Aspirin', cid: 2244 },
    )
    expect(r.href).toBe('https://pubchem.ncbi.nlm.nih.gov/compound/2244')
  })
})
