/**
 * PR3c — batch identity resolve (InChIKey + IdentityTrust).
 */

import {
  applyResolvedIdentities,
  DEFAULT_IDENTITY_CONCURRENCY,
  DEFAULT_IDENTITY_TOP_N,
  fetchPubChemIdentityByCid,
  fetchPubChemIdentityByCids,
  identityFallbackFromInputs,
  mapPool,
  resolveIdentitiesBatch,
  toMoleculeIdentity,
  type IdentityResolveInput,
  type ResolvedMoleculeIdentity,
} from '@/lib/discovery/identityResolve'
import { mapLegacyCandidateToMoleculeCandidate } from '@/lib/domain/mappers'
import type { CandidateMolecule } from '@/lib/candidateRanker'
import { IDENTITY_TRUST_AXIS_VALUES } from '@/lib/domain/identity'

const ASPIRIN_IK = 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N'
const DONEPEZIL_IK = 'ADEBPBSSDYVVLD-UHFFFAOYSA-N'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response
}

function pubchemPropsResponse(
  rows: Array<{ CID: number; InChIKey?: string; IsomericSMILES?: string; Title?: string }>,
): Response {
  return jsonResponse({
    PropertyTable: {
      Properties: rows,
    },
  })
}

describe('identityResolve', () => {
  describe('mapPool', () => {
    it('respects concurrency cap', async () => {
      let inFlight = 0
      let maxInFlight = 0
      const items = [1, 2, 3, 4, 5, 6]

      const results = await mapPool(items, 2, async (n) => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((r) => setTimeout(r, 15))
        inFlight--
        return n * 10
      })

      expect(results).toEqual([10, 20, 30, 40, 50, 60])
      expect(maxInFlight).toBeLessThanOrEqual(2)
      expect(maxInFlight).toBeGreaterThan(0)
    })

    it('handles empty list', async () => {
      expect(await mapPool([], 4, async (x) => x)).toEqual([])
    })
  })

  describe('fetchPubChemIdentityByCid / ByCids', () => {
    it('parses single-CID property response', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(
        pubchemPropsResponse([
          {
            CID: 2244,
            InChIKey: ASPIRIN_IK,
            IsomericSMILES: 'CC(=O)OC1=CC=CC=C1C(=O)O',
            Title: 'Aspirin',
          },
        ]),
      )
      const hit = await fetchPubChemIdentityByCid(2244, fetchImpl as unknown as typeof fetch)
      expect(hit?.inchiKey).toBe(ASPIRIN_IK)
      expect(hit?.smiles).toContain('CC(=O)')
      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(String(fetchImpl.mock.calls[0][0])).toContain('/compound/cid/2244/property/')
    })

    it('parses multi-CID property response', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(
        pubchemPropsResponse([
          { CID: 2244, InChIKey: ASPIRIN_IK },
          { CID: 3152, InChIKey: DONEPEZIL_IK },
        ]),
      )
      const map = await fetchPubChemIdentityByCids(
        [2244, 3152],
        fetchImpl as unknown as typeof fetch,
      )
      expect(map.get(2244)?.inchiKey).toBe(ASPIRIN_IK)
      expect(map.get(3152)?.inchiKey).toBe(DONEPEZIL_IK)
      expect(String(fetchImpl.mock.calls[0][0])).toContain('2244,3152')
    })

    it('returns empty map on HTTP error', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, false, 503))
      const map = await fetchPubChemIdentityByCids([1], fetchImpl as unknown as typeof fetch)
      expect(map.size).toBe(0)
    })
  })

  describe('resolveIdentitiesBatch', () => {
    it('upgrades CID candidates to high trust with InChIKey', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(
        pubchemPropsResponse([
          { CID: 2244, InChIKey: ASPIRIN_IK, IsomericSMILES: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
        ]),
      )

      const result = await resolveIdentitiesBatch(
        [{ name: 'Aspirin', cid: 2244 }],
        { fetchImpl: fetchImpl as unknown as typeof fetch },
      )

      expect(result.fetchedCount).toBe(1)
      expect(result.highTrustCount).toBe(1)
      expect(result.resolved[0].identityTrust).toBe('high')
      expect(result.resolved[0].inchiKey).toBe(ASPIRIN_IK)
      expect(result.resolved[0].fetched).toBe(true)
      expect(result.resolved[0].reasons.some((r) => /InChIKey/i.test(r))).toBe(true)
    })

    it('leaves name-only candidates unresolved without fetch', async () => {
      const fetchImpl = jest.fn()
      const result = await resolveIdentitiesBatch(
        [{ name: 'Mystery compound', cid: null }],
        { fetchImpl: fetchImpl as unknown as typeof fetch },
      )
      expect(fetchImpl).not.toHaveBeenCalled()
      expect(result.fetchedCount).toBe(0)
      expect(result.resolved[0].identityTrust).toBe('unresolved')
    })

    it('skips PubChem when valid InChIKey already present', async () => {
      const fetchImpl = jest.fn()
      const result = await resolveIdentitiesBatch(
        [{ name: 'Aspirin', cid: 2244, inchiKey: ASPIRIN_IK }],
        { fetchImpl: fetchImpl as unknown as typeof fetch },
      )
      expect(fetchImpl).not.toHaveBeenCalled()
      expect(result.fetchedCount).toBe(0)
      expect(result.resolved[0].identityTrust).toBe('high')
      expect(result.resolved[0].inchiKey).toBe(ASPIRIN_IK)
    })

    it('caps work to topN and leaves rest at baseline trust', async () => {
      const fetchImpl = jest.fn().mockImplementation(async (url: string) => {
        // batch may include one or more cids
        const m = String(url).match(/cid\/([\d,]+)/)
        const cids = (m?.[1] ?? '').split(',').map(Number).filter(Boolean)
        return pubchemPropsResponse(
          cids.map((CID) => ({
            CID,
            InChIKey: CID === 1 ? ASPIRIN_IK : DONEPEZIL_IK,
          })),
        )
      })

      const inputs: IdentityResolveInput[] = [
        { name: 'A', cid: 1 },
        { name: 'B', cid: 2 },
        { name: 'C', cid: 3 },
      ]

      const result = await resolveIdentitiesBatch(inputs, {
        topN: 2,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })

      expect(result.resolved).toHaveLength(3)
      expect(result.resolved[0].identityTrust).toBe('high')
      expect(result.resolved[1].identityTrust).toBe('high')
      // beyond topN — CID-only medium without fetch
      expect(result.resolved[2].identityTrust).toBe('medium')
      expect(result.resolved[2].fetched).toBe(false)
      expect(result.fetchedCount).toBe(2)
    })

    it('defaults topN to design budget of 25', () => {
      expect(DEFAULT_IDENTITY_TOP_N).toBe(25)
      expect(DEFAULT_IDENTITY_CONCURRENCY).toBe(4)
    })

    it('falls back to per-CID when multi-CID batch returns empty', async () => {
      let call = 0
      const fetchImpl = jest.fn().mockImplementation(async (url: string) => {
        call++
        const u = String(url)
        // Multi-CID path: /cid/10,11/property/... (property names also contain commas)
        const cidSeg = u.match(/\/cid\/([^/]+)\//)?.[1] ?? ''
        if (cidSeg.includes(',')) {
          return jsonResponse({}, false, 500)
        }
        // Per-CID success
        const CID = Number(cidSeg)
        return pubchemPropsResponse([{ CID, InChIKey: ASPIRIN_IK }])
      })

      const result = await resolveIdentitiesBatch(
        [
          { name: 'A', cid: 10 },
          { name: 'B', cid: 11 },
        ],
        { fetchImpl: fetchImpl as unknown as typeof fetch, concurrency: 2 },
      )

      expect(result.highTrustCount).toBe(2)
      expect(result.resolved.every((r) => r.identityTrust === 'high')).toBe(true)
      expect(call).toBeGreaterThan(1)
    })

    it('assesses medium trust for CID-only when PubChem has no InChIKey', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(
        pubchemPropsResponse([{ CID: 99, Title: 'NoKey' }]),
      )
      const result = await resolveIdentitiesBatch(
        [{ name: 'NoKey', cid: 99 }],
        { fetchImpl: fetchImpl as unknown as typeof fetch },
      )
      expect(result.resolved[0].identityTrust).toBe('medium')
      expect(result.resolved[0].inchiKey).toBeUndefined()
    })
  })

  describe('applyResolvedIdentities / toMoleculeIdentity', () => {
    const legacy: CandidateMolecule = {
      name: 'Aspirin',
      cid: 2244,
      clinicalPhase: 0.75,
      geneAssociationScore: 0.8,
      sharedTargetRatio: 0.5,
      trialCountNorm: 0.4,
      clinicalPhaseRaw: 3,
      sharedTargetCountRaw: 2,
      trialCountRaw: 5,
      geneScoreRaw: 0.8,
      sources: ['DGIdb'],
      confidence: 'high',
      compositeScore: 0.7,
    }

    it('upgrades candidateId to ik: and identityTrust axis to high', () => {
      const base = mapLegacyCandidateToMoleculeCandidate(legacy)
      expect(base.candidateId).toBe('cid:2244')
      expect(base.identity.identityTrust).toBe('medium')

      const resolved: ResolvedMoleculeIdentity[] = [
        {
          name: 'Aspirin',
          pubchemCid: 2244,
          inchiKey: ASPIRIN_IK,
          smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
          synonyms: [],
          identityTrust: 'high',
          reasons: ['Valid InChIKey'],
          fetched: true,
        },
      ]

      const patched = applyResolvedIdentities([base], resolved)
      expect(patched[0].candidateId).toBe(`ik:${ASPIRIN_IK}`)
      expect(patched[0].identity.identityTrust).toBe('high')
      expect(patched[0].identity.inchiKey).toBe(ASPIRIN_IK)
      expect(patched[0].scores?.axes.identityTrust).toBe(IDENTITY_TRUST_AXIS_VALUES.high)
      expect(patched[0].scores?.axisStatus.identityTrust).toBe('computed')
      // high trust axis should raise composite vs medium baseline
      expect(patched[0].scores!.composite).toBeGreaterThan(base.scores!.composite)
    })

    it('toMoleculeIdentity maps resolved fields', () => {
      const id = toMoleculeIdentity({
        name: 'X',
        pubchemCid: 1,
        inchiKey: ASPIRIN_IK,
        synonyms: [],
        identityTrust: 'high',
        reasons: [],
        fetched: true,
      })
      expect(id.pubchemCid).toBe(1)
      expect(id.identityTrust).toBe('high')
    })
  })

  describe('identityFallbackFromInputs', () => {
    it('produces offline trust without network', () => {
      const fb = identityFallbackFromInputs([
        { name: 'Aspirin', cid: 2244 },
        { name: 'Mystery', cid: null },
      ])
      expect(fb.fetchedCount).toBe(0)
      expect(fb.resolved[0].identityTrust).toBe('medium')
      expect(fb.resolved[1].identityTrust).toBe('unresolved')
    })
  })
})
