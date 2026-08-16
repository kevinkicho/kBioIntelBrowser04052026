import { NextRequest, NextResponse } from 'next/server'
import { getSimilarMolecules } from '@/lib/api/pubchem-similar'
import { getTargetRelatedMolecules } from '@/lib/api/dgidb'
import { getCached, setCache } from '@/lib/cache'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'
import { timedFetch } from '@/lib/api/timedFetch'
import { shouldCacheHonestyEnvelope } from '@/lib/honestyEnvelope'

export function similarHasRows(data: {
  structural?: unknown
  targetRelated?: unknown
}): boolean {
  return (
    (Array.isArray(data.structural) && data.structural.length > 0) ||
    (Array.isArray(data.targetRelated) && data.targetRelated.length > 0)
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const cacheKey = `similar:${cid}`
  const cached = getCached<Record<string, unknown>>(cacheKey)
  // Skip leftover empty/timeout shells so they cannot pin as success.
  if (cached && shouldCacheHonestyEnvelope(cached) && similarHasRows(cached)) {
    return NextResponse.json(cached)
  }

  const empty = { structural: [] as unknown[], targetRelated: [] as unknown[] }
  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'similar',
        empty,
        timeoutMs: 14_000,
        hasData: (r) => similarHasRows(r),
        run: async () => {
          const [moleculeName, structural] = await Promise.all([
            resolveMoleculeName(cid),
            getSimilarMolecules(cid),
          ])

          let targetRelated: Awaited<ReturnType<typeof getTargetRelatedMolecules>> = []

          if (moleculeName) {
            const { getDrugGeneInteractionsByName } = await import('@/lib/api/dgidb')
            const geneInteractions = await getDrugGeneInteractionsByName(moleculeName)
            const geneSymbols = geneInteractions.map((i) => i.geneSymbol).filter(Boolean)
            if (geneSymbols.length > 0) {
              targetRelated = await getTargetRelatedMolecules(geneSymbols, moleculeName)
            }
          }

          return { structural, targetRelated }
        },
      }),
    [request.signal],
  )

  const hasRows = similarHasRows(agent.data)
  const payload: Record<string, unknown> = {
    ...agent.data,
    _agentStatus: agent.status,
    _agentMs: agent.ms,
  }

  if (agent.status === 'timeout' || agent.status === 'error') {
    payload._partial = true
    if (agent.status === 'timeout') payload._timeout = true
    payload._error = agent.error
  } else if (!hasRows) {
    payload._emptyHonest = true
    payload._notRetrieved = true
    payload._honesty =
      'Empty free-API sample this session — not proof of zero similar neighbors forever.'
  }

  // Empty-as-success / timeout / error must not be stored as a success shell.
  if (shouldCacheHonestyEnvelope(payload) && hasRows) {
    setCache(cacheKey, payload)
  }

  return NextResponse.json(payload)
}

async function resolveMoleculeName(cid: number): Promise<string | null> {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title/JSON`
    const res = await timedFetch(url, { timeoutMs: 6000, next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.PropertyTable?.Properties?.[0]?.Title ?? null
  } catch {
    return null
  }
}
