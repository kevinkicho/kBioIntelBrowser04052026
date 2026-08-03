/**
 * Leaf API route agent — one policy for /api/{source}/[id] molecule routes.
 *
 * Stops copy-pasting getMoleculeById + empty array + no timeout on every route.
 * Of-record: still free public APIs only; agent only executes policy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById, PubChemUpstreamError } from './pubchem'
import { freeApiAgent } from './freeApiAgent'
import { runWithApiAbort } from './apiAbort'
import { withTimeout, isTimeoutError } from '../utils'

const MOLECULE_LOOKUP_MS = 6_000
const LEAF_WORK_MS = 12_000

export type MoleculeLeafHandler = (name: string, cid: number) => Promise<unknown>

/**
 * Standard GET for molecule-id leaf routes:
 * parse CID → resolve name (budgeted) → fetch by name (budgeted) → JSON envelope.
 * On timeout/error: 200 + empty + _partial/_timeout so live health doesn't hard-fail.
 */
export async function moleculeLeafGet(
  request: NextRequest,
  params: { id: string },
  responseKey: string,
  handler: MoleculeLeafHandler,
  options?: { empty?: unknown; source?: string },
): Promise<NextResponse> {
  const empty = options?.empty ?? []
  const source = options?.source ?? responseKey
  const cid = parseInt(params.id, 10)
  if (isNaN(cid) || cid < 1) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const ac = new AbortController()
  try {
    const payload = await runWithApiAbort(
      ac,
      async () => {
        const molecule = await withTimeout(getMoleculeById(cid), MOLECULE_LOOKUP_MS, {
          abortController: ac,
          signal: request.signal,
        }).catch((err) => {
          if (err instanceof PubChemUpstreamError) throw err
          return null
        })

        if (!molecule) {
          return { [responseKey]: empty, _partial: false }
        }

        const result = await freeApiAgent({
          source,
          empty,
          timeoutMs: LEAF_WORK_MS,
          retries: 0,
          run: async () => handler(molecule.name, cid),
        })

        return {
          [responseKey]: result.data,
          ...(result.status === 'timeout' || result.status === 'error'
            ? {
                _partial: true,
                _timeout: result.status === 'timeout',
                _error: result.error,
                _agentStatus: result.status,
                _agentMs: result.ms,
              }
            : {
                _agentStatus: result.status,
                _agentMs: result.ms,
              }),
        }
      },
      [request.signal],
    )

    return NextResponse.json(payload)
  } catch (err) {
    if (err instanceof PubChemUpstreamError) {
      return NextResponse.json(
        {
          [responseKey]: empty,
          _partial: true,
          _error: err.message,
          _agentStatus: 'error',
        },
        { status: 200 },
      )
    }
    if (isTimeoutError(err)) {
      return NextResponse.json({
        [responseKey]: empty,
        _partial: true,
        _timeout: true,
        _error: err instanceof Error ? err.message : 'leaf timeout',
        _agentStatus: 'timeout',
      })
    }
    return NextResponse.json({
      [responseKey]: empty,
      _partial: true,
      _error: err instanceof Error ? err.message : 'leaf error',
      _agentStatus: 'error',
    })
  }
}
