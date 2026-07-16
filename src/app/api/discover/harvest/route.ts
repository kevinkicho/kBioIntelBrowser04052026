import { NextRequest, NextResponse } from 'next/server'
import {
  harvestCandidateAxes,
  HARVEST_K_DEFAULT,
  type HarvestCandidateInput,
} from '@/lib/discovery/harvest'
import {
  createDefaultScoreRubric,
  RUBRIC_PRESETS,
  type RubricPresetId,
  type ScoreAxisWeights,
  type ScoreVector,
  type AeAggressiveness,
} from '@/lib/domain/score'

const MAX_BODY_BYTES = 64 * 1024
const MAX_CANDIDATES = 15
const PRESET_IDS = new Set(Object.keys(RUBRIC_PRESETS))

/**
 * POST /api/discover/harvest
 * Body: {
 *   candidates: [{ name, candidateId?, scores?, phaseNorm?, clinicalStage? }],
 *   runSafety?: boolean (default true),
 *   runNovelty?: boolean (default true),
 *   rubric? | rubricPreset? | aeAggressiveness?
 * }
 * Used for board/promote-time harvest (default) or explicit “Load safety scores”.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 400 })
    }
    body = text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawList = body.candidates
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return NextResponse.json(
      { error: 'candidates array required (1–15 items with name)' },
      { status: 400 },
    )
  }

  const candidates: HarvestCandidateInput[] = []
  for (const item of rawList.slice(0, MAX_CANDIDATES)) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (typeof o.name !== 'string' || o.name.trim().length < 1) continue
    candidates.push({
      name: o.name.trim(),
      candidateId: typeof o.candidateId === 'string' ? o.candidateId : undefined,
      scores: o.scores && typeof o.scores === 'object' ? (o.scores as ScoreVector) : undefined,
      phaseNorm: typeof o.phaseNorm === 'number' ? o.phaseNorm : null,
      clinicalStage: typeof o.clinicalStage === 'number' ? o.clinicalStage : null,
    })
  }

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: 'No valid candidates (each needs a non-empty name)' },
      { status: 400 },
    )
  }

  let rubric = createDefaultScoreRubric('balanced')
  if (body.rubric && typeof body.rubric === 'object') {
    const r = body.rubric as Record<string, unknown>
    const preset =
      typeof r.preset === 'string' && PRESET_IDS.has(r.preset)
        ? (r.preset as RubricPresetId)
        : 'balanced'
    rubric = createDefaultScoreRubric(preset, {
      weights:
        r.weights && typeof r.weights === 'object'
          ? (r.weights as ScoreAxisWeights)
          : undefined,
      aeAggressiveness:
        r.aeAggressiveness === 'hard-penalty' || r.aeAggressiveness === 'soft-flag'
          ? (r.aeAggressiveness as AeAggressiveness)
          : undefined,
      missingAxisPolicy:
        r.missingAxisPolicy === 'penalize' || r.missingAxisPolicy === 'renormalize'
          ? r.missingAxisPolicy
          : undefined,
    })
  } else {
    const preset =
      typeof body.rubricPreset === 'string' && PRESET_IDS.has(body.rubricPreset)
        ? (body.rubricPreset as RubricPresetId)
        : 'balanced'
    rubric = createDefaultScoreRubric(preset, {
      aeAggressiveness:
        body.aeAggressiveness === 'hard-penalty' || body.aeAggressiveness === 'soft-flag'
          ? (body.aeAggressiveness as AeAggressiveness)
          : undefined,
    })
  }

  const runSafety = body.runSafety !== false
  const runNovelty = body.runNovelty !== false

  try {
    const result = await harvestCandidateAxes(candidates, {
      runSafety,
      runNovelty,
      rubric,
      concurrency: 4,
    })

    return NextResponse.json({
      ...result,
      k: Math.min(candidates.length, HARVEST_K_DEFAULT),
      rubric,
    })
  } catch (error) {
    console.error('[api/discover/harvest] Error:', error)
    return NextResponse.json(
      {
        error: 'Harvest failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
