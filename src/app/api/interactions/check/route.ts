import { NextResponse } from 'next/server'
import { getMultiDrugInteractions } from '@/lib/api/rxnorm-interactions'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const drugs = body.drugs

    if (!Array.isArray(drugs)) {
      return NextResponse.json({ error: 'drugs must be an array' }, { status: 400 })
    }

    const validDrugs = drugs.filter(
      (d): d is string => typeof d === 'string' && d.trim().length > 0,
    )

    if (validDrugs.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 drug names are required' },
        { status: 400 },
      )
    }

    if (validDrugs.length > 8) {
      return NextResponse.json(
        { error: 'Maximum of 8 drugs allowed' },
        { status: 400 },
      )
    }

    const ac = new AbortController()
    const agent = await runWithApiAbort(
      ac,
      () =>
        freeApiAgent({
          source: 'interactions-check',
          empty: null as Awaited<ReturnType<typeof getMultiDrugInteractions>> | null,
          timeoutMs: 12_000,
          hasData: (d) => d != null,
          run: async () => getMultiDrugInteractions(validDrugs),
        }),
      [request.signal],
    )

    if (!agent.data) {
      return NextResponse.json({
        interactions: [],
        _partial: true,
        _timeout: agent.status === 'timeout',
        _error: agent.error,
        _agentStatus: agent.status,
        _agentMs: agent.ms,
      })
    }

    return NextResponse.json({
      ...agent.data,
      _agentStatus: agent.status,
      _agentMs: agent.ms,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
