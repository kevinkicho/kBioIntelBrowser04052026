import { buildMondayHandoff, mondayHandoffToJson } from '@/lib/evidence/mondayHandoff'
import type { EvidencePack } from '@/lib/evidence/pack'

const pack = {
  schemaVersion: 1,
  id: 'pack_test',
  version: 1,
  title: 'Test pack',
  createdAt: '2026-01-01T00:00:00.000Z',
  contentHash: 'abc123',
  projectId: 'prj_1',
  candidates: [
    {
      candidateId: 'cid:2244',
      identity: { name: 'Aspirin', pubchemCid: 2244, identityTrust: 'high', synonyms: [] },
      origins: [],
      evidenceBreadthSources: [],
      links: [],
      scores: { composite: 0.5, axes: {}, axisStatus: {} },
    },
  ],
  claims: [
    {
      id: 'c1',
      statement: 'Aspirin inhibits COX-1 in humans (test statement).',
      claimType: 'mechanism',
      subjectCandidateId: 'cid:2244',
      epistemicStatus: 'asserted',
      provenance: {
        source: 'ChEMBL',
        retrievedAt: '2026-01-01T00:00:00.000Z',
        sourceUrl: 'https://www.ebi.ac.uk/chembl/',
      },
    },
  ],
  targets: [],
  claimCount: 1,
  claimTypes: { mechanism: 1 },
  sources: ['ChEMBL'],
} as unknown as EvidencePack

describe('mondayHandoff', () => {
  it('builds handoff with honesty and library experiments', () => {
    const doc = buildMondayHandoff(pack, { persona: 'repurposing', asOf: '2026-08-01T00:00:00.000Z' })
    expect(doc.kind).toBe('biointel-monday-handoff')
    expect(doc.experiments.length).toBeGreaterThanOrEqual(3)
    expect(doc.honesty.claimCount).toBe(1)
    expect(doc.openLinks.some((l) => l.href.includes('2244'))).toBe(true)
    expect(mondayHandoffToJson(doc)).toContain('biointel-monday-handoff')
  })
})
