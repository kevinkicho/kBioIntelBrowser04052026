import {
  chemblActivityDeepLink,
  chemblCompoundIndicationsUrl,
  chemblCompoundUrl,
  chemblIndicationDeepLink,
  chemblMechanismDeepLink,
  chemblTargetUrl,
  normalizeChemblId,
} from '@/lib/chemblLinks'

describe('chemblLinks', () => {
  it('normalizes CHEMBL ids', () => {
    expect(normalizeChemblId('chembl25')).toBe('CHEMBL25')
    expect(normalizeChemblId('25')).toBe('CHEMBL25')
    expect(normalizeChemblId('CHEMBL230')).toBe('CHEMBL230')
    expect(normalizeChemblId('')).toBeNull()
  })

  it('builds compound and target report cards', () => {
    expect(chemblCompoundUrl('CHEMBL25')).toBe(
      'https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL25/',
    )
    expect(chemblTargetUrl('CHEMBL230')).toBe(
      'https://www.ebi.ac.uk/chembl/target_report_card/CHEMBL230/',
    )
    expect(chemblCompoundIndicationsUrl('25')).toContain('CHEMBL25')
    expect(chemblCompoundIndicationsUrl('25')).toContain('#DrugIndications')
  })

  it('activity prefers target report card', () => {
    const href = chemblActivityDeepLink({
      targetChemblId: 'CHEMBL230',
      moleculeChemblId: 'CHEMBL25',
    })
    expect(href).toContain('target_report_card/CHEMBL230')
  })

  it('mechanism falls back to molecule when no target', () => {
    const href = chemblMechanismDeepLink({ moleculeChemblId: 'CHEMBL25' })
    expect(href).toContain('compound_report_card/CHEMBL25')
  })

  it('indication uses compound DrugIndications not SPA browse hash', () => {
    const href = chemblIndicationDeepLink({ moleculeChemblId: 'CHEMBL25', meshId: 'D008173' })
    expect(href).toContain('compound_report_card')
    expect(href).not.toContain('/g/#browse')
  })
})
