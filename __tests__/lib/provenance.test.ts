import { formatProvenanceTimestamp, resolveProvenance } from '@/lib/provenance'
import { getPanelSource } from '@/lib/panelSources'

describe('provenance', () => {
  test('resolves gtex from panelSources', () => {
    const p = resolveProvenance('gtex')
    expect(p.api).toMatch(/GTEx/i)
    expect(p.endpoint).toContain('gtexportal')
    expect(p.organization).toBeTruthy()
  })

  test('establishment-links and international-regulators have bottom-bar panel sources', () => {
    const est = getPanelSource('establishment-links')
    expect(est).not.toBeNull()
    expect(est!.api).toMatch(/DRLS|FEI/i)
    expect(est!.docs).toMatch(/^https?:\/\//)
    expect(est!.endpoint).toMatch(/^https?:\/\//)

    const reg = getPanelSource('international-regulators')
    expect(reg).not.toBeNull()
    expect(reg!.api).toMatch(/Regulator/i)
    expect(reg!.source).toMatch(/EMA|MHRA|TGA/i)
    expect(reg!.docs).toMatch(/^https?:\/\//)
    expect(reg!.endpoint).toMatch(/^https?:\/\//)
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
