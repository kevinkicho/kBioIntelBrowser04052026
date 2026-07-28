/**
 * Board promote-time safety/novelty harvest (PR-V2-02).
 * Auto-harvest only on promote (not watching). Max 15 candidates per API call.
 * Staged reliability: validate targets → network harvest → merge scores.
 * @see docs/design/discovery-workbench-v2.md §6.3
 */

import type { MoleculeCandidate, Project } from '@/lib/domain'
import {
  createDefaultScoreRubric,
  type AeAggressiveness,
  type ScoreRubric,
  type ScoreVector,
} from '@/lib/domain/score'
import {
  loadDiscoveryPreferences,
  scoreRubricFromPreferences,
} from '@/lib/discovery/preferences'
import { mergeMoleculeCandidate } from '@/lib/domain/mergeCandidate'
import { clientFetch } from '@/lib/clientFetch'
import { newPipelineRun, runStage } from '@/lib/pipeline'
import type { PipelineReport } from '@/lib/pipeline'

export const BOARD_HARVEST_MAX = 15

/** Candidate needs safety/novelty harvest when axes are null or phase is still cheap. */
export function candidateNeedsHarvest(c: MoleculeCandidate): boolean {
  const s = c.scores
  if (!s) return true
  if (s.scorePhase === 'cheap') return true
  if (s.axes.safety == null || s.axes.novelty == null) return true
  return false
}

export function rubricForProject(project: Project): ScoreRubric {
  if (project.rubric) return project.rubric
  try {
    return scoreRubricFromPreferences(loadDiscoveryPreferences())
  } catch {
    return createDefaultScoreRubric('balanced')
  }
}

export function aeForProject(project: Project): AeAggressiveness {
  const snap = project.preferencesSnapshot?.aeAggressiveness
  if (snap === 'hard-penalty' || snap === 'soft-flag') return snap
  try {
    return loadDiscoveryPreferences().aeAggressiveness
  } catch {
    return 'soft-flag'
  }
}

export function harvestTimingIsBoardPromote(project: Project): boolean {
  const snap = project.preferencesSnapshot?.harvestTiming
  if (snap === 'rank-time' || snap === 'board-promote') return snap === 'board-promote'
  try {
    return loadDiscoveryPreferences().harvestTiming === 'board-promote'
  } catch {
    return true
  }
}

interface HarvestApiCandidate {
  name: string
  candidateId?: string
  scores?: ScoreVector
  phaseNorm?: number | null
  clinicalStage?: number | null
}

interface HarvestApiResponse {
  candidates?: Array<{
    name: string
    candidateId?: string
    scores: ScoreVector
  }>
  warnings?: string[]
  error?: string
}

/**
 * POST harvest for board candidates and merge scores by candidateId / name.
 * Honors AbortSignal; caller should ignore results when generation is stale.
 * Pipeline stages: select_targets → network_harvest → merge_scores.
 */
export async function harvestCandidatesForBoard(
  project: Project,
  candidateIds: string[],
  opts?: {
    rubric?: ScoreRubric
    aeAggressiveness?: AeAggressiveness
    signal?: AbortSignal
    generation?: number
  },
): Promise<{
  project: Project
  warnings: string[]
  generation: number
  ok: boolean
  pipeline?: PipelineReport
}> {
  const generation = opts?.generation ?? 0
  const run = newPipelineRun('board-harvest')
  const signal = opts?.signal
  const idSet = new Set(candidateIds)

  const { value: targets, stage: selectStage } = await runStage(
    { id: 'select_targets', timeoutMs: 500, signal },
    async () =>
      project.candidates
        .filter((c) => idSet.has(c.candidateId) && candidateNeedsHarvest(c))
        .slice(0, BOARD_HARVEST_MAX),
  )
  run.addStage(selectStage)

  if (!targets || targets.length === 0) {
    run.addStage({
      id: 'network_harvest',
      status: 'skipped',
      ms: 0,
      notes: ['No candidates need harvest'],
    })
    return {
      project,
      warnings: [],
      generation,
      ok: true,
      pipeline: run.finish(true, false),
    }
  }

  const rubric = opts?.rubric ?? rubricForProject(project)
  const ae = opts?.aeAggressiveness ?? aeForProject(project)

  const body = {
    candidates: targets.map(
      (c): HarvestApiCandidate => ({
        name: c.identity.name,
        candidateId: c.candidateId,
        scores: c.scores,
        phaseNorm: c.scores?.axes.clinicalStage ?? null,
        clinicalStage: c.scores?.axes.clinicalStage ?? null,
      }),
    ),
    runSafety: true,
    runNovelty: true,
    rubric,
    rubricPreset: rubric.preset,
    aeAggressiveness: ae,
  }

  const { value: data, stage: netStage } = await runStage(
    {
      id: 'network_harvest',
      timeoutMs: 45_000,
      retries: 2,
      retryDelayMs: 700,
      signal,
      optional: true,
    },
    async () => {
      const res = await clientFetch(
        '/api/discover/harvest',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        },
        { retries: 0, timeoutMs: 40_000 },
      )
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string
          message?: string
        }
        throw new Error(err.error ?? err.message ?? `Harvest failed (${res.status})`)
      }
      return (await res.json()) as HarvestApiResponse
    },
  )
  run.addStage(netStage)

  if (!data) {
    const msg = netStage.error || 'Harvest failed'
    if (netStage.errorKind === 'abort') {
      return {
        project,
        warnings: ['Harvest cancelled'],
        generation,
        ok: false,
        pipeline: run.finish(false, false),
      }
    }
    return {
      project,
      warnings: [msg],
      generation,
      ok: false,
      pipeline: run.finish(false, false),
    }
  }

  const { value: nextProject, stage: mergeStage } = await runStage(
    { id: 'merge_scores', timeoutMs: 2_000, signal },
    async () => {
      const byId = new Map<string, ScoreVector>()
      const byName = new Map<string, ScoreVector>()
      for (const h of data.candidates ?? []) {
        if (h.candidateId) byId.set(h.candidateId, h.scores)
        byName.set(h.name.trim().toLowerCase(), h.scores)
      }

      const nextCandidates = project.candidates.map((c) => {
        if (!idSet.has(c.candidateId)) return c
        const scores =
          byId.get(c.candidateId) ?? byName.get(c.identity.name.trim().toLowerCase())
        if (!scores) return c
        return mergeMoleculeCandidate(c, {
          ...c,
          scores,
        })
      })

      return {
        ...project,
        candidates: nextCandidates,
        updatedAt: new Date().toISOString(),
      } as Project
    },
  )
  run.addStage(mergeStage)

  if (!nextProject) {
    return {
      project,
      warnings: [mergeStage.error || 'Merge failed', ...(data.warnings ?? [])],
      generation,
      ok: false,
      pipeline: run.finish(false, false),
    }
  }

  return {
    project: nextProject,
    warnings: data.warnings ?? [],
    generation,
    ok: true,
    pipeline: run.finish(true, false),
  }
}
