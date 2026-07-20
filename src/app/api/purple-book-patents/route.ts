/**
 * FDA Purple Book BPPT patent list search (public page, cached).
 * GET ?q=adalimumab
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchPurpleBookPatentsByName } from '@/lib/api/purpleBookPatents'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(150, Math.max(1, parseInt(limitRaw, 10) || 50)) : 50
  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query q required (min 2 chars)' },
      { status: 400 },
    )
  }
  try {
    const { meta, patents } = await searchPurpleBookPatentsByName(q, limit)
    return NextResponse.json({
      ok: true,
      query: q,
      meta,
      count: patents.length,
      patents,
      note: 'FDA Purple Book BPPT patent list — ministerial publication; not legal advice.',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    )
  }
}
