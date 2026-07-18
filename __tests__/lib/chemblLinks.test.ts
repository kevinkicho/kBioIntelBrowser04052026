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
    expect(chemblCompoundIndicationsUrl('25')).toContain('CHEMBL25')
    expect(chemblCompoundIndicationsUrl('25')).toContain(
      'drug_indications/CHEMBL25',
    )
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
        'https://www.ebi.ac.uk/chembl/embed/report_cards/compound/sections/drug_indications/CHEMBL25',
      ),
    ).toBe(true)
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

  it('indication uses drug_indications embed not SPA browse hash or homepage', () => {
    const href = chemblIndicationDeepLink({ moleculeChemblId: 'CHEMBL25', meshId: 'D008173' })
    expect(href).toContain('drug_indications/CHEMBL25')
    expect(href).not.toContain('/g/#browse')
    expect(href).not.toMatch(/\/chembl\/?$/)
  })

  it('indication falls back to MeSH when no molecule id', () => {
    const href = chemblIndicationDeepLink({ meshId: 'D008173', condition: 'Pain' })
    expect(href).toContain('meshb.nlm.nih.gov')
    expect(href).toContain('D008173')
  })
})
