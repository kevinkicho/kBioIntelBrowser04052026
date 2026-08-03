import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getBgeeData } from '@/lib/api/bgee'
import { resolveDrugTargets } from '@/lib/api/drugTargetResolve'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'bgee',
        empty: [] as unknown[],
        timeoutMs: 14_000,
        run: async () => {
          const molecule = await getMoleculeById(cid)
          if (!molecule) return []

          const resolved = await resolveDrugTargets(molecule.name, 5)
          const genes =
            resolved.geneSymbols.length > 0 ? resolved.geneSymbols : [molecule.name]

          const allExpressions: unknown[] = []
          for (const gene of genes.slice(0, 3)) {
            const data = await getBgeeData(gene)
            if (data.expressions?.length) {
              allExpressions.push(...data.expressions)
            }
            if (allExpressions.length >= 20) break
          }
          return allExpressions.slice(0, 40)
        },
      }),
    [request.signal],
  )

  return NextResponse.json({
    expressions: agent.data,
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
