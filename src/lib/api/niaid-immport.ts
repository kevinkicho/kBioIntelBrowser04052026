import { standardizeResponse } from "./utils"
import { z } from "zod"

const ImmPortStudySchema = z.object({
  studyId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  studyType: z.string(),
  conditionStudied: z.string().optional(),
  intervention: z.string().optional(),
  participantCount: z.number(),
  arms: z.array(z.string()),
  reagents: z.array(z.string()).optional(),
})

const ImmPortResponseSchema = z.object({
  studies: z.array(ImmPortStudySchema),
})

export type ImmPortStudy = z.infer<typeof ImmPortStudySchema>
export type ImmPortResponse = z.infer<typeof ImmPortResponseSchema>

export async function fetchImmPortData(query: string): Promise<ReturnType<typeof standardizeResponse<ImmPortResponse>>> {
  try {
    const baseUrl = 'https://www.immport.org/shared/data/search'
    const response = await fetch(
      `${baseUrl}?query=${encodeURIComponent(query)}&resultType=study&limit=10`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    )

    if (!response.ok) {
      return { data: { studies: [] }, source: 'NIAID ImmPort', timestamp: new Date().toISOString() }
    }

    const data = await response.json()
    const items = Array.isArray(data) ? data : (data.studies ?? data.results ?? data.items ?? data.data ?? [])

    const studies = items.slice(0, 10).map((item: Record<string, unknown>, i: number) => ({
      studyId: String(item.study_id || item.studyId || item.id || `immport-${i}`),
      title: String(item.title || item.name || item.brief_title || ''),
      description: String(item.description || item.brief_description || ''),
      studyType: String(item.study_type || item.type || 'Unknown'),
      conditionStudied: String(item.condition_studied || item.condition || ''),
      intervention: String(item.intervention || ''),
      participantCount: Number(item.participant_count || item.subject_count || item.enrollment || 0),
      arms: Array.isArray(item.arms) ? item.arms as string[] : [],
      reagents: Array.isArray(item.reagents) ? item.reagents as string[] : [],
    }))

    const parsedData = ImmPortResponseSchema.parse({ studies })
    return { data: parsedData, source: 'NIAID ImmPort', timestamp: new Date().toISOString() }
  } catch (error) {
    console.error('Error fetching NIAID ImmPort data:', error)
    return { data: { studies: [] }, source: 'NIAID ImmPort', timestamp: new Date().toISOString() }
  }
}