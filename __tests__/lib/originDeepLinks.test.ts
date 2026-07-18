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

  test('DGIdb uses molecule name in search', () => {
    const r = originSourceDeepLink('dgidb', ctx)
    expect(r.href).toContain('dgidb.org')
    expect(r.href).toContain(encodeURIComponent('Aspirin'))
  })

  test('ClinicalTrials includes name and disease', () => {
    const r = originSourceDeepLink('clinicaltrials-intervention', ctx)
    expect(r.href).toContain('clinicaltrials.gov/search')
    expect(r.href).toContain('Aspirin')
  })

  test('ChEMBL prefers compound report card', () => {
    const r = originSourceDeepLink('chembl-indication', ctx)
    expect(r.href).toContain('CHEMBL25')
    expect(r.href).toContain('compound_report_card')
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

  test('ChEMBL Mechanisms → compound report card', () => {
    const r = originSourceDeepLink('ChEMBL Mechanisms', ctx)
    expect(r.href).toContain('CHEMBL25')
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
