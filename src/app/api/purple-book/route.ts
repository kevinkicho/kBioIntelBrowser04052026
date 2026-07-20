/**
 * FDA Purple Book monthly CSV search (tier B free download, cached).
 * GET ?q=adalimumab
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchPurpleBookByName } from '@/lib/api/purpleBookCache'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 40)) : 40
  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query q required (min 2 chars)' },
      { status: 400 },
    )
  }
  try {
    const { meta, products } = await searchPurpleBookByName(q, limit)
    return NextResponse.json({
      ok: true,
      query: q,
      meta,
      count: products.length,
      products,
      note: 'FDA Purple Book monthly public CSV — not clinical decision support.',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    )
  }
}
