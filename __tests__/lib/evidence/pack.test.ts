/**
 * Pure tests for versioned evidence packs (PR10).
 */

import {
  MAX_PACK_CLAIMS,
  DEFAULT_CLAIM_TOTAL_CAP,
  buildEvidencePack,
  capPackClaims,
  computePackContentHash,
  packToJson,
  packToMarkdown,
  packExportFilename,
  corePanelsFromProfileData,
  isEvidencePack,
  toPackIndexEntry,
  toProjectPackIndexEntry,
  registerPackIndex,
  listPackIndex,
  removePackIndexEntry,
  clearPackIndex,
  PACK_INDEX_KEY,
  type PackIndexStorage,
} from '@/lib/evidence'
import {
  FIXTURE_CORE_PANELS,
  FIXTURE_CTX,
  FIXTURE_CANDIDATE_ID,
  FIXTURE_RETRIEVED_AT,
} from '@/lib/evidence/fixtures/corePanels'
import type { EvidenceClaim, MoleculeCandidate } from '@/lib/domain'
import {
  addPackIndexEntryToProject,
  createProject,
  createAndSaveProject,
  getProject,
  saveProject,
  type ProjectStorage,
} from '@/lib/project'

function memoryStorage(initial: Record<string, string> = {}): PackIndexStorage & {
  data: Record<string, string>
  throwQuota: boolean
} {
  const store = {
    data: { ...initial },
    throwQuota: false,
    getItem(key: string) {
      return store.data[key] ?? null
    },
    setItem(key: string, value: string) {
      if (store.throwQuota) {
        const err = new Error('QuotaExceededError')
        err.name = 'QuotaExceededError'
        throw err
      }
      store.data[key] = value
    },
    removeItem(key: string) {
      delete store.data[key]
    },
  }
  return store
}

function makeCandidate(id = FIXTURE_CANDIDATE_ID): MoleculeCandidate {
  return {
    candidateId: id,
    identity: {
      name: 'Aspirin',
      synonyms: [],
      pubchemCid: 2244,
      chemblId: 'CHEMBL25',
      identityTrust: 'high',
    },
    origins: ['manual'],
    evidenceBreadthSources: [],
    links: [],
    boardStatus: 'promote',
  }
}

describe('MAX_PACK_CLAIMS', () => {
  it('matches extractAll default cap of 200', () => {
    expect(MAX_PACK_CLAIMS).toBe(200)
    expect(MAX_PACK_CLAIMS).toBe(DEFAULT_CLAIM_TOTAL_CAP)
  })
})

