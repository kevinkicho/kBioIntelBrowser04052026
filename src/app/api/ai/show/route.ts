import { NextRequest, NextResponse } from 'next/server'
import { validateOllamaUrl } from '@/lib/ai/config'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const ollamaUrl = body.ollamaUrl
  const name = body.name

  if (!ollamaUrl || !name) {
    return NextResponse.json({ available: false })
  }

  const validation = validateOllamaUrl(ollamaUrl)
  if (!validation.valid) {
    return NextResponse.json({ available: false, error: validation.error })
  }
  const validatedUrl = validation.normalized!

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(`${validatedUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      signal: controller.signal,
      redirect: 'error',
    })

    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ available: false })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ available: false })
  }
}