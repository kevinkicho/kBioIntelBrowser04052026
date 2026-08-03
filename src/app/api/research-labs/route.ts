/**
 * Research university / college / lab dossier pipeline (free public APIs).
 * GET ?q=harvard&country=US&euPack=1
 */

import { NextRequest, NextResponse } from 'next/server'
import { runResearchLabPipeline } from '@/lib/researchLabs'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

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

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'research-labs',
        empty: null as Awaited<ReturnType<typeof runResearchLabPipeline>> | null,
        timeoutMs: 16_000,
        hasData: (d) => d != null && d.ok === true,
        run: async () =>
          runResearchLabPipeline({
            query: q,
            countryCode: country,
            includeEuPack: euPack || !country,
            includeGrants: !noGrants,
            includeOpenAire: !noOpenAire,
            includeHospitals: true,
          }),
      }),
    [request.signal],
  )

  if (!agent.data) {
    return NextResponse.json({
      ok: false,
      query: q,
      _agentStatus: agent.status,
      _agentMs: agent.ms,
      _partial: true,
      _timeout: agent.status === 'timeout',
      _error: agent.error,
      error: agent.error ?? 'research labs pipeline failed',
    })
  }

  return NextResponse.json({
    ok: agent.data.ok,
    query: q,
    dossier: agent.data.dossier,
    warnings: agent.data.warnings,
    note: 'Free public affiliation dossier — not admissions or clinical referral advice.',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
  })
}
