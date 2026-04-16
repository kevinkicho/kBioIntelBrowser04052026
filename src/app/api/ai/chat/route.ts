import { NextRequest, NextResponse } from 'next/server'
import { generateChat } from '@/lib/ai/ollama'
import { validateOllamaUrl } from '@/lib/ai/config'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const model = body.model
  const ollamaUrl = body.ollamaUrl
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = body.messages ?? []

  if (!ollamaUrl) {
    return NextResponse.json({ error: 'No Ollama URL provided' }, { status: 400 })
  }

  const validation = validateOllamaUrl(ollamaUrl)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  const validatedUrl = validation.normalized!

  if (!model) {
    return NextResponse.json({ error: 'No model specified' }, { status: 400 })
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
  }

  console.log('[ai/chat] Streaming chat with', model, 'at', ollamaUrl, '- messages:', messages.length)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const result = await generateChat(
        validatedUrl,
        model,
        messages,
        (token) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify({ token }) + '\n'))
          } catch {}
        },
      )

      if (!result.success) {
        controller.enqueue(encoder.encode(JSON.stringify({ error: result.error }) + '\n'))
      }
      controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + '\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}