/**
 * EMA medicines Excel dump search (tier B free download, cached).
 * GET ?q=adalimumab&biosimilar=1
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchEmaBulkByName } from '@/lib/api/emaMedicinesBulk'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const biosimilarOnly =
    request.nextUrl.searchParams.get('biosimilar') === '1' ||
    request.nextUrl.searchParams.get('biosimilar') === 'true'
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 30)) : 30
  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query q required (min 2 chars)' },
      { status: 400 },
    )
  }
  try {
    const { meta, products } = await searchEmaBulkByName(q, { limit, biosimilarOnly })
    return NextResponse.json({
      ok: true,
      query: q,
      biosimilarOnly,
      meta,
      count: products.length,
      products,
      note: 'EMA official medicines Excel dump — not clinical decision support.',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    )
  }
}
