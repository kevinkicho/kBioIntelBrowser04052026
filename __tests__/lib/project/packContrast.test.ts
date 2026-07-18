import {
  contrastEvidencePacks,
  contrastPackIndexEntries,
  packContrastDistance,
} from '@/lib/project/packContrast'
import type { EvidencePack } from '@/lib/evidence/pack'
import type { EvidenceClaim } from '@/lib/domain'

function pack(
  id: string,
  title: string,
  claims: EvidenceClaim[],
  names: string[],
): EvidencePack {
  const types: Record<string, number> = {}
  for (const c of claims) types[c.claimType] = (types[c.claimType] ?? 0) + 1
  return {
    schemaVersion: 1,
    id,
    version: 1,
    title,
    createdAt: '2026-04-07T00:00:00.000Z',
    contentHash: 'abc',
    targets: [],
    candidates: names.map((name) => ({
      candidateId: `ch:${name}`,
      identity: {
        name,
        pubchemCid: 1,
        synonyms: [],
        identityTrust: 'high',
      },
      origins: [],
      evidenceBreadthSources: [],
      links: [],
    })),
    claims,
    claimCount: claims.length,
    claimTypes: types,
    sources: Array.from(new Set(claims.map((c) => c.provenance.source))),
  }
}

const c = (
  id: string,
  claimType: EvidenceClaim['claimType'],
  source: string,
): EvidenceClaim => ({
  id,
  claimType,
  statement: id,
  epistemicStatus: 'supported',
  provenance: { source, retrievedAt: '2026-04-07T00:00:00.000Z' },
})

describe('packContrast', () => {
  it('diffs types sources and candidates between packs', () => {
    const a = pack(
      'p1',
      'Promote pack',
      [c('ec:1', 'mechanism', 'ChEMBL'), c('ec:2', 'safety', 'OpenFDA (FAERS)')],
      ['Aspirin'],
    )
    const b = pack(
      'p2',
      'Hold pack',
      [c('ec:3', 'trial', 'ClinicalTrials.gov'), c('ec:4', 'mechanism', 'ChEMBL')],
      ['Ibuprofen'],
    )
    const r = contrastEvidencePacks(a, b)
    expect(r.onlyPrimaryTypes).toContain('safety')
    expect(r.onlyContrastTypes).toContain('trial')
    expect(r.sharedTypes).toContain('mechanism')
    expect(r.onlyPrimaryCandidates).toContain('Aspirin')
    expect(r.onlyContrastCandidates).toContain('Ibuprofen')
    expect(r.narrative).toContain('Promote pack')
    expect(r.rivalSeedThesis).toContain('rival')
  })

  it('works from index entries without full claims', () => {
    const r = contrastPackIndexEntries(
      { id: 'a', title: 'A', createdAt: '', claimIds: ['x'], claimCount: 1 },
      { id: 'b', title: 'B', createdAt: '', claimIds: ['y'], claimCount: 2 },
    )
    expect(r.primary.claimCount).toBe(1)
    expect(r.contrast.claimCount).toBe(2)
  })

  it('packContrastDistance is higher for dissimilar type sets', () => {
    const d1 = packContrastDistance(
      { claimTypes: { mechanism: 1 }, sources: ['ChEMBL'] },
      { claimTypes: { mechanism: 1 }, sources: ['ChEMBL'] },
    )
    const d2 = packContrastDistance(
      { claimTypes: { mechanism: 1, safety: 1 }, sources: ['ChEMBL'] },
      { claimTypes: { trial: 1 }, sources: ['ClinicalTrials.gov'] },
    )
    expect(d2).toBeGreaterThan(d1)
  })
})
