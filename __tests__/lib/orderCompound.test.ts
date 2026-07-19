import {
  buildOrderCatalogLinks,
  fillCatalogTemplate,
  extractCasFromSynonyms,
  SUPPLIER_CATALOG_TEMPLATES,
} from '@/lib/vendorCatalogLinks'

describe('vendorCatalogLinks', () => {
  test('extractCasFromSynonyms finds CAS RN', () => {
    expect(extractCasFromSynonyms(['aspirin', '50-78-2', 'ASA'])).toBe('50-78-2')
    expect(extractCasFromSynonyms(['nope'])).toBeNull()
  })

  test('Fisher / Thermo / Cayman use query-string search (not path 404s)', () => {
    const links = buildOrderCatalogLinks({ name: 'Aspirin', cid: 2244, cas: '50-78-2' })
    const byName = Object.fromEntries(links.map((l) => [l.name, l.url]))

    expect(byName['Fisher Scientific']).toContain(
      'fishersci.com/us/en/catalog/search/products?keyword=',
    )
    expect(byName['Fisher Scientific']).toContain('50-78-2')
    expect(byName['Thermo Fisher']).toContain('thermofisher.com/search/results?query=')
    expect(byName['Cayman Chemical']).toContain('caymanchem.com/search?q=')
    expect(byName['Cayman Chemical']).toContain('50-78-2')
    expect(byName['Selleck Chemicals']).toContain('selleckchem.com/searchResult.html?searchValue=')
    expect(byName['Alfa Aesar']).toContain('fishersci.com/us/en/catalog/search/products?keyword=')
    expect(byName['Alfa Aesar']).toMatch(/Alfa/)
    expect(byName['Enamine']).toContain('enamine.net/search?q=')
    expect(byName['TargetMol']).toContain('targetmol.com/search?keyword=')
    expect(byName['TCI Chemicals']).toContain('tcichemicals.com/US/en/search/')
    expect(byName['TCI Chemicals']).toContain('resulttype=product')
    expect(byName['TCI Chemicals']).toContain('50-78-2')
    expect(byName['Sigma-Aldrich']).toContain('sigmaaldrich.com/US/en/search/')
    expect(byName['Sigma-Aldrich']).toContain('term=')
    expect(byName['Sigma-Aldrich']).toContain('type=product')
    expect(byName['eMolecules']).toMatch(/emolecules\.com\/#\/search\//)
    expect(byName['PubChem (CID)']).toContain('/compound/2244')
    expect(byName['Sigma (CAS)']).toContain('type=cas_number')
  })

  test('no legacy broken vendor search URLs', () => {
    const links = buildOrderCatalogLinks({ name: 'Metformin', cid: 4091 })
    for (const l of links) {
      expect(l.url).not.toMatch(/fishersci\.com\/us\/en\/search\/[^?]+$/)
      expect(l.url).not.toMatch(/molport\.com\/shop\/index\/search/)
      expect(l.url).not.toMatch(/emolecules\.com\/search-structure/)
      expect(l.url).not.toMatch(/caymanchem\.com\/product\/s\?/)
      expect(l.url).not.toMatch(/selleckchem\.com\/search\.html\?/)
      expect(l.url).not.toMatch(/alfa\.com\/en\/search/)
    }
  })

  test('fillCatalogTemplate encodes spaces', () => {
    const u = fillCatalogTemplate(
      'https://example.com/s?q={name}',
      { name: 'lysine clonixinate' },
    )
    expect(u).toContain('lysine%20clonixinate')
  })

  test('supplier templates all use https and a placeholder', () => {
    for (const t of SUPPLIER_CATALOG_TEMPLATES) {
      expect(t.urlTemplate.startsWith('https://')).toBe(true)
      expect(
        t.urlTemplate.includes('{name}') ||
          t.urlTemplate.includes('{path}') ||
          t.urlTemplate.includes('{cas}') ||
          t.urlTemplate.includes('{cid}'),
      ).toBe(true)
    }
  })
})
