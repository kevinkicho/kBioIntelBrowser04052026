/**
 * NHGRI AnVIL dataset index (free public JSON).
 * HTTP error / HTML / timeout are not EMPTY().
 */

import { standardizeResponse } from "./utils"
import { z } from "zod"
import { freeApiAgent } from './freeApiAgent'
import { timedFetch } from './timedFetch'

const AnvilDatasetSchema = z.object({
  datasetId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  studyName: z.string(),
  consentGroups: z.array(z.string()),
  dataTypes: z.array(z.string()),
  participantCount: z.number(),
  sampleCount: z.number(),
})

const AnvilResponseSchema = z.object({
  datasets: z.array(AnvilDatasetSchema),
})

export type AnvilDataset = z.infer<typeof AnvilDatasetSchema>
export type AnvilResponse = z.infer<typeof AnvilResponseSchema>

const SEARCH_BASE = 'https://service.anvil.gi.ucsc.edu/api/index/datasets'

function mapDatasets(items: Array<Record<string, unknown>>): AnvilResponse {
  const datasets = items.slice(0, 10).map((item, i) => ({
    datasetId: String(item.dataset_id || item.id || `anvil-${i}`),
    name: String(item.name || item.title || item.study_name || ''),
    description: String(item.description || ''),
    studyName: String(item.study_name || item.study || item.name || ''),
    consentGroups: Array.isArray(item.consent_groups) ? item.consent_groups as string[] : [],
    dataTypes: Array.isArray(item.data_types) ? item.data_types as string[] : (Array.isArray(item.datatypes) ? item.datatypes as string[] : []),
    participantCount: Number(item.participant_count || item.participants || 0),
    sampleCount: Number(item.sample_count || item.samples || 0),
  }))
  return AnvilResponseSchema.parse({ datasets })
}

export async function fetchAnvilData(query: string): Promise<ReturnType<typeof standardizeResponse<AnvilResponse>>> {
  const url = `${SEARCH_BASE}?searchTerm=${encodeURIComponent(query)}&limit=10`

  const result = await freeApiAgent<AnvilResponse>({
    source: 'nhgri-anvil',
    empty: { datasets: [] },
    run: async ({ signal }) => {
      const response = await timedFetch(url, {
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
        throw new Error('HTML response from NHGRI AnVIL')
      }
      const text = await response.text()
      if (!text || text.trimStart().startsWith('<')) {
        throw new Error('HTML body from NHGRI AnVIL')
      }
      const parsed: unknown = JSON.parse(text)
      const data = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        ? (parsed as {
            datasets?: Array<Record<string, unknown>>
            results?: Array<Record<string, unknown>>
            items?: Array<Record<string, unknown>>
          })
        : null
      const items = Array.isArray(parsed)
        ? parsed
        : (data?.datasets ?? data?.results ?? data?.items ?? [])
      return mapDatasets(Array.isArray(items) ? items as Array<Record<string, unknown>> : [])
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

  return { data: result.data, source: 'NHGRI AnVIL', timestamp: new Date().toISOString() }
}
