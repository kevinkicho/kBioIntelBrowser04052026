import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    // Try to reach Ollama
    const ollamaUrl = 'http://localhost:11434/api/generate'

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

      const res = await fetch(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3.5',
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 300,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        return NextResponse.json({
          fallback: true,
          message: 'Ollama returned an error. Using structured brief instead.',
        })
      }

      const data = await res.json()
      return NextResponse.json({
        fallback: false,
        summary: data.response?.trim() || '',
      })
    } catch {
      // Ollama not running — return graceful fallback
      return NextResponse.json({
        fallback: true,
        message: 'Ollama is not running. Using structured brief instead. To enable AI summaries, start Ollama with: ollama serve',
      })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
