import { NextRequest } from 'next/server'
import { pullModel } from '@/lib/ai/ollama'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const modelName = body.model
  const ollamaUrl = body.ollamaUrl

  if (!ollamaUrl) {
    return new Response(JSON.stringify({ status: 'error', error: 'No Ollama URL provided' }) + '\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (!modelName) {
    return new Response(JSON.stringify({ status: 'error', error: 'No model specified' }) + '\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  console.log('[ai/pull] Starting model pull:', modelName, 'at', ollamaUrl)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const result = await pullModel(ollamaUrl, modelName, (status, progress) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify({ status, progress }) + '\n'))
        } catch {}
      })

      if (!result.success) {
        controller.enqueue(encoder.encode(JSON.stringify({ status: 'error', error: result.error }) + '\n'))
      } else {
        controller.enqueue(encoder.encode(JSON.stringify({ status: 'success' }) + '\n'))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}