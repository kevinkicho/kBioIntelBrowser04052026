import { similarMoleculeToCandidate } from '@/lib/discovery/similarityExpand'

describe('similarityExpand', () => {
  test('maps similar molecule to candidate with similarity origin', () => {
    const c = similarMoleculeToCandidate({
      cid: 1983,
      name: 'acetaminophen',
      formula: 'C8H9NO2',
      molecularWeight: 151.16,
      imageUrl: 'https://example.com/x.png',
    })
    expect(c.identity.pubchemCid).toBe(1983)
    expect(c.origins).toContain('similarity')
    expect(c.links.some((l) => l.type === 'similar-to')).toBe(true)
  })
})
