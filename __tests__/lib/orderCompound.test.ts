import { buildOrderCatalogLinks } from '@/components/profile/NextStepsPanel'

describe('buildOrderCatalogLinks', () => {
  test('includes major catalogs and PubChem when cid present', () => {
    const links = buildOrderCatalogLinks('Tafamidis', 208901)
    const names = links.map((l) => l.name)
    expect(names).toContain('Sigma-Aldrich')
    expect(names).toContain('MolPort')
    expect(names).toContain('PubChem (CID)')
    const pub = links.find((l) => l.name === 'PubChem (CID)')
    expect(pub?.url).toContain('208901')
    expect(links.every((l) => l.url.startsWith('https://'))).toBe(true)
  })

  test('omits PubChem CID link without cid', () => {
    const links = buildOrderCatalogLinks('Aspirin', null)
    expect(links.every((l) => l.name !== 'PubChem (CID)')).toBe(true)
    expect(links.some((l) => l.url.includes('aspirin') || l.url.includes('Aspirin'))).toBe(true)
  })
})
