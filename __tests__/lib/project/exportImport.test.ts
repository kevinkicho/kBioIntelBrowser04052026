import type { MoleculeCandidate } from '@/lib/domain'
import {
  createAndSaveProject,
  createProject,
  listProjects,
  type ProjectStorage,
} from '@/lib/project/store'
import {
  exportProjectToJson,
  exportProjectsToJson,
  importProjects,
  importProjectsFromJson,
  parseProjectImport,
  projectExportFilename,
  PROJECT_EXPORT_SCHEMA_VERSION,
} from '@/lib/project/exportImport'

function memoryStorage(): ProjectStorage & { data: Record<string, string> } {
  const store = {
    data: {} as Record<string, string>,
    getItem(key: string) {
      return store.data[key] ?? null
    },
    setItem(key: string, value: string) {
      store.data[key] = value
    },
    removeItem(key: string) {
      delete store.data[key]
    },
  }
  return store
}

function makeCandidate(id: string): MoleculeCandidate {
  return {
    candidateId: id,
    identity: {
      name: 'Metformin',
      synonyms: [],
      pubchemCid: 4091,
      identityTrust: 'medium',
    },
    origins: ['chembl-indication'],
    evidenceBreadthSources: ['ChEMBL'],
    links: [],
    boardStatus: 'promote',
  }
}

describe('exportImport pure functions', () => {
  it('exportProjectsToJson produces bundle schema', () => {
    const p = createProject({ name: 'Export me', candidates: [makeCandidate('cid:4091')] })
    const json = exportProjectsToJson([p])
    const bundle = JSON.parse(json)
    expect(bundle.schemaVersion).toBe(PROJECT_EXPORT_SCHEMA_VERSION)
    expect(bundle.kind).toBe('biointel-projects')
    expect(bundle.projects).toHaveLength(1)
    expect(bundle.projects[0].name).toBe('Export me')
    expect(bundle.projects[0].candidates[0].boardStatus).toBe('promote')
    expect(typeof bundle.exportedAt).toBe('string')
  })

  it('exportProjectToJson wraps single project', () => {
    const p = createProject({ name: 'Solo' })
    const parsed = JSON.parse(exportProjectToJson(p))
    expect(parsed.projects).toHaveLength(1)
    expect(parsed.projects[0].name).toBe('Solo')
  })

  it('parseProjectImport accepts bundle, single, and array', () => {
    const p = createProject({ name: 'X', candidates: [makeCandidate('cid:1')] })

    const fromBundle = parseProjectImport(exportProjectsToJson([p]))
    expect(fromBundle.ok).toBe(true)
    if (fromBundle.ok) expect(fromBundle.value[0].name).toBe('X')

    const fromSingle = parseProjectImport(JSON.stringify(p))
    expect(fromSingle.ok).toBe(true)
    if (fromSingle.ok) expect(fromSingle.value).toHaveLength(1)

    const fromArray = parseProjectImport(JSON.stringify([p, p]))
    expect(fromArray.ok).toBe(true)
    if (fromArray.ok) expect(fromArray.value).toHaveLength(2)
  })

  it('parseProjectImport rejects invalid JSON and garbage', () => {
    const badJson = parseProjectImport('{not json')
    expect(badJson.ok).toBe(false)

    const garbage = parseProjectImport(JSON.stringify({ foo: 1 }))
    expect(garbage.ok).toBe(false)

    const emptyBundle = parseProjectImport(
      JSON.stringify({
        schemaVersion: 1,
        kind: 'biointel-projects',
        exportedAt: new Date().toISOString(),
        projects: [{ not: 'a project' }],
      }),
    )
    expect(emptyBundle.ok).toBe(false)
  })

  it('import renames on id conflict by default', () => {
    const storage = memoryStorage()
    const created = createAndSaveProject(
      { name: 'Original', id: 'prj_fixed', candidates: [makeCandidate('cid:1')] },
      storage,
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const exported = exportProjectToJson(created.value)
    const result = importProjectsFromJson(exported, { storage, renameOnConflict: true })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.imported).toHaveLength(1)
    expect(result.imported[0].id).not.toBe('prj_fixed')
    expect(listProjects(storage)).toHaveLength(2)
  })

  it('import overwrite mode replaces same id', () => {
    const storage = memoryStorage()
    const created = createAndSaveProject(
      { name: 'Old name', id: 'prj_fixed', candidates: [] },
      storage,
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const updated = { ...created.value, name: 'New name', candidates: [makeCandidate('cid:9')] }
    const result = importProjects([updated], { storage, renameOnConflict: false })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.imported[0].name).toBe('New name')
    expect(listProjects(storage)).toHaveLength(1)
    expect(listProjects(storage)[0].candidates).toHaveLength(1)
  })

  it('projectExportFilename slugs project name', () => {
    const p = createProject({ name: 'ATTR Amyloidosis!!' })
    expect(projectExportFilename(p)).toMatch(/^biointel-project-attr-amyloidosis/)
    expect(projectExportFilename()).toMatch(/^biointel-projects-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('round-trips preferencesSnapshot, rubric, and disease', () => {
    const storage = memoryStorage()
    const snap = {
      rubricPreset: 'repurposing',
      aeAggressiveness: 'hard-penalty' as const,
      harvestTiming: 'rank-time' as const,
    }
    const disease = {
      id: 'EFO_0000249',
      idNamespace: 'efo' as const,
      name: 'Alzheimer disease',
      synonyms: [],
      therapeuticAreas: [],
      xrefs: [],
      identityTrust: 'high' as const,
    }
    const created = createAndSaveProject(
      {
        name: 'Scoped board',
        preferencesSnapshot: snap,
        disease,
        candidates: [makeCandidate('cid:1')],
      },
      storage,
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const json = exportProjectToJson(created.value)
    const parsed = parseProjectImport(json)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value[0].preferencesSnapshot).toEqual(snap)
    expect(parsed.value[0].disease?.name).toBe('Alzheimer disease')

    const imported = importProjectsFromJson(json, { storage, renameOnConflict: true })
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.imported[0].preferencesSnapshot).toEqual(snap)
    expect(imported.imported[0].disease?.id).toBe('EFO_0000249')
  })
})
