/**
 * EU research org pack via ROR (country-filtered education/healthcare/facility).
 * GET ?q=amyloid&country=DE  OR  ?q=karolinska&pack=1 for multi-country pack
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  searchEuResearchOrgsByCountry,
  searchEuResearchOrgsPack,
  EU_CORE_RESEARCH_COUNTRIES,
} from '@/lib/api/euResearchOrgs'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const country = request.nextUrl.searchParams.get('country')?.trim() || ''
  const pack =
    request.nextUrl.searchParams.get('pack') === '1' ||
    request.nextUrl.searchParams.get('pack') === 'true'
  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query q required (min 2 chars)' },
      { status: 400 },
    )
  }
  try {
    const orgs = pack
      ? await searchEuResearchOrgsPack(q)
      : country
        ? await searchEuResearchOrgsByCountry(q, country, 20)
        : await searchEuResearchOrgsPack(q)
    return NextResponse.json({
      ok: true,
      query: q,
      country: country || null,
      pack: pack || !country,
      coreCountries: [...EU_CORE_RESEARCH_COUNTRIES],
      count: orgs.length,
      orgs,
      note: 'ROR EU research orgs (not a complete EU hospital census). Free public ROR API.',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    )
  }
}
