import { NextRequest, NextResponse } from 'next/server'
import { validateOllamaUrl } from '@/lib/ai/config'
import { generateChat } from '@/lib/ai/ollama'
import { parseRequestOllamaApiKey } from '@/lib/ai/cloudConfig'
import {
  buildRhAiContext,
  isStructuredRhMode,
  rhModeSystemPrompt,
  rhModeUserPrompt,
  type RhAiMode,
  type RhAiRequestBody,
} from '@/lib/ai/rhContracts'
import { validateRhAiOutput } from '@/lib/ai/validateRhOutput'

const MODES = new Set<RhAiMode>([
  'rh_thesis_draft',
  'rh_rival_hypotheses',
  'rh_next_experiments',
  'rh_gap_map',
  'rh_adversarial_review',
  'rh_lab_meeting',
  'rh_specific_aims',
  'rh_custom',
])

/**
 * POST claim-bound Research Hypothesis AI.
 * Body: { mode, hypothesis, claims, candidates?, disease?, targetIds?, model, ollamaUrl, customQuestion? }
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<RhAiRequestBody> & {
    model?: string
    ollamaUrl?: string
    ollamaApiKey?: string
    apiKey?: string
    customQuestion?: string
    overrideSystem?: string
    overrideUser?: string
  }
  const apiKey = parseRequestOllamaApiKey(body)

  const mode = body.mode
  if (!mode || !MODES.has(mode)) {
    return NextResponse.json({ error: 'Invalid RH AI mode' }, { status: 400 })
  }
  if (!body.hypothesis || !Array.isArray(body.claims)) {
    return NextResponse.json({ error: 'hypothesis and claims[] required' }, { status: 400 })
  }
  if (!body.ollamaUrl || !body.model) {
    return NextResponse.json({ error: 'model and ollamaUrl required' }, { status: 400 })
  }
  if (mode === 'rh_custom' && !(body.customQuestion || '').trim()) {
    return NextResponse.json({ error: 'customQuestion required for rh_custom' }, { status: 400 })
  }

  const validation = validateOllamaUrl(body.ollamaUrl, { forServer: true })
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const ctx = buildRhAiContext({
    title: body.hypothesis.title,
    thesis: body.hypothesis.thesis,
    claims: body.claims,
    candidates: body.candidates,
    disease: body.disease,
    targetIds: body.targetIds,
    status: body.hypothesis.status,
  })

  const system =
    typeof body.overrideSystem === 'string' && body.overrideSystem.trim()
      ? body.overrideSystem
      : rhModeSystemPrompt(mode)
  const user =
    typeof body.overrideUser === 'string' && body.overrideUser.trim()
      ? body.overrideUser
      : rhModeUserPrompt(ctx, mode, body.customQuestion)
  const messages = [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]

  let raw = ''
  const result = await generateChat(
    validation.normalized!,
    body.model,
    messages,
    (token) => {
      raw += token
    },
    undefined,
    { apiKey },
  )

  if (!result.success) {
    return NextResponse.json({
      ok: false,
      mode,
      refused: true,
      refuseReason: result.error ?? 'Chat failed',
    })
  }

  if (!isStructuredRhMode(mode)) {
    const text = raw.trim()
    if (!text) {
      return NextResponse.json({
        ok: false,
        mode,
        refused: true,
        refuseReason: 'Empty model response',
      })
    }
    const claimIds = ctx.claimIdAllowlist.filter((id) => text.includes(id))
    return NextResponse.json({
      ok: true,
      mode,
      insight: {
        summary: text,
        claimIds,
      },
      refused: false,
    })
  }

  const validated = validateRhAiOutput(raw, ctx.claimIdAllowlist, mode)
  return NextResponse.json({
    ok: validated.ok,
    mode,
    insight: validated.insight,
    refused: validated.refused,
    refuseReason: validated.refuseReason,
    validationErrors: validated.errors,
  })
}
