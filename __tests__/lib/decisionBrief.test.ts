import {
  buildDecisionBrief,
  decisionBriefToMarkdown,
} from '@/lib/evidence/decisionBrief'
import type { EvidencePack } from '@/lib/evidence/pack'

const pack = {
  schemaVersion: 1,
  id: 'pack_db',
  version: 1,
  title: 'Aspirin pack',
  createdAt: '2026-01-01T00:00:00.000Z',
  contentHash: 'hashhashhashhash',
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
      statement: 'Aspirin inhibits cyclooxygenase-1 (COX-1) in humans.',
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

describe('decisionBrief', () => {
  it('builds of-record brief without inventing claims', () => {
    const b = buildDecisionBrief(pack, { asOf: '2026-08-05T00:00:00.000Z' })
    expect(b.kind).toBe('biointel-decision-brief')
    expect(b.topClaims[0]?.statement).toMatch(/COX-1/)
    expect(b.law.some((l) => /no LLM/i.test(l))).toBe(true)
    expect(b.killFlags.length).toBeGreaterThan(0) // sparse citable / no safety
    expect(decisionBriefToMarkdown(b)).toContain('Decision brief')
  })
})
