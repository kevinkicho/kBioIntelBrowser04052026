import { NextRequest, NextResponse } from 'next/server'
import { validateOllamaUrl } from '@/lib/ai/config'
import {
  getOllamaCloudBase,
  hasOllamaCloudFallback,
  isOllamaCloudUrl,
  ollamaRequestHeaders,
  parseRequestOllamaApiKey,
} from '@/lib/ai/cloudConfig'

async function showModel(url: string, name: string, apiKey?: string | null): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    return await fetch(`${url}/api/show`, {
      method: 'POST',
      headers: ollamaRequestHeaders(url, { 'Content-Type': 'application/json' }, apiKey),
      body: JSON.stringify({ name }),
      signal: controller.signal,
      redirect: isOllamaCloudUrl(url) ? 'follow' : 'error',
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const ollamaUrl = body.ollamaUrl
  const name = body.name
  const apiKey = parseRequestOllamaApiKey(body)

  if (!name) {
    return NextResponse.json({ available: false })
  }

  let validatedUrl: string | null = null
  if (ollamaUrl) {
    const validation = validateOllamaUrl(ollamaUrl, { forServer: true })
    if (validation.valid) {
      validatedUrl = validation.normalized!
    }
  }

  if (!validatedUrl && !hasOllamaCloudFallback(apiKey)) {
    return NextResponse.json({ available: false, error: 'No Ollama URL provided' })
  }

  try {
    if (validatedUrl) {
      let res = await showModel(validatedUrl, name, apiKey)
      if (!res.ok && !isOllamaCloudUrl(validatedUrl) && hasOllamaCloudFallback(apiKey)) {
        console.log('[ai/show] Falling back to Ollama Cloud')
        res = await showModel(getOllamaCloudBase(), name, apiKey)
      }
      if (!res.ok) {
        return NextResponse.json({ available: false })
      }
      const data = await res.json()
      return NextResponse.json(data)
    }

    // Cloud-only path
    const res = await showModel(getOllamaCloudBase(), name, apiKey)
    if (!res.ok) return NextResponse.json({ available: false })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    if (validatedUrl && !isOllamaCloudUrl(validatedUrl) && hasOllamaCloudFallback(apiKey)) {
      try {
        console.log('[ai/show] Exception; falling back to Ollama Cloud')
        const res = await showModel(getOllamaCloudBase(), name, apiKey)
        if (!res.ok) return NextResponse.json({ available: false })
        return NextResponse.json(await res.json())
      } catch {
        return NextResponse.json({ available: false })
      }
    }
    return NextResponse.json({ available: false })
  }
}
