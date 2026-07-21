import { isIdentityShellMolecule } from '@/components/profile/ProfileHeader'

describe('isIdentityShellMolecule', () => {
  it('detects minimal identity shell description', () => {
    expect(
      isIdentityShellMolecule({
        name: 'CID 3080836',
        description: 'Minimal identity shell (upstream identity APIs unavailable).',
        formula: '',
        inchiKey: '',
        molecularWeight: 0,
      }),
    ).toBe(true)
  })

  it('detects bare CID + empty chemistry fields', () => {
    expect(
      isIdentityShellMolecule({
        name: 'CID 2244',
        description: '',
        formula: '',
        inchiKey: '',
        molecularWeight: 0,
      }),
    ).toBe(true)
  })

  it('does not flag a normal molecule', () => {
    expect(
      isIdentityShellMolecule({
        name: 'Aspirin',
        description: 'A common NSAID',
        formula: 'C9H8O4',
        inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        molecularWeight: 180.16,
      }),
    ).toBe(false)
  })

  it('does not flag MyChem-filled identity with real chemistry', () => {
    expect(
      isIdentityShellMolecule({
        name: 'ASPIRIN',
        description:
          'Identity filled via MyChem (PubChem PUG unavailable from this host). Structure image still from PubChem CDN when available.',
        formula: 'C9H8O4',
        inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        molecularWeight: 180.16,
      }),
    ).toBe(false)
  })
})

