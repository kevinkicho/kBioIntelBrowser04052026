/**
 * Phase B agent tools: open_panel, fix_gap, compare_board, get_pack_claims.
 */

import { executeCopilotTool, type CopilotToolContext } from '../copilot/tools/execute'
import type { RetrievalSnapshot } from '../retrievalMonitor'
import { createAndSaveProject, addCandidateAndSave, addPackIndexEntryAndSave } from '@/lib/project'
import type { MoleculeCandidate } from '@/lib/domain'

function emptySnapshot(partial?: Partial<RetrievalSnapshot>): RetrievalSnapshot {
  return {
    overallCompleteness: 0.5,
    categoryLoadRatio: 0.5,
    totalApisCalled: 4,
    totalApisSucceeded: 2,
    totalApisEmpty: 1,
    totalApisTimeout: 0,
    totalApisErrored: 1,
    totalApisPending: 0,
    totalDurationMs: 100,
    slowestApi: null,
    categories: {} as RetrievalSnapshot['categories'],
    anomalies: [],
    timestamp: new Date().toISOString(),
    gaps: [
      {
        title: 'Adverse Events',
        panelKey: 'adverseEvents',
        panelId: 'adverse-events',
        categoryId: 'clinical-safety',
        reason: 'error',
        actionable: true,
        detail: 'timeout',
      },
    ],
    ...partial,
  }
}

function baseCtx(over?: Partial<CopilotToolContext>): CopilotToolContext {
  return {
    snapshot: emptySnapshot(),
    categoryData: {},
    categoryStatus: {
      'clinical-safety': 'error',
    } as CopilotToolContext['categoryStatus'],
    identity: { name: 'TestMol', cid: 1 },
    ...over,
  }
}

describe('copilot tools Phase B', () => {
  it('open_panel invokes openPanel hook', () => {
    const opened: string[] = []
    const res = executeCopilotTool(
      { name: 'open_panel', args: { panelId: 'adverse-events', categoryId: 'clinical-safety' } },
      baseCtx({
        openPanel: (id) => opened.push(id),
      }),
    )
    expect(res.ok).toBe(true)
    expect(opened).toEqual(['adverse-events'])
    expect(res.sideEffect).toBe('open_panel')
  })

  it('open_panel fails without hook', () => {
    const res = executeCopilotTool(
      { name: 'open_panel', args: { panelId: 'clinical-trials' } },
      baseCtx(),
    )
    expect(res.ok).toBe(false)
  })

  it('fix_gap retries error categories', () => {
    const retried: string[] = []
    const res = executeCopilotTool(
      { name: 'fix_gap', args: { panelKey: 'adverseEvents' } },
      baseCtx({
        refreshCategory: (id) => retried.push(id),
      }),
    )
    expect(res.ok).toBe(true)
    expect(retried).toContain('clinical-safety')
    expect(res.sideEffect).toBe('retry_category')
  })

  it('fix_gap reports empty without inventing', () => {
    const res = executeCopilotTool(
      { name: 'fix_gap', args: {} },
      baseCtx({
        snapshot: emptySnapshot({
          gaps: [
            {
              title: 'Empty panel',
              panelKey: 'foo',
              categoryId: 'clinical-safety',
              reason: 'empty',
              actionable: false,
              detail: 'no rows',
            },
          ],
        }),
      }),
    )
    expect(res.ok).toBe(true)
    expect(res.summary).toMatch(/empty/i)
  })

  it('compare_board reads local project', () => {
    const created = createAndSaveProject({ name: 'Tool test board' })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const cand: MoleculeCandidate = {
      candidateId: 'cand-1',
      identity: {
        name: 'Tafamidis',
        pubchemCid: 208901,
        synonyms: [],
        identityTrust: 'high',
      },
      origins: [],
      links: [],
      boardStatus: 'promote',
      scores: {
        composite: 0.8,
        rubricVersion: 1,
        axes: {
          efficacy: 0.8,
          clinicalStage: 0.7,
          safety: 0.6,
          novelty: 0.5,
          identityTrust: 0.9,
        },
        axisStatus: {
          efficacy: 'computed',
          clinicalStage: 'computed',
          safety: 'computed',
          novelty: 'computed',
          identityTrust: 'computed',
        },
        scorePhase: 'full',
      },
      evidenceBreadthSources: ['chembl'],
    }
    addCandidateAndSave(created.value.id, cand)
    const res = executeCopilotTool(
      { name: 'compare_board', args: { projectId: created.value.id } },
      baseCtx(),
    )
    expect(res.ok).toBe(true)
    expect(res.summary).toMatch(/Tafamidis|promote|1 candidates/i)
    const data = res.data as { candidates: { name: string }[] }
    expect(data.candidates.some((c) => c.name === 'Tafamidis')).toBe(true)
  })

  it('get_pack_claims summarizes pack index', () => {
    const created = createAndSaveProject({ name: 'Pack claims board' })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    addPackIndexEntryAndSave(created.value.id, {
      id: 'pack-1',
      title: 'Test pack',
      createdAt: new Date().toISOString(),
      claimIds: ['ec:1', 'ec:2'],
      claimCount: 2,
      candidateCount: 1,
    })
    const res = executeCopilotTool(
      { name: 'get_pack_claims', args: { projectId: created.value.id } },
      baseCtx(),
    )
    expect(res.ok).toBe(true)
    expect(res.summary).toMatch(/claim/i)
    const data = res.data as { packs: { claimCount: number }[] }
    expect(data.packs[0].claimCount).toBe(2)
  })

  it('compare_board fails without project', () => {
    const res = executeCopilotTool({ name: 'compare_board', args: {} }, baseCtx())
    expect(res.ok).toBe(false)
  })
})
