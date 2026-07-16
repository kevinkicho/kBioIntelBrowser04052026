/**
 * Board promote-time safety/novelty harvest (PR-V2-02).
 * Auto-harvest only on promote (not watching). Max 15 candidates per API call.
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
): Promise<{ project: Project; warnings: string[]; generation: number; ok: boolean }> {
  const generation = opts?.generation ?? 0
  const idSet = new Set(candidateIds)
  const targets = project.candidates
    .filter((c) => idSet.has(c.candidateId) && candidateNeedsHarvest(c))
    .slice(0, BOARD_HARVEST_MAX)

  if (targets.length === 0) {
    return { project, warnings: [], generation, ok: true }
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

  try {
    const res = await fetch('/api/discover/harvest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: opts?.signal,
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      return {
        project,
        warnings: [err.error ?? err.message ?? `Harvest failed (${res.status})`],
        generation,
        ok: false,
      }
    }
    const data = (await res.json()) as HarvestApiResponse
    const byId = new Map<string, ScoreVector>()
    const byName = new Map<string, ScoreVector>()
    for (const h of data.candidates ?? []) {
      if (h.candidateId) byId.set(h.candidateId, h.scores)
      byName.set(h.name.trim().toLowerCase(), h.scores)
    }

    const nextCandidates = project.candidates.map((c) => {
      if (!idSet.has(c.candidateId)) return c
      const scores = byId.get(c.candidateId) ?? byName.get(c.identity.name.trim().toLowerCase())
      if (!scores) return c
      return mergeMoleculeCandidate(c, {
        ...c,
        scores,
      })
    })

    return {
      project: {
        ...project,
        candidates: nextCandidates,
        updatedAt: new Date().toISOString(),
      },
      warnings: data.warnings ?? [],
      generation,
      ok: true,
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { project, warnings: ['Harvest cancelled'], generation, ok: false }
    }
    return {
      project,
      warnings: [err instanceof Error ? err.message : 'Harvest failed'],
      generation,
      ok: false,
    }
  }
}
