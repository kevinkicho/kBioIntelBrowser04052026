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
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

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

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'eu-orgs',
        empty: [] as Awaited<ReturnType<typeof searchEuResearchOrgsPack>>,
        timeoutMs: 14_000,
        run: async () =>
          pack
            ? searchEuResearchOrgsPack(q)
            : country
              ? searchEuResearchOrgsByCountry(q, country, 20)
              : searchEuResearchOrgsPack(q),
      }),
    [request.signal],
  )

  return NextResponse.json({
    ok: agent.status === 'loaded' || agent.status === 'empty',
    query: q,
    country: country || null,
    pack: pack || !country,
    coreCountries: [...EU_CORE_RESEARCH_COUNTRIES],
    count: agent.data.length,
    orgs: agent.data,
    note: 'ROR EU research orgs (not a complete EU hospital census). Free public ROR API.',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
