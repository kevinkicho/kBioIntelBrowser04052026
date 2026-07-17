import { NextRequest, NextResponse } from 'next/server'
import { checkOllamaHealth } from '@/lib/ai/ollama'
import { validateOllamaUrl } from '@/lib/ai/config'
import {
  hasOllamaCloudFallback,
  parseRequestOllamaApiKey,
} from '@/lib/ai/cloudConfig'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const ollamaUrl = body.ollamaUrl
  const apiKey = parseRequestOllamaApiKey(body)
  const noCloudFallback = Boolean(body.noCloudFallback)
  const auth = { apiKey, noCloudFallback }

  // Allow empty URL when cloud fallback is configured — check cloud directly.
  if (!ollamaUrl) {
    if (hasOllamaCloudFallback(apiKey)) {
      console.log('[ai/health] No local URL; checking Ollama Cloud fallback')
      const health = await checkOllamaHealth('https://ollama.com', auth)
      return NextResponse.json({
        available: health.available,
        models: health.models,
        ollamaUrl: health.effectiveUrl,
        viaCloud: true,
        cloudFallbackConfigured: true,
        usingUserKey: Boolean(apiKey),
        error: health.error,
      })
    }
    return NextResponse.json({
      available: false,
      models: [],
      cloudFallbackConfigured: false,
      error:
        'No Ollama URL provided. For Ollama Cloud, add your API key in Configure AI, or connect a local host.',
    })
  }

  const validation = validateOllamaUrl(ollamaUrl, { forServer: true })
  if (!validation.valid) {
    // Still try cloud if local URL is invalid but cloud is configured
    if (hasOllamaCloudFallback(apiKey)) {
      console.log('[ai/health] Invalid local URL; trying Ollama Cloud fallback')
      const health = await checkOllamaHealth('https://ollama.com', auth)
      if (health.available) {
        return NextResponse.json({
          available: true,
          models: health.models,
          ollamaUrl: health.effectiveUrl,
          viaCloud: true,
          cloudFallbackConfigured: true,
          usingUserKey: Boolean(apiKey),
          error: undefined,
        })
      }
    }
    return NextResponse.json({
      available: false,
      models: [],
      cloudFallbackConfigured: hasOllamaCloudFallback(apiKey),
      error: validation.error,
    })
  }
  const validatedUrl = validation.normalized!

  console.log(`[ai/health] Checking ${validatedUrl}/api/tags`)
  const health = await checkOllamaHealth(validatedUrl, auth)

  if (!health.available) {
    console.warn(`[ai/health] Ollama at ${validatedUrl} unavailable — ${health.error}`)
    return NextResponse.json({
      available: false,
      models: [],
      ollamaUrl: health.effectiveUrl ?? validatedUrl,
      viaCloud: Boolean(health.viaCloud),
      cloudFallbackConfigured: hasOllamaCloudFallback(apiKey),
      usingUserKey: Boolean(apiKey),
      error: health.error,
    })
  }

  const viaCloud = Boolean(health.viaCloud)
  console.log(
    `[ai/health] Ollama ${viaCloud ? 'Cloud' : 'local'} available | models: [${health.models.join(', ')}] | userKey: ${Boolean(apiKey)}`,
  )

  return NextResponse.json({
    available: true,
    models: health.models,
    // Prefer cloud base when fallback succeeded so later chat/show hit cloud, not dead localhost
    ollamaUrl: health.effectiveUrl ?? validatedUrl,
    viaCloud,
    cloudFallbackConfigured: hasOllamaCloudFallback(apiKey),
    usingUserKey: Boolean(apiKey),
    error: undefined,
  })
}

export async function GET() {
  return NextResponse.json({
    available: false,
    models: [],
    cloudFallbackConfigured: hasOllamaCloudFallback(),
    error: 'Use POST with { ollamaUrl, ollamaApiKey? } to check Ollama health',
  })
}
