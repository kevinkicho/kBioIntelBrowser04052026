/**
 * Content-hash + negative evidence + hub→pack handoff.
 */

import { buildMoleculeDataHub } from '@/lib/dataHub'
import { hashDataHubLedger, fnv1aHex } from '@/lib/dataHub/contentHash'
import { buildNegativeEvidencePart } from '@/lib/dataHub/negativeEvidence'
import {
  hubLedgerToPackClaimsHandoff,
  hubClaimsPackToJson,
} from '@/lib/dataHub/hubClaimsToPack'
import { buildResearchKitBundle } from '@/lib/dataHub/researchKit'

describe('contentHash', () => {
  it('fnv1aHex is stable', () => {
    expect(fnv1aHex('aspirin')).toBe(fnv1aHex('aspirin'))
    expect(fnv1aHex('aspirin')).not.toBe(fnv1aHex('ibuprofen'))
    expect(fnv1aHex('aspirin')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('ledger hash stable for same bags; changes when fact value changes', () => {
    const a = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin' },
      { literature: [{ title: 'Paper A' }] },
    )
    const b = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin' },
      { literature: [{ title: 'Paper A' }] },
    )
    const c = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin' },
      { literature: [{ title: 'Paper B' }, { title: 'Paper C' }] },
    )
    expect(hashDataHubLedger(a)).toBe(hashDataHubLedger(b))
    expect(hashDataHubLedger(a)).not.toBe(hashDataHubLedger(c))
    expect(a.notes?.some((n) => n.startsWith('Content hash:'))).toBe(true)
  })
})

describe('negativeEvidence', () => {
  it('emits empty-sample rows for present empty bags', () => {
    const { rows, section } = buildNegativeEvidencePart({
      clinicalTrials: [],
      literature: [],
      patents: [],
    })
    expect(section?.id).toBe('negative-evidence')
    expect(rows.length).toBeGreaterThanOrEqual(3)
    expect(rows.find((r) => r.id === 'neg-clinicalTrials')?.value).toBe('empty sample')
    expect(rows.find((r) => r.id === 'neg-literature')?.detail).toMatch(/not/i)
  })

  it('skips bags that have data', () => {
    const { rows } = buildNegativeEvidencePart({
      clinicalTrials: [{ nctId: 'NCT1' }],
      literature: [],
    })
    expect(rows.find((r) => r.id === 'neg-clinicalTrials')).toBeUndefined()
    expect(rows.find((r) => r.id === 'neg-literature')?.value).toBe('empty sample')
  })

  it('hub includes negative-evidence section when bags empty', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 1, name: 'X' },
      { clinicalTrials: [], adverseEvents: [] },
    )
    expect(ledger.sections.some((s) => s.id === 'negative-evidence')).toBe(true)
    expect(ledger.rows.some((r) => r.id.startsWith('neg-'))).toBe(true)
  })
})

describe('hubClaimsToPack', () => {
  it('builds pack handoff with content hash and claim-bound statements', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin', formula: 'C9H8O4' },
      {
        clinicalTrials: [{ nctId: 'NCT00000001', phase: 'PHASE3' }],
        adverseEvents: [{ reactionName: 'Nausea', count: 3 }],
      },
    )
    const handoff = hubLedgerToPackClaimsHandoff(ledger)
    expect(handoff.kind).toBe('biointel-hub-claims-pack')
    expect(handoff.schemaVersion).toBe(1)
    expect(handoff.contentHash).toMatch(/^hub_/)
    expect(handoff.claims.length).toBeGreaterThan(0)
    expect(handoff.claims.every((c) => c.id && c.statement)).toBe(true)
    const json = hubClaimsPackToJson(handoff)
    expect(JSON.parse(json).claims.length).toBe(handoff.claims.length)
  })
})

describe('researchKit contentHash + hub-claims-pack', () => {
  it('embeds contentHash and hub-claims-pack.json in bundle', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin' },
      { literature: [{ title: 'T' }] },
    )
    const bundle = buildResearchKitBundle({ ledger })
    expect(bundle.contentHash).toMatch(/^hub_/)
    expect(bundle.files['hub-claims-pack.json']).toBeTruthy()
    const pack = JSON.parse(bundle.files['hub-claims-pack.json']!)
    expect(pack.kind).toBe('biointel-hub-claims-pack')
    expect(pack.contentHash).toBe(bundle.contentHash)
  })
})
