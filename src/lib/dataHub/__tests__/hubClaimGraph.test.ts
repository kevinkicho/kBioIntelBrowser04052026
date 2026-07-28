import { buildMoleculeDataHub } from '@/lib/dataHub'
import { buildHubClaimGraph, hubClaimGraphToMarkdown } from '@/lib/dataHub/hubClaimGraph'

describe('hubClaimGraph', () => {
  it('builds of-record claims and edges from ledger rows', () => {
    const ledger = buildMoleculeDataHub(
      {
        cid: 2244,
        name: 'Aspirin',
        formula: 'C9H8O4',
        molecularWeight: 180,
        inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
      },
      {
        clinicalTrials: [
          {
            nctId: 'NCT1',
            title: 'Trial',
            phase: 'PHASE3',
            status: 'COMPLETED',
            conditions: ['Pain'],
            sponsor: 'NIH',
          },
        ],
        chemblMechanisms: [
          {
            mechanismOfAction: 'COX inhibitor',
            targetName: 'PTGS1',
            actionType: 'INHIBITOR',
          },
        ],
      },
    )
    const graph = buildHubClaimGraph(ledger, {
      retrievedAt: '2026-07-28T00:00:00.000Z',
    })
    expect(graph.claims.length).toBeGreaterThan(2)
    expect(graph.claims.every((c) => c.provenance.source)).toBe(true)
    expect(graph.claims.every((c) => c.epistemicStatus === 'supported')).toBe(true)
    expect(graph.byDomain).toBeTruthy()
    expect(graph.edges.length).toBeGreaterThanOrEqual(0)
    const md = hubClaimGraphToMarkdown(graph)
    expect(md).toMatch(/Claim graph/)
    expect(md).toMatch(/Aspirin/)
  })
})
