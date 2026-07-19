import { NextRequest, NextResponse } from 'next/server'
import { hasPubChem3dConformer } from '@/lib/api/pubchem3d'

/**
 * Server-side PubChem 3D preflight (avoids client CORS / adblock issues).
 * GET /api/pubchem/has-3d?cid=2244 → { cid, has3d: boolean }
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('cid')
  const cid = raw ? parseInt(raw, 10) : NaN
  if (!Number.isFinite(cid) || cid <= 0) {
    return NextResponse.json({ error: 'Invalid cid' }, { status: 400 })
  }

  try {
    const has3d = await hasPubChem3dConformer(cid)
    return NextResponse.json(
      { cid, has3d },
      {
        headers: {
          // Short cache — conformer presence is stable
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    )
  } catch {
    return NextResponse.json({ cid, has3d: false, error: 'probe_failed' })
  }
}
