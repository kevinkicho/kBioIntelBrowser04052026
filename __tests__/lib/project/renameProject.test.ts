/**
 * @jest-environment node
 */
import {
  createProject,
  renameProject,
  renameProjectAndSave,
  getProject,
  type ProjectStorage,
} from '@/lib/project/store'

function memoryStorage(): ProjectStorage {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
  }
}

describe('renameProject', () => {
  test('pure rename updates name and updatedAt', () => {
    const p = createProject({ name: 'Old name' })
    const r = renameProject(p, '  New board  ')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.name).toBe('New board')
    expect(r.value.updatedAt >= p.updatedAt).toBe(true)
  })

  test('empty name becomes Untitled project', () => {
    const p = createProject({ name: 'X' })
    const r = renameProject(p, '   ')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.name).toBe('Untitled project')
  })

  test('renameProjectAndSave persists', () => {
    const s = memoryStorage()
    const created = createProject({ name: 'Alpha' })
    // seed via save path
    const { saveProject } = require('@/lib/project/store') as typeof import('@/lib/project/store')
    expect(saveProject(created, s).ok).toBe(true)
    const r = renameProjectAndSave(created.id, 'Beta', s)
    expect(r.ok).toBe(true)
    expect(getProject(created.id, s)?.name).toBe('Beta')
  })
})
