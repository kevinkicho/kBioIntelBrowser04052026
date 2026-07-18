import { unichemMappingDeepLink } from '@/lib/api/unichem'

describe('unichemMappingDeepLink', () => {
  test('ChEMBL → explore compound page', () => {
    expect(unichemMappingDeepLink('chembl', 'CHEMBL25', '1')).toBe(
      'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL25',
    )
    expect(unichemMappingDeepLink('ChEMBL', '25', '1')).toContain('CHEMBL25')
  })

  test('PubChem → compound page', () => {
    expect(unichemMappingDeepLink('pubchem', '2244', '22')).toBe(
      'https://pubchem.ncbi.nlm.nih.gov/compound/2244',
    )
  })

  test('DrugBank → drug card', () => {
    expect(unichemMappingDeepLink('drugbank', 'DB00945', '2')).toContain(
      'go.drugbank.com/drugs/DB00945',
    )
  })

  test('ChEBI → searchId', () => {
    expect(unichemMappingDeepLink('chebi', '15365', '7')).toContain('chebiId=')
    expect(unichemMappingDeepLink('chebi', '15365', '7')).toContain('15365')
  })

  test('HMDB metabolite', () => {
    expect(unichemMappingDeepLink('hmdb', 'HMDB0000122', '18')).toContain(
      'hmdb.ca/metabolites/HMDB0000122',
    )
  })

  test('never returns bare UniChem homepage hash search', () => {
    const href = unichemMappingDeepLink('chembl', 'CHEMBL25')
    expect(href).not.toMatch(/unichem\/#/)
    expect(href).not.toMatch(/unichem\/?$/)
  })
})
