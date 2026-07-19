import { NextRequest, NextResponse } from 'next/server'
import { validateOllamaUrl } from '@/lib/ai/config'
import { generateChat } from '@/lib/ai/ollama'
import { parseRequestOllamaApiKey } from '@/lib/ai/cloudConfig'
import {
  buildPackAiContext,
  isStructuredPackMode,
  packModeSystemPrompt,
  packModeUserPrompt,
  type PackAiMode,
  type PackAiRequest,
} from '@/lib/ai/contracts'
import { validatePackAiOutput } from '@/lib/ai/validateOutput'

const MODES = new Set<PackAiMode>([
  'pack_executive_brief',
  'pack_gap_analysis',
  'pack_next_experiment',
  'pack_red_team',
  'pack_custom_prompt',
])

/**
 * POST pack AI analysis (structured modes) or free-form claim-bound chat.
 * Body: { mode, pack, model, ollamaUrl, customQuestion? }
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<PackAiRequest> & {
    model?: string
    ollamaUrl?: string
    ollamaApiKey?: string
    apiKey?: string
    customQuestion?: string
    /** Optional full prompt override from regenerate modal (learning UX) */
    overrideSystem?: string
    overrideUser?: string
  }
  const apiKey = parseRequestOllamaApiKey(body)

  const mode = body.mode
  if (!mode || !MODES.has(mode)) {
    return NextResponse.json({ error: 'Invalid pack AI mode' }, { status: 400 })
  }
  if (!body.pack || !Array.isArray(body.pack.claims)) {
    return NextResponse.json({ error: 'pack.claims required' }, { status: 400 })
  }
  if (!body.ollamaUrl || !body.model) {
    return NextResponse.json({ error: 'model and ollamaUrl required' }, { status: 400 })
  }
  if (mode === 'pack_custom_prompt' && !(body.customQuestion || '').trim()) {
    return NextResponse.json({ error: 'customQuestion required for pack_custom_prompt' }, { status: 400 })
  }

  const validation = validateOllamaUrl(body.ollamaUrl, { forServer: true })
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const ctx = buildPackAiContext(body.pack as PackAiRequest['pack'])
  const system =
    typeof body.overrideSystem === 'string' && body.overrideSystem.trim()
      ? body.overrideSystem
      : packModeSystemPrompt(mode)
  const user =
    typeof body.overrideUser === 'string' && body.overrideUser.trim()
      ? body.overrideUser
      : packModeUserPrompt(ctx, mode, body.customQuestion)
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

  // Free-form chat: return prose as insight.summary (no JSON validation)
  if (!isStructuredPackMode(mode)) {
    const text = raw.trim()
    if (!text) {
      return NextResponse.json({
        ok: false,
        mode,
        refused: true,
        refuseReason: 'Empty model response',
      })
    }
    // Best-effort: collect allowlisted ids mentioned in the answer
    const claimIds = ctx.claimIdAllowlist.filter((id) => text.includes(id))
    return NextResponse.json({
      ok: true,
      mode,
      insight: {
        summary: text,
        claimIds,
        nextSteps: undefined,
        risks: undefined,
      },
      refused: false,
    })
  }

  const validated = validatePackAiOutput(raw, ctx.claimIdAllowlist, mode)
  return NextResponse.json({
    ok: validated.ok,
    mode,
    insight: validated.insight,
    refused: validated.refused,
    refuseReason: validated.refuseReason,
    validationErrors: validated.errors,
  })
}
