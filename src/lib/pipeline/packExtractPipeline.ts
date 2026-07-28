/**
 * Board pack claim extraction pipeline — select candidates → fetch panels → extract.
 * Soft panel timeouts; empty panels = warning, not hard fail.
 * @see docs/design/discovery-workbench-v2.md §6.5
 */

import type { Project } from '@/lib/domain'
import {
  buildBoardPackClaims,
  type BoardPackClaimsResult,
} from '@/lib/project/packClaims'
import { newPipelineRun, runStage } from './runStage'
import type { PipelineReport } from './types'

export interface PackExtractPipelineResult extends BoardPackClaimsResult {
  pipeline: PipelineReport
}

/**
 * Reliable wrapper around buildBoardPackClaims with staged reporting.
 * Underlying fetch already soft-fails per panel; this adds overall stages + timeout.
 */
export async function runPackExtractPipeline(input: {
  project: Project
  maxCandidates?: number
  signal?: AbortSignal
  includeLandscape?: boolean
  /** Overall budget (default 90s for multi-CID × multi-category) */
  overallTimeoutMs?: number
}): Promise<PackExtractPipelineResult> {
  const run = newPipelineRun('pack-extract')
  const signal = input.signal
  const overallMs = input.overallTimeoutMs ?? 90_000

  const overallAbort = new AbortController()
  const timer = setTimeout(() => {
    overallAbort.abort(new DOMException('Pack extract overall timeout', 'AbortError'))
  }, overallMs)
  const onParent = () => overallAbort.abort(signal?.reason)
  signal?.addEventListener('abort', onParent, { once: true })

  // Merge parent abort with overall
  const merged = overallAbort.signal

  try {
    const { value: result, stage } = await runStage(
      {
        id: 'build_board_claims',
        timeoutMs: overallMs - 1_000,
        retries: 0,
        signal: merged,
      },
      async () =>
        buildBoardPackClaims(input.project, {
          maxCandidates: input.maxCandidates,
          signal: merged,
          includeLandscape: input.includeLandscape,
        }),
    )
    run.addStage(stage)

    if (!result) {
      return {
        panels: {},
        claims: [],
        landscapeClaims: [],
        claimIds: [],
        candidatesUsed: [],
        warnings: [stage.error || 'Pack extract failed'],
        citableCount: 0,
        pipeline: run.finish(false, false),
      }
    }

    // Post-validate claim shape (ids present)
    const { stage: valStage } = await runStage(
      { id: 'validate_claims', timeoutMs: 1_000, optional: true, signal: merged },
      async () => {
        const bad = result.claims.filter((c) => !c.id || !c.statement).length
        if (bad > 0) {
          throw new Error(`${bad} claims missing id or statement`)
        }
        return true
      },
    )
    run.addStage(valStage)

    if (result.warnings.length) {
      run.report.warnings.push(...result.warnings)
    }

    const degraded =
      result.claims.length === 0 ||
      result.warnings.length > 0 ||
      valStage.status === 'error'

    return {
      ...result,
      pipeline: run.finish(true, degraded),
    }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onParent)
  }
}
