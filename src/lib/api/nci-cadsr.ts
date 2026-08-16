/**
 * NCI terminology concepts via free public EVS REST API
 * (replacement for dead cadsrapi.nci.nih.gov host).
 * @see https://api-evsrest.nci.nih.gov/
 *
 * Panel labeled NCI EVS/NCIt. Data is NCI Thesaurus (NCIt) free public concepts.
 * Never invents rows. HTTP error / HTML / timeout are not EMPTY().
 */

import { standardizeResponse } from './utils'
import { z } from 'zod'
import { freeApiAgent } from './freeApiAgent'
import { timedFetch } from './timedFetch'

const CadsrConceptSchema = z.object({
  conceptId: z.string(),
  preferredName: z.string(),
  definition: z.string().optional(),
  context: z.string(),
  workflowStatus: z.string(),
  evsSource: z.string().optional(),
})

const CadsrResponseSchema = z.object({
  concepts: z.array(CadsrConceptSchema),
})

export type CadsrConcept = z.infer<typeof CadsrConceptSchema>
export type CadsrResponse = z.infer<typeof CadsrResponseSchema>

const EMPTY = (): ReturnType<typeof standardizeResponse<CadsrResponse>> => ({
  data: { concepts: [] },
  source: 'NCI EVS (NCIt)',
  timestamp: new Date().toISOString(),
})

const EVS_SEARCH =
  'https://api-evsrest.nci.nih.gov/api/v1/concept/ncit/search'

function mapConcepts(list: Array<Record<string, unknown>>): CadsrResponse {
  const concepts = list.slice(0, 15).map((c) => ({
    conceptId: String(c.code || c.conceptId || c.id || ''),
    preferredName: String(c.name || c.preferredName || ''),
    definition: String(
      (c.definitions as Array<{ definition?: string }> | undefined)?.[0]?.definition ||
        c.definition ||
        '',
    ),
    context: String(c.terminology || 'ncit'),
    workflowStatus: String(c.conceptStatus || (c.active === false ? 'INACTIVE' : 'ACTIVE')),
    evsSource: String(c.version || c.terminology || 'NCI Thesaurus'),
  }))
  return CadsrResponseSchema.parse({ concepts })
}

export async function fetchCadsrData(
  query: string,
): Promise<ReturnType<typeof standardizeResponse<CadsrResponse>>> {
  const q = query.trim()
  if (q.length < 2) return EMPTY()

  const url = new URL(EVS_SEARCH)
  url.searchParams.set('term', q)
  url.searchParams.set('include', 'minimal,summary')
  url.searchParams.set('pageSize', '15')
  url.searchParams.set('type', 'contains')

  const result = await freeApiAgent<CadsrResponse>({
    source: 'nci-cadsr',
    empty: { concepts: [] },
    run: async ({ signal }) => {
      const response = await timedFetch(url.toString(), {
        headers: { Accept: 'application/json' },
        next: { revalidate: 86400 },
        signal,
      })
      if (!response.ok) {
        const err = new Error(`HTTP ${response.status}`) as Error & { status?: number }
        err.status = response.status
        throw err
      }
      const contentType = (response.headers.get('content-type') || '').toLowerCase()
      if (contentType.includes('text/html')) {
        throw new Error('HTML response from NCI EVS')
      }
      const data = (await response.json()) as {
        concepts?: Array<Record<string, unknown>>
        total?: number
      }
      const list = Array.isArray(data.concepts) ? data.concepts : []
      return mapConcepts(list)
    },
  })

  if (result.status === 'timeout' || result.status === 'error') {
    const err = new Error(result.error || result.status) as Error & { status?: number }
    if (result.status === 'timeout') {
      err.name = 'AbortError'
    } else {
      err.status = 500
    }
    throw err
  }

  return {
    data: result.data,
    source: 'NCI EVS (NCIt)',
    timestamp: new Date().toISOString(),
  }
}
