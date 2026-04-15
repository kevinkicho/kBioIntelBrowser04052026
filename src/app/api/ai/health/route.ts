import { NextRequest, NextResponse } from 'next/server'
import { checkOllamaHealth } from '@/lib/ai/ollama'

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

  console.log(`[ai/health] Checking ${ollamaUrl}/api/tags`)
  const health = await checkOllamaHealth(ollamaUrl)

  if (!health.available) {
    console.warn(`[ai/health] Ollama at ${ollamaUrl} unavailable — ${health.error}`)
    return NextResponse.json({
      available: false,
      models: [],
      ollamaUrl,
      error: health.error,
    })
  }

  console.log(`[ai/health] Ollama at ${ollamaUrl} available | models: [${health.models.join(', ')}]`)

  return NextResponse.json({
    available: true,
    models: health.models,
    ollamaUrl,
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