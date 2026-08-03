import { NextRequest, NextResponse } from 'next/server'
import { getOrphanetGenes, searchOrphanetDiseases } from '@/lib/api/orphanet'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

/**
 * GET /api/orphanet/genes?q=disease+name  OR  ?orphaCode=12345
 * Free Orphadata API — rare-disease gene associations for pin bias.
 */
export async function GET(request: NextRequest) {
  const orphaCode = request.nextUrl.searchParams.get('orphaCode')?.trim()
  const q = request.nextUrl.searchParams.get('q')?.trim()

  if (!orphaCode && !(q && q.length >= 2)) {
    return NextResponse.json(
      { error: 'Provide q (disease name) or orphaCode' },
      { status: 400 },
    )
  }

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'orphanet-genes',
        empty: { genes: [] as unknown[], orphaCode: null as string | null, diseaseName: undefined as string | undefined },
        timeoutMs: 12_000,
        hasData: (d) => Array.isArray(d.genes) && d.genes.length > 0,
        run: async () => {
          if (orphaCode) {
            const genes = await getOrphanetGenes(orphaCode)
            return { genes, orphaCode, diseaseName: undefined }
          }
          const hits = await searchOrphanetDiseases(q!)
          const top = hits[0]
          if (!top?.orphaCode) {
            return { genes: [], orphaCode: null, diseaseName: undefined }
          }
          const genes = await getOrphanetGenes(top.orphaCode)
          return {
            genes,
            orphaCode: top.orphaCode,
            diseaseName: top.diseaseName,
          }
        },
      }),
    [request.signal],
  )

  return NextResponse.json({
    orphaCode: agent.data.orphaCode,
    diseaseName: agent.data.diseaseName,
    genes: agent.data.genes,
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
