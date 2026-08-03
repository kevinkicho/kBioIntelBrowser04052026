import { NextRequest, NextResponse } from 'next/server'
import { getComputedPropertiesByCid } from '@/lib/api/pubchem-properties'
import { getMoleculeById } from '@/lib/api/pubchem'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

/** Properties by CID — free-API agent policy (hard wall clock). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid) || cid < 1) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const ac = new AbortController()
  const result = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'properties',
        empty: null as Awaited<ReturnType<typeof getComputedPropertiesByCid>>,
        timeoutMs: 12_000,
        run: async () => {
          let name: string | undefined
          try {
            const mol = await getMoleculeById(cid)
            name = mol?.name
          } catch {
            /* optional */
          }
          return getComputedPropertiesByCid(cid, { name })
        },
      }),
    [request.signal],
  )

  return NextResponse.json({
    properties: result.data,
    _agentStatus: result.status,
    _agentMs: result.ms,
    ...(result.status === 'timeout' || result.status === 'error'
      ? { _partial: true, _timeout: result.status === 'timeout', _error: result.error }
      : {}),
  })
}
