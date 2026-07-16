import { NextRequest, NextResponse } from 'next/server'
import { validateOllamaUrl } from '@/lib/ai/config'
import { generateOnce } from '@/lib/ai/ollama'
import { hasOllamaCloudFallback, OLLAMA_CLOUD_BASE } from '@/lib/ai/cloudConfig'

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

    let targetUrl: string | null = null
    if (ollamaUrl) {
      const validation = validateOllamaUrl(ollamaUrl, { forServer: true })
      if (validation.valid) {
        targetUrl = validation.normalized!
      }
    }
    if (!targetUrl) {
      if (!hasOllamaCloudFallback()) {
        return NextResponse.json({ error: 'No Ollama URL provided' }, { status: 400 })
      }
      targetUrl = OLLAMA_CLOUD_BASE
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const result = await generateOnce(targetUrl, model, prompt, {
        temperature: 0.3,
        num_predict: 300,
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!result.success) {
        return NextResponse.json({
          fallback: true,
          message: 'Ollama returned an error. Using structured brief instead.',
        })
      }

      return NextResponse.json({
        fallback: false,
        summary: result.response,
        viaCloud: result.viaCloud,
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
