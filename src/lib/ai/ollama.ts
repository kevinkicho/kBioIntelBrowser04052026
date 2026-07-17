import { normalizeOllamaUrl } from './config'
import {
  OLLAMA_CLOUD_BASE,
  hasOllamaCloudFallback,
  isOllamaCloudUrl,
  ollamaRequestHeaders,
} from './cloudConfig'

export interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: {
    parent_model?: string
    format: string
    family: string
    families: string[]
    parameter_size: string
    quantization_level: string
  }
}

export type OllamaTagsResponse = Record<string, unknown>

export interface OllamaHealthResponse {
  available: boolean
  models: string[]
  gpu?: string
  error?: string
  /** True when the response came from ollama.com cloud fallback */
  viaCloud?: boolean
  /** Effective base URL used for the successful check */
  effectiveUrl?: string
}

const OLLAMA_TIMEOUT = 15000

function redirectModeFor(url: string): RequestRedirect {
  // Local SSRF hardening: refuse redirects. Cloud CDN/API may redirect — allow follow.
  return isOllamaCloudUrl(url) ? 'follow' : 'error'
}

function extractModelNames(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.models) && data.models.length > 0) {
    return (data.models as unknown[]).map((m: unknown) => {
      if (typeof m === 'string') return m
      if (typeof m === 'object' && m !== null) return String((m as Record<string, unknown>).name || (m as Record<string, unknown>).model || '')
      return ''
    }).filter(Boolean)
  }
  if (Array.isArray(data.data) && data.data.length > 0) {
    return (data.data as unknown[]).map((m: unknown) => {
      if (typeof m === 'string') return m
      if (typeof m === 'object' && m !== null) return String((m as Record<string, unknown>).name || (m as Record<string, unknown>).model || '')
      return ''
    }).filter(Boolean)
  }
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'object' && v !== null)) {
      return (value as Record<string, unknown>[]).map(m => String(m.name || m.model || '')).filter(Boolean)
    }
  }
  return []
}

async function checkOllamaHealthOnce(ollamaUrl: string): Promise<OllamaHealthResponse> {
  if (!ollamaUrl) {
    return { available: false, models: [], error: 'No Ollama URL provided' }
  }
  const url = normalizeOllamaUrl(ollamaUrl)
  const cloud = isOllamaCloudUrl(url)
  console.log('[ai] Checking Ollama health at', url, cloud ? '(cloud)' : '(local)')
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT)

    const res = await fetch(`${url}/api/tags`, {
      signal: controller.signal,
      headers: ollamaRequestHeaders(url),
      redirect: redirectModeFor(url),
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn('[ai] Ollama responded with status', res.status, body.slice(0, 200))
      return {
        available: false,
        models: [],
        error: `Ollama returned ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`,
        effectiveUrl: url,
      }
    }

    const data: OllamaTagsResponse = await res.json()
    console.log('[ai] Ollama /api/tags raw response keys:', Object.keys(data))
    const models = extractModelNames(data)
    console.log('[ai] Ollama is available. Models:', models.length > 0 ? models.join(', ') : `(none — raw: ${JSON.stringify(data).slice(0, 300)})`)

    return {
      available: true,
      models,
      viaCloud: cloud,
      effectiveUrl: url,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('abort') || message.includes('AbortError') || message.includes('timeout')) {
      console.warn('[ai] Ollama health check timed out for', url)
      return { available: false, models: [], error: `Connection timed out (${url})`, effectiveUrl: url }
    }
    console.warn('[ai] Ollama not available at', url, ':', message)
    return {
      available: false,
      models: [],
      error: `Cannot connect to Ollama (${url}): ${message}`,
      effectiveUrl: url,
    }
  }
}

/**
 * Health check with optional Ollama Cloud fallback when local/LAN is down
 * and OLLAMA_API_KEY is set.
 */
export async function checkOllamaHealth(ollamaUrl: string): Promise<OllamaHealthResponse> {
  const primaryUrl = normalizeOllamaUrl(ollamaUrl)
  const primary = await checkOllamaHealthOnce(primaryUrl)
  if (primary.available) return primary

  // Already targeting cloud, or no API key configured
  if (isOllamaCloudUrl(primaryUrl) || !hasOllamaCloudFallback()) {
    return primary
  }

  const cloudBase = normalizeOllamaUrl(OLLAMA_CLOUD_BASE)
  console.log('[ai] Local Ollama unavailable; falling back to Ollama Cloud at', cloudBase)
  const cloud = await checkOllamaHealthOnce(cloudBase)
  if (cloud.available) {
    return {
      ...cloud,
      viaCloud: true,
      effectiveUrl: cloudBase,
      error: undefined,
    }
  }

  return {
    available: false,
    models: [],
    error: primary.error
      ? `${primary.error} (cloud fallback also failed: ${cloud.error ?? 'unknown'})`
      : cloud.error,
    effectiveUrl: cloudBase,
  }
}

