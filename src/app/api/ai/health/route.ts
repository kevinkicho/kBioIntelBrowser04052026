import { NextRequest, NextResponse } from 'next/server'
import { checkOllamaHealth } from '@/lib/ai/ollama'
import { validateOllamaUrl } from '@/lib/ai/config'
import {
  getOllamaCloudBase,
  hasOllamaCloudFallback,
  parseRequestOllamaApiKey,
} from '@/lib/ai/cloudConfig'
import { resolvePrimaryOllamaUrlForServer } from '@/lib/ai/ollamaRuntime'
import { shouldSkipLocalOllama } from '@/lib/runtimeEnv'
import { logServerEvent } from '@/lib/serverLog'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const ollamaUrl = typeof body.ollamaUrl === 'string' ? body.ollamaUrl : ''
  const apiKey = parseRequestOllamaApiKey(body)
  const noCloudFallback = Boolean(body.noCloudFallback)
  const auth = { apiKey, noCloudFallback }
  const cloudConfigured = hasOllamaCloudFallback(apiKey)

  // Empty URL → cloud-only when configured
  if (!ollamaUrl) {
    if (cloudConfigured && !noCloudFallback) {
      const health = await checkOllamaHealth(getOllamaCloudBase(), auth)
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

  // App Hosting / production: never dial localhost — rewrite to cloud when possible
  const resolved = resolvePrimaryOllamaUrlForServer(ollamaUrl, auth)
  if (resolved.skippedLocal) {
    if (!resolved.url) {
      return NextResponse.json({
        available: false,
        models: [],
        cloudFallbackConfigured: cloudConfigured,
        skippedLocal: true,
        error:
          'Ollama Cloud requires your API key in the app AI settings (per-user). No shared server key.',
      })
    }
    const health = await checkOllamaHealth(resolved.url, auth)
    return NextResponse.json({
      available: health.available,
      models: health.models,
      ollamaUrl: health.effectiveUrl ?? resolved.url,
      viaCloud: true,
      cloudFallbackConfigured: cloudConfigured,
      usingUserKey: Boolean(apiKey),
      skippedLocal: true,
      error: health.error,
    })
  }

  const validation = validateOllamaUrl(ollamaUrl, { forServer: true })
  if (!validation.valid) {
    if (cloudConfigured && !noCloudFallback) {
      const health = await checkOllamaHealth(getOllamaCloudBase(), auth)
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
      cloudFallbackConfigured: cloudConfigured,
      error: validation.error,
    })
  }

  const validatedUrl = validation.normalized!
  // On managed hosts, still prefer cloud when client sent loopback (defense in depth)
  if (shouldSkipLocalOllama() && /localhost|127\.0\.0\.1/i.test(validatedUrl)) {
    if (cloudConfigured && !noCloudFallback) {
      const health = await checkOllamaHealth(getOllamaCloudBase(), auth)
      return NextResponse.json({
        available: health.available,
        models: health.models,
        ollamaUrl: health.effectiveUrl,
        viaCloud: true,
        cloudFallbackConfigured: true,
        usingUserKey: Boolean(apiKey),
        skippedLocal: true,
        error: health.error,
      })
    }
  }

  const health = await checkOllamaHealth(validatedUrl, auth)

  if (!health.available) {
    return NextResponse.json({
      available: false,
      models: [],
      ollamaUrl: health.effectiveUrl ?? validatedUrl,
      viaCloud: Boolean(health.viaCloud),
      cloudFallbackConfigured: cloudConfigured,
      usingUserKey: Boolean(apiKey),
      error: health.error,
    })
  }

  const viaCloud = Boolean(health.viaCloud)
  logServerEvent('INFO', 'ollama_available', {
    viaCloud,
    modelCount: health.models.length,
    usingUserKey: Boolean(apiKey),
  })

  return NextResponse.json({
    available: true,
    models: health.models,
    ollamaUrl: health.effectiveUrl ?? validatedUrl,
    viaCloud,
    cloudFallbackConfigured: cloudConfigured,
    usingUserKey: Boolean(apiKey),
    error: undefined,
  })
}

export async function GET() {
  return NextResponse.json({
    available: false,
    models: [],
    cloudFallbackConfigured: hasOllamaCloudFallback(),
    skipLocalOllama: shouldSkipLocalOllama(),
    error: 'Use POST with { ollamaUrl, ollamaApiKey? } to check Ollama health',
  })
}
