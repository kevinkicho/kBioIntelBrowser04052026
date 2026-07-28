/**
 * Pack AI claim-bound validation pipeline.
 * Stages: allowlist → parse/validate → refuse-or-pass
 * Product law: AI is non-of-record; claim ids must ⊆ pack allowlist.
 */

import type { PackAiMode } from '@/lib/ai/contracts'
import { minClaimsForPackMode } from '@/lib/ai/contracts'
import {
  validatePackAiOutput,
  type ValidationResult,
} from '@/lib/ai/validateOutput'
import { newPipelineRun, runStage } from './runStage'
import type { PipelineReport } from './types'

export interface PackAiValidatePipelineInput {
  rawModelText: string
  claimIdAllowlist: readonly string[]
  mode: PackAiMode
}

export interface PackAiValidatePipelineResult {
  validation: ValidationResult
  pipeline: PipelineReport
  allowlistSize: number
  minClaims: number
}

/**
 * Validate structured pack AI JSON against claim allowlist with staged report.
 */
export async function runPackAiValidatePipeline(
  input: PackAiValidatePipelineInput,
): Promise<PackAiValidatePipelineResult> {
  const run = newPipelineRun('pack-ai-validate')
  const allowlist = input.claimIdAllowlist
  const minClaims = minClaimsForPackMode(input.mode)

  const { stage: allowStage } = await runStage(
    { id: 'check_allowlist', timeoutMs: 200 },
    async () => {
      if (!Array.isArray(allowlist)) throw new Error('Allowlist missing')
      return allowlist.length
    },
  )
  run.addStage(allowStage)

  if (allowlist.length < minClaims && minClaims > 0) {
    run.addStage({
      id: 'validate_output',
      status: 'skipped',
      ms: 0,
      notes: [`insufficient pack claims ${allowlist.length}<${minClaims}`],
    })
    // Still run validator for consistent refuse shape
    const validation = validatePackAiOutput(
      input.rawModelText || '{}',
      allowlist,
      input.mode,
    )
    // Force refuse for thin packs even if model returned empty json
    if (!validation.refused) {
      validation.refused = true
      validation.refuseReason = `Insufficient evidence in pack (${allowlist.length} claims; need ≥${minClaims} for ${input.mode})`
    }
    return {
      validation,
      pipeline: run.finish(true, true),
      allowlistSize: allowlist.length,
      minClaims,
    }
  }

  const { value: validation, stage: valStage } = await runStage(
    { id: 'validate_output', timeoutMs: 2_000 },
    async () => validatePackAiOutput(input.rawModelText, allowlist, input.mode),
  )
  run.addStage(valStage)

  if (!validation) {
    const fallback: ValidationResult = {
      ok: false,
      refused: true,
      refuseReason: valStage.error || 'Validation failed',
      errors: ['pipeline_error'],
    }
    return {
      validation: fallback,
      pipeline: run.finish(false, false),
      allowlistSize: allowlist.length,
      minClaims,
    }
  }

  // Extra honesty stage: orphan ids already stripped by validator
  run.addStage({
    id: 'claim_bound_check',
    status: validation.refused ? 'skipped' : 'ok',
    ms: 0,
    notes: validation.refused
      ? [validation.refuseReason || 'refused']
      : [
          `${validation.insight?.claimIds?.length ?? 0} claim id(s) on allowlist`,
          ...(validation.errors.length
            ? [`notes: ${validation.errors.slice(0, 3).join('; ')}`]
            : []),
        ],
  })

  if (validation.errors.length) {
    run.report.warnings.push(...validation.errors.map((e) => `validate: ${e}`))
  }

  return {
    validation,
    pipeline: run.finish(validation.ok, validation.refused || validation.errors.length > 0),
    allowlistSize: allowlist.length,
    minClaims,
  }
}

/** Build allowlist from pack claims (id strings only). */
export function claimAllowlistFromPack(claims: readonly { id?: string }[] | null | undefined): string[] {
  if (!claims?.length) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const c of claims) {
    const id = typeof c.id === 'string' ? c.id.trim() : ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}
