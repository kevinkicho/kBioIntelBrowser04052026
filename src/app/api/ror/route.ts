/**
 * Research Organization Registry (ROR) search — free, no key.
 * GET ?q=mayo&country=US&types=healthcare,education
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchRorOrganizations } from '@/lib/api/ror'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const country = request.nextUrl.searchParams.get('country')?.trim() || undefined
  const typesRaw = request.nextUrl.searchParams.get('types')?.trim()
  const types = typesRaw
    ? typesRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined
  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query q required (min 2 chars)' },
      { status: 400 },
    )
  }
  try {
    const orgs = await searchRorOrganizations(q, { countryCode: country, types })
    return NextResponse.json({
      ok: true,
      query: q,
      country: country || null,
      types: types || null,
      count: orgs.length,
      orgs,
      note: 'ROR CC0 research organization registry — not clinical referral advice.',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    )
  }
}
