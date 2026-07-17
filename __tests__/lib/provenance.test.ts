import { formatProvenanceTimestamp, resolveProvenance } from '@/lib/provenance'

describe('provenance', () => {
  test('resolves gtex from panelSources', () => {
    const p = resolveProvenance('gtex')
    expect(p.api).toMatch(/GTEx/i)
    expect(p.endpoint).toContain('gtexportal')
    expect(p.organization).toBeTruthy()
  })

  test('resolves expression-atlas alias', () => {
    const p = resolveProvenance('expression-atlas')
    expect(p.endpoint).toContain('ebi.ac.uk')
    expect(p.docs).toBeTruthy()
  })

  test('attaches record URL and timestamp', () => {
    const when = new Date('2026-07-17T12:00:00Z')
    const p = resolveProvenance('bgee', {
      recordUrl: 'https://www.bgee.org/?page=gene&gene_id=RPSA',
      fetchedAt: when,
    })
    expect(p.recordUrl).toContain('bgee.org')
    expect(formatProvenanceTimestamp(p.fetchedAt)).not.toMatch(/Not recorded/)
  })

  test('missing source still returns key as fallback', () => {
    const p = resolveProvenance('totally-unknown-source-xyz')
    expect(p.sourceKey).toBe('totally-unknown-source-xyz')
    expect(p.organization).toBe('totally-unknown-source-xyz')
  })
})
