import { normalizeOllamaUrl } from './config'

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
}

const OLLAMA_TIMEOUT = 15000

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

export async function checkOllamaHealth(ollamaUrl: string): Promise<OllamaHealthResponse> {
  if (!ollamaUrl) {
    return { available: false, models: [], error: 'No Ollama URL provided' }
  }
  const url = normalizeOllamaUrl(ollamaUrl)
  console.log('[ai] Checking Ollama health at', url)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT)

    const res = await fetch(`${url}/api/tags`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      redirect: 'error',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn('[ai] Ollama responded with status', res.status)
      return { available: false, models: [], error: `Ollama returned ${res.status}` }
    }

    const data: OllamaTagsResponse = await res.json()
    console.log('[ai] Ollama /api/tags raw response keys:', Object.keys(data))
    const models = extractModelNames(data)
    console.log('[ai] Ollama is available. Models:', models.length > 0 ? models.join(', ') : `(none — raw: ${JSON.stringify(data).slice(0, 300)})`)

    return { available: true, models }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('abort') || message.includes('AbortError') || message.includes('timeout')) {
      console.warn('[ai] Ollama health check timed out')
      return { available: false, models: [], error: 'Connection timed out' }
    }
    console.warn('[ai] Ollama not available:', message)
    return { available: false, models: [], error: 'Cannot connect to Ollama' }
  }
}

export async function pullModel(
  ollamaUrl: string,
  modelName: string,
  onProgress: (status: string, progress: number) => void,
): Promise<{ success: boolean; error?: string }> {
  console.log('[ai] Pulling model', modelName, 'from', ollamaUrl)
  try {
    const res = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
      redirect: 'error',
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      console.error('[ai] Pull request failed:', res.status, text)
      return { success: false, error: `Pull failed: ${res.status}` }
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
            return { success: false, error: parsed.error }
          }
        } catch {
          // skip unparseable lines
        }
      }
    }

    console.log('[ai] Model pull complete:', modelName)
    return { success: true }
  } catch (err) {
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
): Promise<{ success: boolean; error?: string }> {
  console.log('[ai] Generating chat with', model, 'at', ollamaUrl, '- messages:', messages.length)
  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
      redirect: 'error',
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      console.error('[ai] Chat request failed:', res.status, text)
      return { success: false, error: `Chat failed: ${res.status}` }
    }

    const reader = res.body.getReader()
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
            console.log('[ai] Chat complete')
            return { success: true }
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

    console.log('[ai] Chat stream ended')
    return { success: true }
  } catch (err) {
    if (signal?.aborted) return { success: true }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai] Chat exception:', message)
    return { success: false, error: message }
  }
}