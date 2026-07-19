import {
  chemblActivityDeepLink,
  chemblCompoundIndicationsUrl,
  chemblCompoundUrl,
  chemblIndicationDeepLink,
  chemblMechanismDeepLink,
  chemblTargetUrl,
  isStableChemblDeepLink,
  normalizeChemblId,
} from '@/lib/chemblLinks'

describe('chemblLinks', () => {
  it('normalizes CHEMBL ids', () => {
    expect(normalizeChemblId('chembl25')).toBe('CHEMBL25')
    expect(normalizeChemblId('25')).toBe('CHEMBL25')
    expect(normalizeChemblId('CHEMBL230')).toBe('CHEMBL230')
    expect(normalizeChemblId('')).toBeNull()
  })

  it('builds explore compound and target URLs', () => {
    expect(chemblCompoundUrl('CHEMBL25')).toBe(
      'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL25',
    )
    expect(chemblTargetUrl('CHEMBL230')).toBe(
      'https://www.ebi.ac.uk/chembl/explore/target/CHEMBL230',
    )
    expect(chemblCompoundIndicationsUrl('25')).toBe(
      'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL25#DrugIndications',
    )
    expect(chemblCompoundIndicationsUrl('25')).not.toContain('/embed/')
  })

  it('rejects homepage and SPA hash URLs as unstable', () => {
    expect(isStableChemblDeepLink('https://www.ebi.ac.uk/chembl/')).toBe(false)
    expect(
      isStableChemblDeepLink(
        'https://www.ebi.ac.uk/chembl/g/#browse/drug_indications/filter/molecule_chembl_id:CHEMBL25',
      ),
    ).toBe(false)
    expect(
      isStableChemblDeepLink(
        'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL25',
      ),
    ).toBe(true)
  })

  it('activity prefers target explore card', () => {
    const href = chemblActivityDeepLink({
      targetChemblId: 'CHEMBL230',
      moleculeChemblId: 'CHEMBL25',
    })
    expect(href).toContain('explore/target/CHEMBL230')
  })

  it('mechanism falls back to molecule when no target', () => {
    const href = chemblMechanismDeepLink({ moleculeChemblId: 'CHEMBL25' })
    expect(href).toContain('explore/compound/CHEMBL25')
  })

  it('indication prefers MeSH (condition-specific) over compound page', () => {
    const href = chemblIndicationDeepLink({
      moleculeChemblId: 'CHEMBL25',
      meshId: 'D008173',
    })
    expect(href).toContain('meshb.nlm.nih.gov')
    expect(href).toContain('D008173')
    expect(href).not.toContain('/embed/')
    expect(href).not.toContain('/g/#browse')
  })

  it('indication falls back to MeSH when no molecule id', () => {
    const href = chemblIndicationDeepLink({ meshId: 'D008173', condition: 'Pain' })
    expect(href).toContain('meshb.nlm.nih.gov')
    expect(href).toContain('D008173')
  })

  it('indication uses compound#DrugIndications when no ontology ids', () => {
    const href = chemblIndicationDeepLink({
      moleculeChemblId: 'CHEMBL25',
      condition: 'Pain',
    })
    expect(href).toBe(
      'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL25#DrugIndications',
    )
  })

  it('indication falls back to EFO OLS when mesh missing', () => {
    const href = chemblIndicationDeepLink({
      moleculeChemblId: 'CHEMBL25',
      efoId: 'EFO_0003843',
    })
    expect(href).toContain('ols4/ontologies/efo')
    expect(href).toContain('EFO_0003843')
  })
})
