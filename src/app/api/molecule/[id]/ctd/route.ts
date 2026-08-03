import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getCTDData } from '@/lib/api/ctd'
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

  const empty = { interactions: [] as unknown[], diseaseAssociations: [] as unknown[] }
  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'ctd',
        empty,
        timeoutMs: 14_000,
        hasData: (d) =>
          (Array.isArray(d.interactions) && d.interactions.length > 0) ||
          (Array.isArray(d.diseaseAssociations) && d.diseaseAssociations.length > 0),
        run: async () => {
          const molecule = await getMoleculeById(cid)
          if (!molecule) return empty
          const data = await getCTDData(molecule.name, false)
          return {
            interactions: data.interactions ?? [],
            diseaseAssociations: data.diseaseAssociations ?? [],
          }
        },
      }),
    [request.signal],
  )

  return NextResponse.json({
    ...agent.data,
    _agentStatus: agent.status,
    _agentMs: agent.ms,
    ...(agent.status === 'timeout' || agent.status === 'error'
      ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
      : {}),
  })
}