export async function pullModel(
  ollamaUrl: string,
  modelName: string,
  onProgress: (status: string, progress: number) => void,
): Promise<{ success: boolean; error?: string }> {
  const tryPull = async (rawUrl: string) => {
    const url = normalizeOllamaUrl(rawUrl)
    console.log('[ai] Pulling model', modelName, 'from', url)
    const res = await fetch(`${url}/api/pull`, {
      method: 'POST',
      headers: ollamaRequestHeaders(url, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: modelName, stream: true }),
      redirect: redirectModeFor(url),
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      console.error('[ai] Pull request failed:', res.status, text)
      return { success: false as const, error: `Pull failed: ${res.status}` }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          if (parsed.status) {
            const pct = typeof parsed.completed === 'number' && typeof parsed.total === 'number' && parsed.total > 0
              ? Math.round((parsed.completed / parsed.total) * 100)
              : -1
            console.log('[ai] Pull status:', parsed.status, pct >= 0 ? `${pct}%` : '')
            onProgress(parsed.status, pct)
          }
          if (parsed.error) {
            console.error('[ai] Pull error:', parsed.error)
            return { success: false as const, error: parsed.error as string }
          }
        } catch {
          // skip unparseable lines
        }
      }
    }

    console.log('[ai] Model pull complete:', modelName)
    return { success: true as const }
  }

  try {
    let result = await tryPull(ollamaUrl)
    if (!result.success && !isOllamaCloudUrl(ollamaUrl) && hasOllamaCloudFallback()) {
      console.log('[ai] Pull falling back to Ollama Cloud')
      result = await tryPull(OLLAMA_CLOUD_BASE)
    }
    return result
  } catch (err) {
    if (!isOllamaCloudUrl(ollamaUrl) && hasOllamaCloudFallback()) {
      try {
        console.log('[ai] Pull exception; falling back to Ollama Cloud')
        return await tryPull(OLLAMA_CLOUD_BASE)
      } catch (cloudErr) {
        const message = cloudErr instanceof Error ? cloudErr.message : String(cloudErr)
        console.error('[ai] Pull cloud fallback exception:', message)
        return { success: false, error: message }
      }
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai] Pull exception:', message)
    return { success: false, error: message }
  }
}

export async function generateChat(
  ollamaUrl: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<{ success: boolean; error?: string; viaCloud?: boolean }> {
  const openStream = async (rawUrl: string): Promise<{ res: Response } | { error: string }> => {
    const url = normalizeOllamaUrl(rawUrl)
    console.log('[ai] Generating chat with', model, 'at', url, '- messages:', messages.length)
    try {
      const res = await fetch(`${url}/api/chat`, {
        method: 'POST',
        headers: ollamaRequestHeaders(url, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ model, messages, stream: true }),
        signal,
        redirect: redirectModeFor(url),
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        console.error('[ai] Chat request failed:', res.status, text)
        return { error: `Chat failed: ${res.status}` }
      }
      return { res }
    } catch (err) {
      if (signal?.aborted) return { error: 'aborted' }
      const message = err instanceof Error ? err.message : String(err)
      console.error('[ai] Chat open exception:', message)
      return { error: message }
    }
  }

  let viaCloud = isOllamaCloudUrl(ollamaUrl)
  let opened = await openStream(ollamaUrl)

  if ('error' in opened && opened.error !== 'aborted'
    && !isOllamaCloudUrl(ollamaUrl)
    && hasOllamaCloudFallback()
    && !signal?.aborted) {
    console.log('[ai] Chat falling back to Ollama Cloud')
    opened = await openStream(OLLAMA_CLOUD_BASE)
    viaCloud = true
  }

  if ('error' in opened) {
    if (opened.error === 'aborted' || signal?.aborted) return { success: true }
    return { success: false, error: opened.error }
  }

  try {
    const reader = opened.res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      if (signal?.aborted) {
        console.log('[ai] Chat aborted by user')
        break
      }

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          if (parsed.message?.content) {
            onToken(parsed.message.content)
          }
          if (parsed.done) {
            console.log('[ai] Chat complete', viaCloud ? '(via cloud)' : '')
            return { success: true, viaCloud }
          }
          if (parsed.error) {
            console.error('[ai] Chat error:', parsed.error)
            return { success: false, error: parsed.error }
          }
        } catch {
          // skip
        }
      }
    }

    console.log('[ai] Chat stream ended', viaCloud ? '(via cloud)' : '')
    return { success: true, viaCloud }
  } catch (err) {
    if (signal?.aborted) return { success: true }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai] Chat exception:', message)
    return { success: false, error: message }
  }
}

/** Non-streaming generate with cloud fallback (used by ai-brief). */
export async function generateOnce(
  ollamaUrl: string,
  model: string,
  prompt: string,
  options?: { temperature?: number; num_predict?: number; signal?: AbortSignal },
): Promise<{ success: true; response: string; viaCloud?: boolean } | { success: false; error: string }> {
  const tryOnce = async (rawUrl: string) => {
    const url = normalizeOllamaUrl(rawUrl)
    const res = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: ollamaRequestHeaders(url, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.3,
          num_predict: options?.num_predict ?? 300,
        },
      }),
      signal: options?.signal,
      redirect: redirectModeFor(url),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false as const, error: `Generate failed: ${res.status} ${text}`.trim() }
    }
    const data = await res.json()
    return { ok: true as const, response: String(data.response?.trim() || '') }
  }

  try {
    let result = await tryOnce(ollamaUrl)
    let viaCloud = isOllamaCloudUrl(ollamaUrl)
    if (!result.ok && !isOllamaCloudUrl(ollamaUrl) && hasOllamaCloudFallback()) {
      console.log('[ai] Generate falling back to Ollama Cloud')
      result = await tryOnce(OLLAMA_CLOUD_BASE)
      viaCloud = true
    }
    if (!result.ok) return { success: false, error: result.error }
    return { success: true, response: result.response, viaCloud }
  } catch (err) {
    if (!isOllamaCloudUrl(ollamaUrl) && hasOllamaCloudFallback()) {
      try {
        console.log('[ai] Generate exception; falling back to Ollama Cloud')
        const result = await tryOnce(OLLAMA_CLOUD_BASE)
        if (!result.ok) return { success: false, error: result.error }
        return { success: true, response: result.response, viaCloud: true }
      } catch (cloudErr) {
        return { success: false, error: cloudErr instanceof Error ? cloudErr.message : String(cloudErr) }
      }
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
