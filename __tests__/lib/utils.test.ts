import { classifyMolecule, formatMolecularWeight, buildStructureImageUrl } from '@/lib/utils'

describe('classifyMolecule', () => {
  test('classifies known therapeutic keywords', () => {
    expect(classifyMolecule('insulin', ['hormone', 'peptide'])).toBe('therapeutic')
  })

  test('classifies enzyme by name pattern', () => {
    expect(classifyMolecule('lipase', ['enzyme', 'hydrolase'])).toBe('enzyme')
  })

  test('classifies reagent', () => {
    expect(classifyMolecule('tris buffer', ['buffer', 'laboratory reagent'])).toBe('reagent')
  })

  test('returns unknown for unrecognized molecules', () => {
    expect(classifyMolecule('xyzcompound', [])).toBe('unknown')
  })
})

describe('formatMolecularWeight', () => {
  test('formats weight with units', () => {
    expect(formatMolecularWeight(180.16)).toBe('180.16 g/mol')
  })

  test('rounds to 2 decimal places', () => {
    expect(formatMolecularWeight(180.1)).toBe('180.10 g/mol')
  })
})

describe('buildStructureImageUrl', () => {
  test('builds PubChem structure image URL from CID', () => {
    expect(buildStructureImageUrl(5793)).toBe(
      'https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=5793&t=l'
    )
  })
})
