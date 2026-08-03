/**
 * Research Organization Registry (ROR) search — free, no key.
 * GET ?q=mayo&country=US&types=healthcare,education
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchRorOrganizations } from '@/lib/api/ror'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

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

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'ror',
        empty: [] as Awaited<ReturnType<typeof searchRorOrganizations>>,
        timeoutMs: 12_000,
        run: async () => searchRorOrganizations(q, { countryCode: country, types }),
      }),
    [request.signal],
  )

  return NextResponse.json({
    ok: agent.status === 'loaded' || agent.status === 'empty',
    query: q,
    country: country || null,
    types: types || null,
    count: agent.data.length,
    orgs: agent.data,
    note: 'ROR CC0 research organization registry — not clinical referral advice.',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
