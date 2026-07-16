import { NextRequest, NextResponse } from 'next/server'
import { validateOllamaUrl } from '@/lib/ai/config'
import { generateChat } from '@/lib/ai/ollama'
import {
  buildPackAiContext,
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
])

/**
 * POST structured pack AI analysis. Validates claimIds against pack allowlist.
 * Body: { mode, pack: { title, claims, candidates?, disease? }, model, ollamaUrl }
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<PackAiRequest> & {
    model?: string
    ollamaUrl?: string
  }

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

  const validation = validateOllamaUrl(body.ollamaUrl, { forServer: true })
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const ctx = buildPackAiContext(body.pack as PackAiRequest['pack'])
  const messages = [
    { role: 'system' as const, content: packModeSystemPrompt(mode) },
    { role: 'user' as const, content: packModeUserPrompt(ctx, mode) },
  ]

  let raw = ''
  const result = await generateChat(validation.normalized!, body.model, messages, (token) => {
    raw += token
  })

  if (!result.success) {
    return NextResponse.json({
      ok: false,
      mode,
      refused: true,
      refuseReason: result.error ?? 'Chat failed',
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
