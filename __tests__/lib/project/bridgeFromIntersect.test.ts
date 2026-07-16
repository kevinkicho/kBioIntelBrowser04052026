import {
  intersectMatchToCandidate,
  sendIntersectMatchesToBoard,
} from '@/lib/project/bridgeFromIntersect'
import { listProjects, deleteProject } from '@/lib/project/store'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
  }
}

describe('bridgeFromIntersect', () => {
  test('intersectMatchToCandidate maps cid and origin', () => {
    const c = intersectMatchToCandidate({
      cid: 2244,
      name: 'aspirin',
      reasons: ['targets EGFR', 'phase 3'],
    })
    expect(c.identity.pubchemCid).toBe(2244)
    expect(c.identity.name).toBe('aspirin')
    expect(c.origins).toContain('hypothesis-intersect')
    expect(c.candidateId).toMatch(/^cid:|^nm:/)
  })

  test('sendIntersectMatchesToBoard creates project and adds candidates', () => {
    // use real localStorage mock if window exists; else skip path
    if (typeof window === 'undefined') {
      // jsdom provides window in jest
    }
    const res = sendIntersectMatchesToBoard({
      matches: [
        { cid: 2244, name: 'aspirin', reasons: ['a'] },
        { cid: 3672, name: 'ibuprofen', reasons: ['b'] },
      ],
      newProjectName: 'Test board from intersect',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.added).toBe(2)
    expect(res.value.project.candidates.length).toBe(2)
    // cleanup
    deleteProject(res.value.project.id)
  })
})
