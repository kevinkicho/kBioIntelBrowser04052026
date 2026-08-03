/**
 * Typeahead for universities / colleges / research labs.
 * GET ?q=harvard&country=US&limit=12
 * Free public APIs only (ROR, Scorecard, OpenAlex).
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchOrgSuggestions } from '@/lib/orgs/orgSuggest'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

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

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'orgs-suggest',
        empty: [] as Awaited<ReturnType<typeof searchOrgSuggestions>>,
        timeoutMs: 12_000,
        run: async () => searchOrgSuggestions(q, { countryCode: country, limit }),
      }),
    [request.signal],
  )

  return NextResponse.json({
    ok: agent.status === 'loaded' || agent.status === 'empty',
    query: q,
    country: country || null,
    count: agent.data.length,
    suggestions: agent.data,
    note: 'Live free-API typeahead — not admissions or clinical referral advice. No mock data.',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
