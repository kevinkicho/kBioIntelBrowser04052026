import { NextRequest, NextResponse } from 'next/server'
import { getSimilarMolecules } from '@/lib/api/pubchem-similar'
import { getTargetRelatedMolecules } from '@/lib/api/dgidb'
import { getCached, setCache } from '@/lib/cache'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'
import { timedFetch } from '@/lib/api/timedFetch'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const cacheKey = `similar:${cid}`
  const cached = getCached<unknown>(cacheKey)
  if (cached) return NextResponse.json(cached)

  const empty = { structural: [] as unknown[], targetRelated: [] as unknown[] }
  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'similar',
        empty,
        timeoutMs: 14_000,
        hasData: (r) =>
          (Array.isArray(r.structural) && r.structural.length > 0) ||
          (Array.isArray(r.targetRelated) && r.targetRelated.length > 0),
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

  if (agent.status === 'loaded') {
    setCache(cacheKey, agent.data)
  }

  return NextResponse.json({
    ...agent.data,
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
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
