import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const prompt = body.prompt
    const model = body.model
    const ollamaUrl = body.ollamaUrl

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    if (!model) {
      return NextResponse.json({ error: 'No model specified' }, { status: 400 })
    }

    if (!ollamaUrl) {
      return NextResponse.json({ error: 'No Ollama URL provided' }, { status: 400 })
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
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
      return NextResponse.json({
        fallback: true,
        message: 'Ollama is not reachable. Using structured brief instead.',
      })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}