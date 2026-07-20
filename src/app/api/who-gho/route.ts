/**
 * WHO Global Health Observatory proxy (free public OData, no key).
 * Disease epidemiology context — not drug labels or clinical advice.
 * GET ?q=amyloidosis  → indicators + sample facts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWhoGhoContextForDisease } from '@/lib/api/whoGho'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query q required (min 2 chars)' },
      { status: 400 },
    )
  }
  try {
    const data = await getWhoGhoContextForDisease(q)
    return NextResponse.json({
      ok: true,
      query: q,
      ...data,
      note: 'WHO GHO public OData — disease/population indicators only; not product authorization.',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    )
  }
}
