import { NextRequest, NextResponse } from 'next/server'
import { checkOllamaHealth } from '@/lib/ai/ollama'
import { validateOllamaUrl } from '@/lib/ai/config'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const ollamaUrl = body.ollamaUrl

  if (!ollamaUrl) {
    return NextResponse.json({
      available: false,
      models: [],
      error: 'No Ollama URL provided',
    })
  }

  const validation = validateOllamaUrl(ollamaUrl)
  if (!validation.valid) {
    return NextResponse.json({
      available: false,
      models: [],
      error: validation.error,
    })
  }
  const validatedUrl = validation.normalized!

  console.log(`[ai/health] Checking ${validatedUrl}/api/tags`)
  const health = await checkOllamaHealth(validatedUrl)

  if (!health.available) {
    console.warn(`[ai/health] Ollama at ${validatedUrl} unavailable — ${health.error}`)
    return NextResponse.json({
      available: false,
      models: [],
      ollamaUrl: validatedUrl,
      error: health.error,
    })
  }

  console.log(`[ai/health] Ollama at ${validatedUrl} available | models: [${health.models.join(', ')}]`)

  return NextResponse.json({
    available: true,
    models: health.models,
    ollamaUrl: validatedUrl,
    error: undefined,
  })
}

export async function GET() {
  return NextResponse.json({
    available: false,
    models: [],
    error: 'Use POST with { ollamaUrl } to check Ollama health',
  })
}