/**
 * CMS Hospital General Information keyword search (free public datastore).
 * GET ?q=mayo
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchCmsHospitalsByName } from '@/lib/api/cmsHospitals'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(50, Math.max(1, parseInt(limitRaw, 10) || 20)) : 20
  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query q required (min 2 chars)' },
      { status: 400 },
    )
  }
  try {
    const hospitals = await searchCmsHospitalsByName(q, limit)
    return NextResponse.json({
      ok: true,
      query: q,
      count: hospitals.length,
      hospitals,
      note: 'CMS Medicare hospital registry — not a treatment recommendation.',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    )
  }
}
