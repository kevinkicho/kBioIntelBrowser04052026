import { NextRequest, NextResponse } from 'next/server'
import { probeCharacterizationSources } from '@/lib/api/characterizationProbes'

/**
 * GET /api/characterization/probe?pdbId=1M17&q=EGFR
 * Free-public PRIDE + PCDDB soft probes for MS / CD chips.
 */
export async function GET(request: NextRequest) {
  const pdbId = request.nextUrl.searchParams.get('pdbId')
  const q = request.nextUrl.searchParams.get('q')
  if (!pdbId?.trim() && !q?.trim()) {
    return NextResponse.json(
      { error: 'Provide pdbId or q' },
      { status: 400 },
    )
  }

  try {
    const result = await probeCharacterizationSources({ pdbId, query: q })
    return NextResponse.json(result, {
      headers: {
        // Short cache — hits are stable; miss may flip when DBs grow
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    })
  } catch {
    return NextResponse.json(
      {
        pdbId: pdbId || null,
        query: q || '',
        ms: {
          hit: false,
          href: 'https://www.ebi.ac.uk/pride/archive',
          via: 'fallback',
        },
        cd: {
          hit: false,
          href: 'https://pcddb.cryst.bbk.ac.uk/',
          via: 'fallback',
        },
        probedAt: new Date().toISOString(),
        error: 'probe_failed',
      },
      { status: 200 },
    )
  }
}
