import { getApiKey, standardizeResponse } from "./utils"
import { z } from "zod"
import { isApiSourceDisabled } from "./sourceAvailability"

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
  source: 'NCI caDSR',
  timestamp: new Date().toISOString(),
})

export async function fetchCadsrData(query: string): Promise<ReturnType<typeof standardizeResponse<CadsrResponse>>> {
  // Known-dead host — skip network until endpoint is updated (see sourceAvailability.ts)
  if (isApiSourceDisabled('nci-cadsr')) {
    return EMPTY()
  }

  const apiKey = getApiKey('NCI_CADSR_API_KEY')

  try {
    const baseUrl = 'https://cadsrapi.nci.nih.gov/cadsrapi/v1/concepts'
    const url = new URL(baseUrl)
    url.searchParams.append('q', query)
    if (apiKey) url.searchParams.append('api_key', apiKey)

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) {
      return EMPTY()
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('text/html')) {
      return EMPTY()
    }

    const data = await response.json()
    const concepts = Array.isArray(data) ? data : (data.concepts ?? data.results ?? [])

    const parsedConcepts = concepts.slice(0, 10).map((c: Record<string, unknown>) => ({
      conceptId: String(c.conceptId || c.id || c.longName || ''),
      preferredName: String(c.preferredName || c.name || c.label || ''),
      definition: String(c.definition || c.preferredDefinition || ''),
      context: String(c.context || c.workflowStatus || ''),
      workflowStatus: String(c.workflowStatus || c.status || ''),
      evsSource: String(c.evsSource || c.source || ''),
    }))

    const parsedData = CadsrResponseSchema.parse({ concepts: parsedConcepts })
    return { data: parsedData, source: 'NCI caDSR', timestamp: new Date().toISOString() }
  } catch {
    // Silent empty — avoid console spam for optional NIH sources
    return EMPTY()
  }
}
