import { normalizeDiseaseRegistryId } from '@/lib/discovery/engine'

describe('normalizeDiseaseRegistryId', () => {
  it('normalizes MONDO / EFO variants for pin match', () => {
    expect(normalizeDiseaseRegistryId('MONDO_0008383')).toBe('mondo_0008383')
    expect(normalizeDiseaseRegistryId('MONDO:0008383')).toBe('mondo_0008383')
    expect(
      normalizeDiseaseRegistryId('http://purl.obolibrary.org/obo/MONDO_0008383'),
    ).toBe('mondo_0008383')
    expect(normalizeDiseaseRegistryId('EFO_0000685')).toBe('efo_0000685')
  })
})
