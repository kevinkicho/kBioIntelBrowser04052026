import { originSourceDeepLink } from '@/lib/originDeepLinks'

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
})
