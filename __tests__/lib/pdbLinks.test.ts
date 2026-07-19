import {
  isXrayMethod,
  pdbMethodDeepLink,
  pdbMethodShortLabel,
  rcsbStructureUrl,
} from '@/lib/pdbLinks'

describe('pdbLinks', () => {
  it('builds RCSB structure URL', () => {
    expect(rcsbStructureUrl('1m17')).toBe('https://www.rcsb.org/structure/1M17')
  })

  it('method chip links to PDBe experiment (crystallography details)', () => {
    const href = pdbMethodDeepLink('1M17', 'X-RAY DIFFRACTION')
    expect(href).toContain('pdbe')
    expect(href.toLowerCase()).toContain('1m17')
    expect(href).toContain('experiment')
  })

  it('shortens X-ray method label', () => {
    expect(pdbMethodShortLabel('X-RAY DIFFRACTION')).toBe('X-ray')
    expect(isXrayMethod('X-RAY DIFFRACTION')).toBe(true)
  })
})
