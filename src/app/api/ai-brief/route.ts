import { NextRequest, NextResponse } from 'next/server'
import { validateOllamaUrl } from '@/lib/ai/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const prompt = body.prompt
    const model = body.model
    const ollamaUrl = body.ollamaUrl

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    if (prompt.length > 50000) {
      return NextResponse.json({ error: 'Prompt too long (max 50,000 characters)' }, { status: 400 })
    }

    if (!model) {
      return NextResponse.json({ error: 'No model specified' }, { status: 400 })
    }

    if (!ollamaUrl) {
      return NextResponse.json({ error: 'No Ollama URL provided' }, { status: 400 })
    }

    const validation = validateOllamaUrl(ollamaUrl)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const validatedUrl = validation.normalized!

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const res = await fetch(`${validatedUrl}/api/generate`, {
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
        redirect: 'error',
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