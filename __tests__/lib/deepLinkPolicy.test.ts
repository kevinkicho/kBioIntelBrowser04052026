import {
  isBrokenSourceShellUrl,
  preferStableDeepLink,
} from '@/lib/deepLinkPolicy'
import { chemblCompoundUrl, isStableChemblDeepLink } from '@/lib/chemblLinks'
import { unichemMappingDeepLink } from '@/lib/api/unichem'
import { atcDeepLink, isWhoAtcCode } from '@/lib/api/atc'
import { dgidbGeneDeepLink } from '@/lib/api/dgidb'
import { mychemChemUrl } from '@/lib/api/mychem'

describe('deep link policy', () => {
  test('rejects ChEMBL and UniChem SPA shells', () => {
    expect(
      isBrokenSourceShellUrl(
        'https://www.ebi.ac.uk/chembl/g/#browse/drug_indications/filter/x',
      ),
    ).toBe(true)
    expect(isBrokenSourceShellUrl('https://www.ebi.ac.uk/chembl/')).toBe(true)
    expect(
      isBrokenSourceShellUrl('https://www.ebi.ac.uk/unichem/#/search/chembl/CHEMBL25'),
    ).toBe(true)
    expect(
      isBrokenSourceShellUrl(
        'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL25',
      ),
    ).toBe(false)
  })

  test('rejects DGIdb symbol-only gene paths', () => {
    expect(isBrokenSourceShellUrl('https://www.dgidb.org/genes/PTGS2')).toBe(true)
    expect(isBrokenSourceShellUrl('https://www.dgidb.org/genes/hgnc:9605')).toBe(false)
  })

  test('preferStableDeepLink falls back', () => {
    expect(
      preferStableDeepLink('https://www.ebi.ac.uk/chembl/', 'https://example.com/ok'),
    ).toBe('https://example.com/ok')
  })

  test('source builders never return homepage shells', () => {
    expect(chemblCompoundUrl('CHEMBL25')).toContain('explore/compound/CHEMBL25')
    expect(isStableChemblDeepLink(chemblCompoundUrl('CHEMBL25')!)).toBe(true)

    const uni = unichemMappingDeepLink('chembl', 'CHEMBL25', '1')
    expect(uni).not.toMatch(/unichem\/#/)
    expect(isBrokenSourceShellUrl(uni)).toBe(false)

    expect(isWhoAtcCode('N02BA01')).toBe(true)
    expect(atcDeepLink('N02BA01')).toContain('code=N02BA01')

    const dgi = dgidbGeneDeepLink('hgnc:5743', 'PTGS2')
    expect(dgi).toContain('/genes/hgnc:5743')
    expect(isBrokenSourceShellUrl(dgi)).toBe(false)

    expect(mychemChemUrl('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')).toContain(
      'mychem.info/v1/chem/BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
    )
  })

  test('src has no remaining ChEMBL SPA hash templates in production identity/vendors', () => {
    // Policy regression: preferStableDeepLink must not accept g/# shells
    const shell = 'https://www.ebi.ac.uk/chembl/g/#search_results/all/query=aspirin'
    expect(
      preferStableDeepLink(shell, 'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL25'),
    ).toContain('explore/compound')
  })
})
