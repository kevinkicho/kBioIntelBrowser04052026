import { NextRequest, NextResponse } from 'next/server'
import { getRelatedCompoundsByTarget } from '@/lib/api/chembl'
import { getCached, setCache } from '@/lib/cache'
import type { RelatedCompound } from '@/lib/types'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'
import { timedFetch } from '@/lib/api/timedFetch'

const CHEMBL_TARGET_SEARCH =
  'https://www.ebi.ac.uk/chembl/api/data/target/search.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/** Accept CHEMBL… ids or gene symbols (e.g. EGFR → first human single protein target). */
async function resolveChemblTargetId(raw: string): Promise<string | null> {
  const id = raw.trim()
  if (!id) return null
  if (/^CHEMBL\d+$/i.test(id)) return id.toUpperCase()

  try {
    const url = `${CHEMBL_TARGET_SEARCH}?q=${encodeURIComponent(id)}&limit=15`
    const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
    if (!res.ok) return null
    const data = await res.json()
    const targets = (data.targets ?? []) as Array<{
      target_chembl_id?: string
      target_type?: string
      organism?: string
      pref_name?: string
      target_components?: Array<{ accession?: string }>
    }>
    if (!targets.length) return null

    const human = targets.filter(
      (t) => /homo sapiens/i.test(String(t.organism || '')) || !t.organism,
    )
    const pool = human.length ? human : targets
    const single =
      pool.find((t) => /single protein/i.test(String(t.target_type || ''))) || pool[0]
    return single?.target_chembl_id ? String(single.target_chembl_id) : null
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { targetId: string } },
) {
  const targetId = params.targetId
  if (!targetId) {
    return NextResponse.json({ error: 'Missing target ID' }, { status: 400 })
  }

  const cacheKey = `competitive:${targetId}`
  const cached = getCached<RelatedCompound[]>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const ac = new AbortController()
  const agent = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'competitive',
        empty: [] as RelatedCompound[],
        timeoutMs: 14_000,
        run: async () => {
          const chemblTarget = await resolveChemblTargetId(targetId)
          if (!chemblTarget) return []
          return getRelatedCompoundsByTarget(chemblTarget)
        },
      }),
    [request.signal],
  )

  if (agent.status === 'loaded' && agent.data.length > 0) {
    setCache(cacheKey, agent.data, 86400000)
  }

  return NextResponse.json(
    agent.data.length > 0
      ? agent.data
      : {
          compounds: agent.data,
          _agentStatus: agent.status,
          _agentMs: agent.ms,
          ...(agent.status === 'timeout' || agent.status === 'error'
            ? { _partial: true, _timeout: agent.status === 'timeout', _error: agent.error }
            : {}),
        },
  )
}