describe('buildEvidencePack from Core panels', () => {
  it('extracts claims via extractClaimsFromCorePanels and caps metadata', () => {
    const pack = buildEvidencePack({
      title: 'Aspirin triage',
      panels: FIXTURE_CORE_PANELS,
      extractOptions: FIXTURE_CTX,
      candidates: [makeCandidate()],
      disease: {
        id: 'EFO_0001360',
        idNamespace: 'efo',
        name: 'type 2 diabetes mellitus',
        synonyms: [],
        therapeuticAreas: [],
        xrefs: [],
        identityTrust: 'high',
      },
      preferencesSnapshot: {
        rubricPreset: 'balanced',
        aeAggressiveness: 'soft-flag',
        harvestTiming: 'board-promote',
      },
      id: 'pack_test_01',
      createdAt: FIXTURE_RETRIEVED_AT,
    })

    expect(pack.schemaVersion).toBe(1)
    expect(pack.version).toBe(1)
    expect(pack.id).toBe('pack_test_01')
    expect(pack.claimCount).toBe(9)
    expect(pack.claims).toHaveLength(9)
    expect(pack.claims.length).toBeLessThanOrEqual(MAX_PACK_CLAIMS)
    expect(pack.contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(pack.sources.length).toBeGreaterThan(0)
    expect(pack.claimTypes.mechanism).toBe(1)
    expect(pack.candidates).toHaveLength(1)
    expect(isEvidencePack(pack)).toBe(true)
  })

  it('is stable contentHash for same body', () => {
    const input = {
      title: 'Stable',
      panels: FIXTURE_CORE_PANELS,
      extractOptions: FIXTURE_CTX,
      candidates: [makeCandidate()],
      id: 'pack_stable',
      createdAt: FIXTURE_RETRIEVED_AT,
    }
    const a = buildEvidencePack(input)
    const b = buildEvidencePack(input)
    expect(a.contentHash).toBe(b.contentHash)
    expect(computePackContentHash(a)).toBe(a.contentHash)
  })

  it('enforces max 200 claims', () => {
    const many: EvidenceClaim[] = Array.from({ length: 250 }, (_, i) => ({
      id: `ec:${i.toString(16).padStart(16, '0')}`,
      statement: `Claim ${i}`,
      claimType: 'other' as const,
      epistemicStatus: 'supported' as const,
      provenance: { source: 'test', retrievedAt: FIXTURE_RETRIEVED_AT },
    }))
    const pack = buildEvidencePack({
      title: 'Capped',
      claims: many,
      id: 'pack_cap',
      createdAt: FIXTURE_RETRIEVED_AT,
    })
    expect(pack.claims).toHaveLength(200)
    expect(pack.claimCount).toBe(200)
    expect(capPackClaims(many)).toHaveLength(200)
  })

  it('empty panels → zero claims pack still valid', () => {
    const pack = buildEvidencePack({
      title: 'Empty',
      panels: {
        chemblActivities: [],
        chemblMechanisms: [],
        adverseEvents: [],
        clinicalTrials: [],
        diseaseAssociations: [],
      },
      extractOptions: FIXTURE_CTX,
      id: 'pack_empty',
      createdAt: FIXTURE_RETRIEVED_AT,
    })
    expect(pack.claimCount).toBe(0)
    expect(pack.claims).toEqual([])
    expect(pack.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('packToJson / packToMarkdown', () => {
  const pack = buildEvidencePack({
    title: 'Export me',
    panels: FIXTURE_CORE_PANELS,
    extractOptions: FIXTURE_CTX,
    candidates: [makeCandidate()],
    id: 'pack_export',
    createdAt: FIXTURE_RETRIEVED_AT,
  })

  it('JSON round-trips via isEvidencePack', () => {
    const json = packToJson(pack)
    const parsed = JSON.parse(json)
    expect(isEvidencePack(parsed)).toBe(true)
    expect(parsed.claims).toHaveLength(pack.claimCount)
  })

  it('Markdown includes title, hash, and claims', () => {
    const md = packToMarkdown(pack)
    expect(md).toContain('# Export me')
    expect(md).toContain(pack.contentHash)
    expect(md).toContain('## Claims')
    expect(md).toContain(pack.claims[0].statement)
  })

  it('packExportFilename uses slug + date + ext', () => {
    expect(packExportFilename(pack, 'json')).toBe('export-me-2026-04-07.json')
    expect(packExportFilename(pack, 'md')).toBe('export-me-2026-04-07.md')
  })
})

describe('corePanelsFromProfileData', () => {
  it('maps profile bag keys', () => {
    const panels = corePanelsFromProfileData({
      chemblActivities: FIXTURE_CORE_PANELS.chemblActivities,
      adverseEvents: FIXTURE_CORE_PANELS.adverseEvents,
      otherJunk: 1,
    })
    expect(panels.chemblActivities).toHaveLength(2)
    expect(panels.adverseEvents).toHaveLength(2)
    expect(panels.clinicalTrials).toBeNull()
  })
})

describe('pack index — localStorage metadata only', () => {
  it('registers index without claims payload', () => {
    const storage = memoryStorage()
    const pack = buildEvidencePack({
      title: 'Indexed',
      panels: FIXTURE_CORE_PANELS,
      extractOptions: FIXTURE_CTX,
      candidates: [makeCandidate()],
      id: 'pack_idx',
      createdAt: FIXTURE_RETRIEVED_AT,
    })

    const result = registerPackIndex(pack, storage)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.claimCount).toBe(9)
    expect(result.value.contentHash).toBe(pack.contentHash)
    expect((result.value as { claims?: unknown }).claims).toBeUndefined()

    const raw = storage.data[PACK_INDEX_KEY]
    expect(raw).toBeTruthy()
    expect(raw).not.toContain('"claims":')
    expect(raw).not.toContain(pack.claims[0].statement)

    const listed = listPackIndex(storage)
    expect(listed).toHaveLength(1)
    expect(listed[0].id).toBe('pack_idx')
  })

  it('dedupes by id and supports remove', () => {
    const storage = memoryStorage()
    const pack = buildEvidencePack({
      title: 'A',
      claims: [],
      id: 'pack_dup',
      createdAt: FIXTURE_RETRIEVED_AT,
    })
    registerPackIndex(pack, storage)
    registerPackIndex({ ...pack, title: 'B' }, storage)
    expect(listPackIndex(storage)).toHaveLength(1)
    expect(listPackIndex(storage)[0].title).toBe('B')

    removePackIndexEntry('pack_dup', storage)
    expect(listPackIndex(storage)).toHaveLength(0)
  })

  it('returns quota_exceeded without silent drop of prior index', () => {
    const storage = memoryStorage()
    const first = buildEvidencePack({
      title: 'Keep me',
      claims: [],
      id: 'pack_keep',
      createdAt: FIXTURE_RETRIEVED_AT,
    })
    expect(registerPackIndex(first, storage).ok).toBe(true)
    storage.throwQuota = true
    const second = buildEvidencePack({
      title: 'Fail',
      claims: [],
      id: 'pack_fail',
      createdAt: FIXTURE_RETRIEVED_AT,
    })
    const result = registerPackIndex(second, storage)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('quota_exceeded')
    storage.throwQuota = false
    expect(listPackIndex(storage)).toHaveLength(1)
    expect(listPackIndex(storage)[0].id).toBe('pack_keep')
  })

  it('toPackIndexEntry / toProjectPackIndexEntry are metadata-only', () => {
    const pack = buildEvidencePack({
      title: 'Meta',
      panels: FIXTURE_CORE_PANELS,
      extractOptions: FIXTURE_CTX,
      candidates: [makeCandidate(), makeCandidate('cid:1')],
      id: 'pack_meta',
      createdAt: FIXTURE_RETRIEVED_AT,
    })
    const idx = toPackIndexEntry(pack)
    expect(idx.candidateCount).toBe(2)
    expect(idx.claimCount).toBe(9)
    expect(Object.keys(idx)).not.toContain('claims')

    const pIdx = toProjectPackIndexEntry(pack)
    expect(pIdx.id).toBe('pack_meta')
    expect(pIdx.title).toBe('Meta')
    expect(pIdx.createdAt).toBe(FIXTURE_RETRIEVED_AT)
    expect(pIdx.candidateCount).toBe(2)
    expect(pIdx.claimCount).toBe(9)
    expect(pIdx.contentHash).toBe(pack.contentHash)
    expect(pIdx.claimIds?.length).toBeGreaterThan(0)
    // metadata only — never embed full claim statements
    expect(JSON.stringify(pIdx)).not.toContain(pack.claims[0].statement)
  })

  it('clearPackIndex empties storage key', () => {
    const storage = memoryStorage()
    const pack = buildEvidencePack({
      title: 'X',
      claims: [],
      id: 'pack_x',
      createdAt: FIXTURE_RETRIEVED_AT,
    })
    registerPackIndex(pack, storage)
    clearPackIndex(storage)
    expect(storage.data[PACK_INDEX_KEY]).toBeUndefined()
  })
})

describe('project packIndex integration', () => {
  function projectMemory(): ProjectStorage & { data: Record<string, string> } {
    const data: Record<string, string> = {}
    return {
      data,
      getItem: (k) => data[k] ?? null,
      setItem: (k, v) => {
        data[k] = v
      },
      removeItem: (k) => {
        delete data[k]
      },
    }
  }

  it('addPackIndexEntryToProject stores breadcrumb only', () => {
    const project = createProject({ name: 'Board' })
    const pack = buildEvidencePack({
      title: 'Board pack',
      panels: FIXTURE_CORE_PANELS,
      extractOptions: FIXTURE_CTX,
      candidates: [makeCandidate()],
      projectId: project.id,
      id: 'pack_board',
      createdAt: FIXTURE_RETRIEVED_AT,
    })
    const next = addPackIndexEntryToProject(project, toProjectPackIndexEntry(pack))
    expect(next.ok).toBe(true)
    if (!next.ok) return
    expect(next.value.packIndex).toHaveLength(1)
    expect(next.value.packIndex[0].id).toBe('pack_board')
    // Project blob must not embed claims
    expect(JSON.stringify(next.value)).not.toContain(pack.claims[0].statement)
  })

  it('persists packIndex on project save', () => {
    const storage = projectMemory()
    const created = createAndSaveProject({ name: 'P' }, storage)
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const pack = buildEvidencePack({
      title: 'P pack',
      claims: [],
      projectId: created.value.id,
      id: 'pack_p',
      createdAt: FIXTURE_RETRIEVED_AT,
    })
    const withPack = addPackIndexEntryToProject(created.value, toProjectPackIndexEntry(pack))
    expect(withPack.ok).toBe(true)
    if (!withPack.ok) return

    const saved = saveProject(withPack.value, storage)
    expect(saved.ok).toBe(true)
    const loaded = getProject(created.value.id, storage)
    expect(loaded?.packIndex[0]?.id).toBe('pack_p')
  })
})

describe('isEvidencePack', () => {
  it('rejects incomplete objects', () => {
    expect(isEvidencePack(null)).toBe(false)
    expect(isEvidencePack({})).toBe(false)
    expect(isEvidencePack({ schemaVersion: 1, id: 'x' })).toBe(false)
  })
})
