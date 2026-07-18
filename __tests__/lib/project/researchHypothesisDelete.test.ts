/**
 * @jest-environment jsdom
 */

import {
  createResearchHypothesis,
  deleteEmptyClaimResearchHypotheses,
  deleteResearchHypothesis,
  listResearchHypothesesForProject,
  saveResearchHypothesis,
} from '@/lib/project/researchHypothesis'
import { createAndSaveProject } from '@/lib/project/store'

describe('deleteResearchHypothesis', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('removes RH and unlinks from project', () => {
    const proj = createAndSaveProject({ name: 'P' })
    expect(proj.ok).toBe(true)
    if (!proj.ok) return
    const hyp = createResearchHypothesis({
      projectId: proj.value.id,
      title: 'Scaffold',
      thesis: 'dummy',
      claimIds: [],
    })
    expect(saveResearchHypothesis(hyp).ok).toBe(true)
    expect(listResearchHypothesesForProject(proj.value.id)).toHaveLength(1)

    const del = deleteResearchHypothesis(hyp.id)
    expect(del.ok).toBe(true)
    expect(listResearchHypothesesForProject(proj.value.id)).toHaveLength(0)
  })

  it('deleteEmptyClaimResearchHypotheses keeps claim-bound RHs', () => {
    const proj = createAndSaveProject({ name: 'P2' })
    expect(proj.ok).toBe(true)
    if (!proj.ok) return
    const empty = createResearchHypothesis({
      projectId: proj.value.id,
      title: 'Empty',
      thesis: 'x',
      claimIds: [],
    })
    const full = createResearchHypothesis({
      projectId: proj.value.id,
      title: 'Full',
      thesis: 'y',
      claimIds: ['ec:1', 'ec:2'],
    })
    saveResearchHypothesis(empty)
    saveResearchHypothesis(full)

    const res = deleteEmptyClaimResearchHypotheses(proj.value.id)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.removed).toBe(1)
    const left = listResearchHypothesesForProject(proj.value.id)
    expect(left).toHaveLength(1)
    expect(left[0].title).toBe('Full')
  })
})
