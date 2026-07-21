/**
 * Research university / college / lab dossier pipeline (free public APIs).
 * GET ?q=harvard&country=US&euPack=1
 */

import { NextRequest, NextResponse } from 'next/server'
import { runResearchLabPipeline } from '@/lib/researchLabs'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const country = request.nextUrl.searchParams.get('country')?.trim() || undefined
  const euPack = request.nextUrl.searchParams.get('euPack') === '1'
  const noGrants = request.nextUrl.searchParams.get('grants') === '0'
  const noOpenAire = request.nextUrl.searchParams.get('openaire') === '0'

  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query q required (min 2 characters)' },
      { status: 400 },
    )
  }

  try {
    const result = await runResearchLabPipeline({
      query: q,
      countryCode: country,
      includeEuPack: euPack || !country,
      includeGrants: !noGrants,
      includeOpenAire: !noOpenAire,
      includeHospitals: true,
    })
    return NextResponse.json({
      ok: result.ok,
      query: q,
      dossier: result.dossier,
      warnings: result.warnings,
      note: 'Free public affiliation dossier — not admissions or clinical referral advice.',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    )
  }
}
