import { NextRequest, NextResponse } from 'next/server'
import { checkOllamaHealth } from '@/lib/ai/ollama'
import { validateOllamaUrl } from '@/lib/ai/config'
import { hasOllamaCloudFallback } from '@/lib/ai/cloudConfig'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const ollamaUrl = body.ollamaUrl

  // Allow empty URL when cloud fallback is configured — check cloud directly.
  if (!ollamaUrl) {
    if (hasOllamaCloudFallback()) {
      console.log('[ai/health] No local URL; checking Ollama Cloud fallback')
      const health = await checkOllamaHealth('https://ollama.com')
      return NextResponse.json({
        available: health.available,
        models: health.models,
        ollamaUrl: health.effectiveUrl,
        viaCloud: true,
        cloudFallbackConfigured: true,
        error: health.error,
      })
    }
    return NextResponse.json({
      available: false,
      models: [],
      cloudFallbackConfigured: false,
      error: 'No Ollama URL provided',
    })
  }

  const validation = validateOllamaUrl(ollamaUrl, { forServer: true })
  if (!validation.valid) {
    // Still try cloud if local URL is invalid but cloud is configured
    if (hasOllamaCloudFallback()) {
      console.log('[ai/health] Invalid local URL; trying Ollama Cloud fallback')
      const health = await checkOllamaHealth('https://ollama.com')
      if (health.available) {
        return NextResponse.json({
          available: true,
          models: health.models,
          ollamaUrl: health.effectiveUrl,
          viaCloud: true,
          cloudFallbackConfigured: true,
          error: undefined,
        })
      }
    }
    return NextResponse.json({
      available: false,
      models: [],
      cloudFallbackConfigured: hasOllamaCloudFallback(),
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
      viaCloud: false,
      cloudFallbackConfigured: hasOllamaCloudFallback(),
      error: health.error,
    })
  }

  const viaCloud = Boolean(health.viaCloud)
  console.log(
    `[ai/health] Ollama ${viaCloud ? 'Cloud' : 'local'} available | models: [${health.models.join(', ')}]`,
  )

  return NextResponse.json({
    available: true,
    models: health.models,
    ollamaUrl: health.effectiveUrl ?? validatedUrl,
    viaCloud,
    cloudFallbackConfigured: hasOllamaCloudFallback(),
    error: undefined,
  })
}

export async function GET() {
  return NextResponse.json({
    available: false,
    models: [],
    cloudFallbackConfigured: hasOllamaCloudFallback(),
    error: 'Use POST with { ollamaUrl } to check Ollama health',
  })
}
