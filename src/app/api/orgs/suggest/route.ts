/**
 * Typeahead for universities / colleges / research labs.
 * GET ?q=harvard&country=US&limit=12
 * Free public APIs only (ROR, Scorecard, OpenAlex).
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchOrgSuggestions } from '@/lib/orgs/orgSuggest'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const country = request.nextUrl.searchParams.get('country')?.trim() || undefined
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(20, Math.max(1, parseInt(limitRaw, 10) || 12)) : 12

  if (q.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'Query q required (min 2 chars)', suggestions: [] },
      { status: 400 },
    )
  }

  try {
    const suggestions = await searchOrgSuggestions(q, {
      countryCode: country,
      limit,
    })
    return NextResponse.json({
      ok: true,
      query: q,
      country: country || null,
      count: suggestions.length,
      suggestions,
      note: 'Live free-API typeahead — not admissions or clinical referral advice. No mock data.',
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        suggestions: [],
      },
      { status: 502 },
    )
  }
}
