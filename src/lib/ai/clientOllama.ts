const CLIENT_TIMEOUT = 5000

export interface ClientHealthResponse {
  available: boolean
  models: string[]
  error?: string
}

export async function clientCheckHealth(ollamaUrl: string): Promise<ClientHealthResponse> {
  console.log(`[ai-handshake] Step 2a: client-side fetch(${ollamaUrl}/api/tags) with mode: 'cors'`)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT)

    const res = await fetch(`${ollamaUrl}/api/tags`, {
      signal: controller.signal,
      mode: 'cors',
      headers: { 'Accept': 'application/json' },
    })
    clearTimeout(timeout)

    console.log('[ai-handshake] Step 2a: CORS fetch returned status', res.status, '| ok:', res.ok)
    if (!res.ok) {
      return { available: false, models: [], error: `Ollama returned ${res.status}` }
    }

    const data = await res.json()
    const models = (data.models ?? []).map((m: { name: string }) => m.name)
    console.log('[ai-handshake] Step 2a: ✅ CORS handshake OK | models:', models.length > 0 ? models.join(', ') : '(none)')
    return { available: true, models }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('abort') || message.includes('AbortError') || message.includes('timeout')) {
      console.warn('[ai-handshake] Step 2a: Timed out after', CLIENT_TIMEOUT, 'ms')
      return { available: false, models: [], error: 'Connection timed out' }
    }
    if (message.includes('CORS') || message.includes('cors') || message.includes('NetworkError') || message.includes('Failed to fetch') || message.includes('Network request failed')) {
      console.warn('[ai-handshake] Step 2a: ❌ CORS blocked — OLLAMA_ORIGINS is not set to *')
      return { available: false, models: [], error: 'CORS blocked — set OLLAMA_ORIGINS=* in Ollama and restart it' }
    }
    console.warn('[ai-handshake] Step 2a: ❌ Connection failed:', message)
    return { available: false, models: [], error: 'Cannot connect to Ollama' }
  }
}

export async function clientPullModel(
  ollamaUrl: string,
  modelName: string,
  onProgress: (status: string, progress: number) => void,
): Promise<{ success: boolean; error?: string }> {
  console.log('[ai-client] Pulling model', modelName)
  try {
    const res = await fetch(`${ollamaUrl}/api/pull`, {
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
            const pct = typeof parsed.completed === 'number' && typeof parsed.total === 'number' && parsed.total > 0
              ? Math.round((parsed.completed / parsed.total) * 100)
              : -1
            onProgress(parsed.status, pct)
          }
          if (parsed.error) {
            return { success: false, error: parsed.error }
          }
        } catch {}
      }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

export async function* clientGenerateChat(
  ollamaUrl: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  console.log('[ai-client] Chat with', model, '- messages:', messages.length)
  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
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
        } catch {}
      }
    }
  } catch (err) {
    if (signal?.aborted) return
    yield `[Error: ${err instanceof Error ? err.message : String(err)}]`
  }
}