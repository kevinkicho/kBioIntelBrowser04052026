import type { MoleculeCandidate, Project } from '@/lib/domain'
import {
  PROJECT_INDEX_KEY,
  PROJECT_KEY_PREFIX,
  MAX_CANDIDATES_PER_PROJECT,
  addCandidateToProject,
  createAndSaveProject,
  createProject,
  deleteProject,
  getProject,
  isProject,
  listProjects,
  projectStorageKey,
  removeCandidateFromProject,
  saveProject,
  setCandidateBoardStatus,
  setBoardStatusAndSave,
  type ProjectStorage,
} from '@/lib/project/store'

function memoryStorage(initial: Record<string, string> = {}): ProjectStorage & {
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

function makeCandidate(id: string, name = 'Aspirin'): MoleculeCandidate {
  return {
    candidateId: id,
    identity: {
      name,
      synonyms: [],
      pubchemCid: id.startsWith('cid:') ? Number(id.slice(4)) : null,
      identityTrust: 'medium',
    },
    origins: ['manual'],
    evidenceBreadthSources: [],
    links: [],
    boardStatus: 'untriaged',
  }
}

describe('project store pure helpers', () => {
  it('createProject builds schemaVersion 1 with empty board', () => {
    const p = createProject({ name: '  ATTR board  ' })
    expect(p.schemaVersion).toBe(1)
    expect(p.name).toBe('ATTR board')
    expect(p.candidates).toEqual([])
    expect(p.packIndex).toEqual([])
    expect(p.targetIds).toEqual([])
    expect(p.id).toMatch(/^prj_/)
    expect(isProject(p)).toBe(true)
  })

  it('projectStorageKey uses design prefix', () => {
    expect(projectStorageKey('abc')).toBe(`${PROJECT_KEY_PREFIX}abc`)
  })

  it('addCandidateToProject dedupes by candidateId', () => {
    const p = createProject({ name: 'P' })
    const c = makeCandidate('cid:2244')
    const once = addCandidateToProject(p, c)
    expect(once.ok).toBe(true)
    if (!once.ok) return
    const twice = addCandidateToProject(once.value, {
      ...c,
      identity: { ...c.identity, name: 'Aspirin USP' },
    })
    expect(twice.ok).toBe(true)
    if (!twice.ok) return
    expect(twice.value.candidates).toHaveLength(1)
    expect(twice.value.candidates[0].identity.name).toBe('Aspirin USP')
  })

  it('addCandidateToProject enforces 50-candidate cap', () => {
    let p = createProject({ name: 'Full' })
    for (let i = 0; i < MAX_CANDIDATES_PER_PROJECT; i++) {
      const r = addCandidateToProject(p, makeCandidate(`cid:${i}`, `Mol${i}`))
      expect(r.ok).toBe(true)
      if (r.ok) p = r.value
    }
    const overflow = addCandidateToProject(p, makeCandidate('cid:9999', 'Overflow'))
    expect(overflow.ok).toBe(false)
    if (overflow.ok) return
    expect(overflow.error).toBe('cap_exceeded')
  })

  it('setCandidateBoardStatus and removeCandidateFromProject', () => {
    const base = createProject({
      name: 'P',
      candidates: [makeCandidate('cid:1'), makeCandidate('cid:2')],
    })
    const promoted = setCandidateBoardStatus(base, 'cid:1', 'promote')
    expect(promoted.ok).toBe(true)
    if (!promoted.ok) return
    expect(promoted.value.candidates[0].boardStatus).toBe('promote')

    const removed = removeCandidateFromProject(promoted.value, 'cid:2')
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.value.candidates).toHaveLength(1)
    expect(removed.value.candidates[0].candidateId).toBe('cid:1')
  })

  it('isProject rejects garbage', () => {
    expect(isProject(null)).toBe(false)
    expect(isProject({})).toBe(false)
    expect(isProject({ schemaVersion: 1, id: 'x' })).toBe(false)
  })
})

describe('project store persistence', () => {
  it('save/list/get/delete round-trip', () => {
    const storage = memoryStorage()
    const created = createAndSaveProject({ name: 'Roundtrip', candidates: [makeCandidate('cid:2244')] }, storage)
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const listed = listProjects(storage)
    expect(listed).toHaveLength(1)
    expect(listed[0].name).toBe('Roundtrip')

    const got = getProject(created.value.id, storage)
    expect(got?.candidates[0].candidateId).toBe('cid:2244')

    const del = deleteProject(created.value.id, storage)
    expect(del.ok).toBe(true)
    expect(listProjects(storage)).toHaveLength(0)
    expect(storage.getItem(projectStorageKey(created.value.id))).toBeNull()
  })

  it('returns quota_exceeded without silent drop', () => {
    const storage = memoryStorage()
    const first = createAndSaveProject({ name: 'Keep me' }, storage)
    expect(first.ok).toBe(true)
    if (!first.ok) return

    storage.throwQuota = true
    const second = createAndSaveProject({ name: 'Will fail' }, storage)
    expect(second.ok).toBe(false)
    if (second.ok) return
    expect(second.error).toBe('quota_exceeded')
    expect(second.message).toMatch(/export/i)

    storage.throwQuota = false
    // Original project still intact
    expect(getProject(first.value.id, storage)?.name).toBe('Keep me')
  })

  it('setBoardStatusAndSave persists status', () => {
    const storage = memoryStorage()
    const created = createAndSaveProject(
      { name: 'Board', candidates: [makeCandidate('cid:5')] },
      storage,
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const updated = setBoardStatusAndSave(created.value.id, 'cid:5', 'kill', storage)
    expect(updated.ok).toBe(true)
    if (!updated.ok) return
    expect(updated.value.candidates[0].boardStatus).toBe('kill')
    expect(getProject(created.value.id, storage)?.candidates[0].boardStatus).toBe('kill')
  })

  it('index tracks multiple projects', () => {
    const storage = memoryStorage()
    createAndSaveProject({ name: 'A' }, storage)
    createAndSaveProject({ name: 'B' }, storage)
    const ids = JSON.parse(storage.getItem(PROJECT_INDEX_KEY) ?? '[]') as string[]
    expect(ids).toHaveLength(2)
    expect(listProjects(storage).map((p: Project) => p.name).sort()).toEqual(['A', 'B'])
  })
})
