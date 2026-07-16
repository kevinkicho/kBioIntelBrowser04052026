import { NextRequest, NextResponse } from 'next/server'
import { getPharosTdlBatch } from '@/lib/api/pharos'

/**
 * GET /api/pharos/tdl?symbols=EGFR,BRAF
 * Returns { tdl: { EGFR: "Tclin", ... } } — free Pharos GraphQL only.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('symbols') ?? ''
  const symbols = raw
    .split(/[,+|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20)

  if (symbols.length === 0) {
    return NextResponse.json({ tdl: {} })
  }

  try {
    const tdl = await getPharosTdlBatch(symbols, 3)
    return NextResponse.json({ tdl })
  } catch (err) {
    return NextResponse.json(
      { tdl: {}, error: err instanceof Error ? err.message : 'Pharos TDL failed' },
      { status: 200 },
    )
  }
}
