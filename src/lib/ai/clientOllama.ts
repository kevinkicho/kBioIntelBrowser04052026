/**
 * Browser → user's Ollama (localhost / LAN). Bypasses Next.js so App Hosting
 * never needs to reach the user's loopback.
 */

import { localOllamaCorsHint, localOllamaMixedContentHint, canBrowserCallLocalHttp } from './localTransport'

const CLIENT_TIMEOUT = 8000

export interface ClientHealthResponse {
  available: boolean
  models: string[]
  error?: string
}

function classifyBrowserError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('abort') || message.includes('AbortError') || message.includes('timeout')) {
    return 'Connection timed out — is Ollama running on that host:port?'
  }
  // Mixed content often surfaces as TypeError Failed to fetch on HTTPS pages
  if (!canBrowserCallLocalHttp()) {
    return localOllamaMixedContentHint()
  }
  if (
    message.includes('CORS') ||
    message.includes('cors') ||
    message.includes('NetworkError') ||
    message.includes('Failed to fetch') ||
    message.includes('Network request failed') ||
    message.includes('Load failed')
  ) {
    return localOllamaCorsHint()
  }
  return `Cannot connect to Ollama: ${message}`
}

export async function clientCheckHealth(ollamaUrl: string): Promise<ClientHealthResponse> {
  const base = ollamaUrl.replace(/\/+$/, '')
  console.log(`[ai-local] Browser health ${base}/api/tags`)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT)

    const res = await fetch(`${base}/api/tags`, {
      signal: controller.signal,
      mode: 'cors',
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return { available: false, models: [], error: `Ollama returned ${res.status}` }
    }

    const data = await res.json()
    const models = (data.models ?? []).map((m: { name: string }) => m.name)
    console.log('[ai-local] Health OK | models:', models.length)
    return { available: true, models }
  } catch (err) {
    const error = classifyBrowserError(err)
    console.warn('[ai-local] Health failed:', error)
    return { available: false, models: [], error }
  }
}

export async function clientShowModel(
  ollamaUrl: string,
  name: string,
): Promise<{
  available: boolean
  model_info?: Record<string, unknown>
  details?: Record<string, unknown>
  size?: number
}> {
  const base = ollamaUrl.replace(/\/+$/, '')
  try {
    const res = await fetch(`${base}/api/show`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return { available: false }
    const data = await res.json()
    return { available: true, ...data }
  } catch {
    return { available: false }
  }
}

export async function clientPullModel(
  ollamaUrl: string,
  modelName: string,
  onProgress: (status: string, progress: number) => void,
): Promise<{ success: boolean; error?: string }> {
  const base = ollamaUrl.replace(/\/+$/, '')
  console.log('[ai-local] Pull', modelName)
  try {
    const res = await fetch(`${base}/api/pull`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    })

    if (!res.ok || !res.body) {
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
            const pct =
              typeof parsed.completed === 'number' &&
              typeof parsed.total === 'number' &&
              parsed.total > 0
                ? Math.round((parsed.completed / parsed.total) * 100)
                : -1
            onProgress(parsed.status, pct)
          }
          if (parsed.error) {
            return { success: false, error: parsed.error }
          }
        } catch {
          /* skip */
        }
      }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: classifyBrowserError(err) }
  }
}

export async function* clientGenerateChat(
  ollamaUrl: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const base = ollamaUrl.replace(/\/+$/, '')
  console.log('[ai-local] Chat', model, 'messages:', messages.length)
  try {
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
    })

    if (!res.ok || !res.body) {
      yield `[Error: Chat failed with status ${res.status}]`
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      if (signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          if (parsed.message?.content) yield parsed.message.content
          if (parsed.done) return
          if (parsed.error) {
            yield `[Error: ${parsed.error}]`
            return
          }
        } catch {
          /* skip */
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return
    yield `[Error: ${classifyBrowserError(err)}]`
  }
}

/** Non-streaming chat (pack AI etc.). */
export async function clientGenerateChatOnce(
  ollamaUrl: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  signal?: AbortSignal,
): Promise<{ success: true; content: string } | { success: false; error: string }> {
  let content = ''
  try {
    for await (const token of clientGenerateChat(ollamaUrl, model, messages, signal)) {
      if (token.startsWith('[Error:')) {
        return { success: false, error: token.replace(/^\[Error:\s*/, '').replace(/\]$/, '') }
      }
      content += token
    }
    return { success: true, content }
  } catch (err) {
    return { success: false, error: classifyBrowserError(err) }
  }
}
