/**
 * Orphanet rare-disease gene pin merge — free Orphadata, non-fatal after rank.
 * Stages: network_genes → merge_pins → provenance
 */

import { clientFetch } from '@/lib/clientFetch'
import {
  MAX_DISCOVER_TARGETS,
  mergeOrphanetGenesIntoTargets,
} from '@/lib/discovery/discoverUrl'
import { newPipelineRun, runStage } from './runStage'
import type { PipelineReport } from './types'

export interface OrphanetPinPipelineResult {
  mergedTargets: string[]
  provenance: {
    orphaCode: string | null
    diseaseName: string | null
    genes: string[]
    added: number
    error?: string | null
  }
  pipeline: PipelineReport
  /** False when network failed but rank should still succeed */
  ok: boolean
}

/**
 * Fetch Orphanet genes for a disease name and merge into existing target pins.
 * Never throws on upstream failure (returns ok:false + error provenance).
 */
export async function runOrphanetPinPipeline(input: {
  diseaseName: string
  existingTargets: string[]
  maxTargets?: number
  signal?: AbortSignal
}): Promise<OrphanetPinPipelineResult> {
  const run = newPipelineRun('orphanet-pin-merge')
  const signal = input.signal
  const max = input.maxTargets ?? MAX_DISCOVER_TARGETS
  const diseaseName = input.diseaseName.trim()

  if (!diseaseName) {
    run.addStage({
      id: 'network_genes',
      status: 'skipped',
      ms: 0,
      notes: ['empty disease name'],
    })
    return {
      mergedTargets: [...input.existingTargets],
      provenance: {
        orphaCode: null,
        diseaseName: null,
        genes: [],
        added: 0,
        error: 'No disease name for Orphanet lookup',
      },
      pipeline: run.finish(false, true),
      ok: false,
    }
  }

  const { value: body, stage: netStage } = await runStage(
    {
      id: 'network_genes',
      timeoutMs: 12_000,
      retries: 1,
      retryDelayMs: 500,
      signal,
      optional: true,
    },
    async () => {
      const res = await clientFetch(
        `/api/orphanet/genes?q=${encodeURIComponent(diseaseName)}`,
        signal ? { signal } : undefined,
        { retries: 1, retryDelayMs: 400, timeoutMs: 10_000 },
      )
      if (!res.ok) {
        throw new Error(`Orphanet genes HTTP ${res.status}`)
      }
      return (await res.json()) as {
        genes?: unknown
        orphaCode?: string | null
        diseaseName?: string
        error?: string
      }
    },
  )
  run.addStage(netStage)

  if (!body) {
    const err = netStage.error || 'Orphanet lookup failed'
    if (netStage.errorKind === 'abort') {
      return {
        mergedTargets: [...input.existingTargets],
        provenance: {
          orphaCode: null,
          diseaseName,
          genes: [],
          added: 0,
          error: null,
        },
        pipeline: run.finish(false, false),
        ok: false,
      }
    }
    return {
      mergedTargets: [...input.existingTargets],
      provenance: {
        orphaCode: null,
        diseaseName,
        genes: [],
        added: 0,
        error: err,
      },
      pipeline: run.finish(false, true),
      ok: false,
    }
  }

  const { value: mergeOut, stage: mergeStage } = await runStage(
    { id: 'merge_pins', timeoutMs: 500, signal },
    async () => {
      const genes = Array.isArray(body.genes)
        ? body.genes.filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
        : []
      const mergedTargets = mergeOrphanetGenesIntoTargets(
        input.existingTargets,
        genes,
        max,
      )
      const added = Math.max(0, mergedTargets.length - input.existingTargets.length)
      return {
        genes,
        mergedTargets,
        added,
        orphaCode: body.orphaCode ?? null,
        diseaseName: body.diseaseName ?? diseaseName,
        error: body.error ?? null,
      }
    },
  )
  run.addStage(mergeStage)

  if (!mergeOut) {
    return {
      mergedTargets: [...input.existingTargets],
      provenance: {
        orphaCode: null,
        diseaseName,
        genes: [],
        added: 0,
        error: mergeStage.error || 'Merge failed',
      },
      pipeline: run.finish(false, true),
      ok: false,
    }
  }

  return {
    mergedTargets: mergeOut.mergedTargets,
    provenance: {
      orphaCode: mergeOut.orphaCode,
      diseaseName: mergeOut.diseaseName,
      genes: mergeOut.genes,
      added: mergeOut.added,
      error: mergeOut.error,
    },
    pipeline: run.finish(true, Boolean(mergeOut.error)),
    ok: true,
  }
}
