/**
 * NCI terminology concepts via free public EVS REST API
 * (replacement for dead cadsrapi.nci.nih.gov host).
 * @see https://api-evsrest.nci.nih.gov/
 *
 * Panel remains labeled NCI caDSR-adjacent; data is NCI Thesaurus (NCIt) free public concepts.
 * Never invents rows.
 */

import { standardizeResponse } from './utils'
import { z } from 'zod'

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

export async function fetchCadsrData(
  query: string,
): Promise<ReturnType<typeof standardizeResponse<CadsrResponse>>> {
  const q = query.trim()
  if (q.length < 2) return EMPTY()

  try {
    const url = new URL(EVS_SEARCH)
    url.searchParams.set('term', q)
    url.searchParams.set('include', 'minimal,summary')
    url.searchParams.set('pageSize', '15')
    url.searchParams.set('type', 'contains')

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    })
    if (!response.ok) return EMPTY()

    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('text/html')) return EMPTY()

    const data = (await response.json()) as {
      concepts?: Array<Record<string, unknown>>
      total?: number
    }
    const list = Array.isArray(data.concepts) ? data.concepts : []

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

    const parsedData = CadsrResponseSchema.parse({ concepts })
    return {
      data: parsedData,
      source: 'NCI EVS (NCIt)',
      timestamp: new Date().toISOString(),
    }
  } catch {
    return EMPTY()
  }
}
