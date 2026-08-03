import { NextRequest, NextResponse } from 'next/server'
import { searchGenes } from '@/lib/api/mygene'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '20', 10) || 20, 1), 50)

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const query = q.trim()
  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'search-gene',
        empty: [] as Awaited<ReturnType<typeof searchGenes>>,
        timeoutMs: 12_000,
        run: async () => searchGenes(query),
      }),
    [request.signal],
  )

  const results = agent.data.slice(0, limit).map((g) => ({
    geneId: g.geneId,
    symbol: g.symbol,
    name: g.name,
    summary: g.summary?.slice(0, 200) || '',
    chromosome: g.mapLocation || '',
    typeOfGene: g.typeOfGene || '',
    aliases: (
      Array.isArray(g.aliases)
        ? g.aliases
        : typeof g.aliases === 'string' && g.aliases
          ? [g.aliases]
          : []
    ).slice(0, 5),
  }))

  return NextResponse.json({
    results,
    searchType: 'gene',
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
