import { NextRequest, NextResponse } from 'next/server'
import {
  rankCandidatesForDisease,
  UnknownDiseaseIdError,
  type RankEngineOptions,
} from '@/lib/discovery/engine'
import {
  createDefaultScoreRubric,
  RUBRIC_PRESETS,
  type RubricPresetId,
  type ScoreAxisWeights,
  type AeAggressiveness,
} from '@/lib/domain/score'
import type { DiscoveryPreferencesSnapshot } from '@/lib/discovery/preferences'
import { logApiOutcome, startApiTimer } from '@/lib/serverLog'

const MAX_LIMIT = 25
const MIN_QUERY_LENGTH = 2
const MAX_BODY_BYTES = 16 * 1024

const PRESET_IDS = new Set(Object.keys(RUBRIC_PRESETS))

function parseLimit(raw: string | null | undefined): number {
  return Math.min(Math.max(parseInt(raw ?? '15', 10) || 15, 1), MAX_LIMIT)
}

function parseBool(raw: unknown): boolean | undefined {
  if (typeof raw === 'boolean') return raw
  if (raw === 'true' || raw === '1') return true
  if (raw === 'false' || raw === '0') return false
  return undefined
}

function buildOptions(input: {
  limit?: number
  rubricPreset?: string
  aeAggressiveness?: string
  harvestTiming?: string
  runSafetyHarvest?: unknown
  runNoveltyHarvest?: unknown
  customWeights?: unknown
  rubric?: unknown
}): RankEngineOptions {
  let rubric = createDefaultScoreRubric('balanced')

  if (input.rubric && typeof input.rubric === 'object') {
    const r = input.rubric as Record<string, unknown>
    const preset =
      typeof r.preset === 'string' && PRESET_IDS.has(r.preset)
        ? (r.preset as RubricPresetId)
        : 'balanced'
    const weights =
      r.weights && typeof r.weights === 'object'
        ? (r.weights as ScoreAxisWeights)
        : undefined
    const ae =
      r.aeAggressiveness === 'hard-penalty' || r.aeAggressiveness === 'soft-flag'
        ? (r.aeAggressiveness as AeAggressiveness)
        : undefined
    const missing =
      r.missingAxisPolicy === 'penalize' || r.missingAxisPolicy === 'renormalize'
        ? r.missingAxisPolicy
        : undefined
    rubric = createDefaultScoreRubric(preset, {
      weights,
      aeAggressiveness: ae,
      missingAxisPolicy: missing,
      penalizeValue: typeof r.penalizeValue === 'number' ? r.penalizeValue : undefined,
    })
  } else {
    const preset =
      typeof input.rubricPreset === 'string' && PRESET_IDS.has(input.rubricPreset)
        ? (input.rubricPreset as RubricPresetId)
        : 'balanced'
    const ae =
      input.aeAggressiveness === 'hard-penalty' || input.aeAggressiveness === 'soft-flag'
        ? (input.aeAggressiveness as AeAggressiveness)
        : undefined
    const weights =
      input.customWeights && typeof input.customWeights === 'object'
        ? (input.customWeights as ScoreAxisWeights)
        : undefined
    rubric = createDefaultScoreRubric(preset, {
      aeAggressiveness: ae,
      weights,
    })
  }

  // Harvest flags: explicit body wins; else harvestTiming=rank-time enables both
  let runSafetyHarvest = parseBool(input.runSafetyHarvest)
  let runNoveltyHarvest = parseBool(input.runNoveltyHarvest)
  if (runSafetyHarvest === undefined && runNoveltyHarvest === undefined) {
    const rankTime = input.harvestTiming === 'rank-time'
    runSafetyHarvest = rankTime
    runNoveltyHarvest = rankTime
  }

  const preferencesSnapshot: DiscoveryPreferencesSnapshot = {
    rubricPreset: rubric.preset,
    aeAggressiveness: rubric.aeAggressiveness,
    harvestTiming:
      input.harvestTiming === 'rank-time' || runSafetyHarvest || runNoveltyHarvest
        ? runSafetyHarvest || runNoveltyHarvest
          ? input.harvestTiming === 'board-promote'
            ? 'board-promote'
            : 'rank-time'
          : 'board-promote'
        : 'board-promote',
  }
  // Normalize snapshot harvestTiming
  if (input.harvestTiming === 'rank-time' || input.harvestTiming === 'board-promote') {
    preferencesSnapshot.harvestTiming = input.harvestTiming
  } else if (runSafetyHarvest || runNoveltyHarvest) {
    preferencesSnapshot.harvestTiming = 'rank-time'
  } else {
    preferencesSnapshot.harvestTiming = 'board-promote'
  }

  return {
    limit: input.limit,
    rubric,
    preferencesSnapshot,
    runSafetyHarvest: runSafetyHarvest === true,
    runNoveltyHarvest: runNoveltyHarvest === true,
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const diseaseIdParam = request.nextUrl.searchParams.get('diseaseId')
  const diseaseId = diseaseIdParam?.trim() || undefined
  const targetsRaw = request.nextUrl.searchParams.get('targets')
  const targets = targetsRaw
    ? targetsRaw.split(/[,+|]/).map((s) => s.trim()).filter(Boolean).slice(0, 10)
    : undefined
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'))
  const query = (q?.trim() || diseaseId || '').trim()

  if (!query || (query.length < MIN_QUERY_LENGTH && !diseaseId)) {
    return NextResponse.json(
      { error: `Provide q (min ${MIN_QUERY_LENGTH} chars) and/or diseaseId` },
      { status: 400 },
    )
  }

  const options = buildOptions({
    limit,
    rubricPreset: request.nextUrl.searchParams.get('rubricPreset') ?? undefined,
    aeAggressiveness: request.nextUrl.searchParams.get('aeAggressiveness') ?? undefined,
    harvestTiming: request.nextUrl.searchParams.get('harvestTiming') ?? undefined,
    runSafetyHarvest: request.nextUrl.searchParams.get('runSafetyHarvest'),
    runNoveltyHarvest: request.nextUrl.searchParams.get('runNoveltyHarvest'),
  })
  options.diseaseId = diseaseId
  options.targets = targets

  try {
    const result = await rankCandidatesForDisease(query, options)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof UnknownDiseaseIdError) {
      return NextResponse.json(
        { error: 'Unknown diseaseId', message: error.message, diseaseId: error.diseaseId },
        { status: 404 },
      )
    }
    console.error('[api/discover/rank] Error:', error)
    return NextResponse.json(
      {
        error: 'Candidate ranking failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large (max 16KB)' }, { status: 400 })
    }
    if (text.trim()) {
      body = JSON.parse(text) as Record<string, unknown>
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const q =
    (typeof body.q === 'string' ? body.q : null) ??
    (typeof body.query === 'string' ? body.query : null) ??
    request.nextUrl.searchParams.get('q')

  if ((!q || q.trim().length < MIN_QUERY_LENGTH) && !body.diseaseId) {
    return NextResponse.json(
      { error: 'Body must include q (or diseaseId) with at least 2 characters' },
      { status: 400 },
    )
  }

  // diseaseId-only pin without q: use diseaseId as query string for gather
  const query = (q && q.trim().length >= MIN_QUERY_LENGTH ? q.trim() : String(body.diseaseId ?? '')).trim()
  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at least ${MIN_QUERY_LENGTH} characters` },
      { status: 400 },
    )
  }

  const limit = parseLimit(
    typeof body.limit === 'number' ? String(body.limit) : request.nextUrl.searchParams.get('limit'),
  )

  const options = buildOptions({
    limit,
    rubricPreset: typeof body.rubricPreset === 'string' ? body.rubricPreset : undefined,
    aeAggressiveness:
      typeof body.aeAggressiveness === 'string' ? body.aeAggressiveness : undefined,
    harvestTiming: typeof body.harvestTiming === 'string' ? body.harvestTiming : undefined,
    runSafetyHarvest: body.runSafetyHarvest,
    runNoveltyHarvest: body.runNoveltyHarvest,
    customWeights: body.customWeights,
    rubric: body.rubric,
  })
  if (typeof body.diseaseId === 'string' && body.diseaseId.trim()) {
    options.diseaseId = body.diseaseId.trim()
  }
  if (Array.isArray(body.targets)) {
    options.targets = body.targets
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10)
  } else if (typeof body.targets === 'string') {
    options.targets = body.targets
      .split(/[,+|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10)
  }

  const timer = startApiTimer()
  try {
    const result = await rankCandidatesForDisease(query, options)
    logApiOutcome({
      route: '/api/discover/rank',
      method: 'POST',
      status: 200,
      ms: timer.ms(),
      diseaseId: options.diseaseId ?? null,
      count: Array.isArray(result?.candidates) ? result.candidates.length : undefined,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof UnknownDiseaseIdError) {
      logApiOutcome({
        route: '/api/discover/rank',
        method: 'POST',
        status: 404,
        ms: timer.ms(),
        diseaseId: error.diseaseId,
        error: error.message.slice(0, 200),
      })
      return NextResponse.json(
        { error: 'Unknown diseaseId', message: error.message, diseaseId: error.diseaseId },
        { status: 404 },
      )
    }
    logApiOutcome({
      route: '/api/discover/rank',
      method: 'POST',
      status: 500,
      ms: timer.ms(),
      diseaseId: options.diseaseId ?? null,
      error: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
    })
    return NextResponse.json(
      {
        error: 'Candidate ranking failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
