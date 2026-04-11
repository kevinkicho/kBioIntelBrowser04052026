import { standardizeResponse } from "./utils"
import { z } from "zod"

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

export async function fetchAnvilData(query: string): Promise<ReturnType<typeof standardizeResponse<AnvilResponse>>> {
  try {
    const baseUrl = 'https://service.anvil.gi.ucsc.edu/api/index/datasets'
    const response = await fetch(
      `${baseUrl}?searchTerm=${encodeURIComponent(query)}&limit=10`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    )

    if (!response.ok) {
      return { data: { datasets: [] }, source: 'NHGRI AnVIL', timestamp: new Date().toISOString() }
    }

    const data = await response.json()
    const items = Array.isArray(data) ? data : (data.datasets ?? data.results ?? data.items ?? [])

    const datasets = items.slice(0, 10).map((item: Record<string, unknown>, i: number) => ({
      datasetId: String(item.dataset_id || item.id || `anvil-${i}`),
      name: String(item.name || item.title || item.study_name || ''),
      description: String(item.description || ''),
      studyName: String(item.study_name || item.study || item.name || ''),
      consentGroups: Array.isArray(item.consent_groups) ? item.consent_groups as string[] : [],
      dataTypes: Array.isArray(item.data_types) ? item.data_types as string[] : (Array.isArray(item.datatypes) ? item.datatypes as string[] : []),
      participantCount: Number(item.participant_count || item.participants || 0),
      sampleCount: Number(item.sample_count || item.samples || 0),
    }))

    const parsedData = AnvilResponseSchema.parse({ datasets })
    return { data: parsedData, source: 'NHGRI AnVIL', timestamp: new Date().toISOString() }
  } catch (error) {
    console.error('Error fetching NHGRI AnVIL data:', error)
    return { data: { datasets: [] }, source: 'NHGRI AnVIL', timestamp: new Date().toISOString() }
  }
}