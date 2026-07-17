/**
 * Write-through registration is browser-only; test hook registration path lightly.
 */

import { registerProjectMutateHook, saveProject, deleteProject, listProjects } from '@/lib/project/store'
import type { Project } from '@/lib/domain'

function minimalProject(id: string): Project {
  return {
    schemaVersion: 1,
    id,
    name: 'Test board',
    targetIds: [],
    candidates: [],
    packIndex: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('project mutate hooks', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('invokes onSave after successful local save', () => {
    const saved: string[] = []
    const unsub = registerProjectMutateHook({
      onSave: (p) => saved.push(p.id),
    })
    const result = saveProject(minimalProject('prj_hook_1'))
    expect(result.ok).toBe(true)
    expect(saved).toEqual(['prj_hook_1'])
    unsub()
  })

  it('invokes onDelete after successful local delete', () => {
    const deleted: string[] = []
    saveProject(minimalProject('prj_hook_2'))
    const unsub = registerProjectMutateHook({
      onDelete: (id) => deleted.push(id),
    })
    const result = deleteProject('prj_hook_2')
    expect(result.ok).toBe(true)
    expect(deleted).toEqual(['prj_hook_2'])
    expect(listProjects().find((p) => p.id === 'prj_hook_2')).toBeUndefined()
    unsub()
  })
})
