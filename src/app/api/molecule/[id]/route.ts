import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById, PubChemUpstreamError } from '@/lib/api/pubchem'
import { logApiOutcome, startApiTimer } from '@/lib/serverLog'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const timer = startApiTimer()
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    logApiOutcome({
      route: '/api/molecule/[id]',
      method: 'GET',
      status: 400,
      ms: timer.ms(),
      cid: params.id,
    })
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  try {
    const molecule = await getMoleculeById(cid)
    if (!molecule) {
      // Common not-found — skip log noise (logApiOutcome ignores 404)
      logApiOutcome({
        route: '/api/molecule/[id]',
        method: 'GET',
        status: 404,
        ms: timer.ms(),
        cid,
        source: 'pubchem',
      })
      return NextResponse.json({ error: 'Molecule not found' }, { status: 404 })
    }
    logApiOutcome({
      route: '/api/molecule/[id]',
      method: 'GET',
      status: 200,
      ms: timer.ms(),
      cid,
      source: 'pubchem',
    })
    return NextResponse.json({ molecule })
  } catch (error) {
    if (error instanceof PubChemUpstreamError) {
      logApiOutcome({
        route: '/api/molecule/[id]',
        method: 'GET',
        status: 502,
        ms: timer.ms(),
        cid,
        source: 'pubchem',
        retryable: true,
        error: error.message.slice(0, 200),
      })
      return NextResponse.json(
        {
          error: 'Upstream molecule lookup unavailable',
          retryable: true,
          message: error.message,
        },
        { status: 502 },
      )
    }
    logApiOutcome({
      route: '/api/molecule/[id]',
      method: 'GET',
      status: 500,
      ms: timer.ms(),
      cid,
      source: 'pubchem',
      error: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
    })
    return NextResponse.json({ error: 'Failed to fetch molecule' }, { status: 500 })
  }
}
