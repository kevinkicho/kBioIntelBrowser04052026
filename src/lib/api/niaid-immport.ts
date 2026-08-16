/**
 * NIAID ImmPort Shared Data Search API (free public JSON).
 * @see https://docs.immport.org/apidocumentation/shareddataapi/search/
 * BASE: https://www.immport.org/data/query/api/search
 * HTTP error / HTML / timeout are not EMPTY().
 */

import { standardizeResponse } from './utils'
import { z } from 'zod'
import { freeApiAgent } from './freeApiAgent'
import { timedFetch } from './timedFetch'

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

const EMPTY = (): ReturnType<typeof standardizeResponse<ImmPortResponse>> => ({
  data: { studies: [] },
  source: 'NIAID ImmPort',
  timestamp: new Date().toISOString(),
})

const SEARCH_BASE = 'https://www.immport.org/data/query/api/search/study'

function mapStudies(rawHits: Array<{ _id?: string; _source?: Record<string, unknown> }>): ImmPortResponse {
  const studies = rawHits.slice(0, 12).map((hit, i) => {
    const s = hit._source ?? {}
    const conditions = Array.isArray(s.condition_or_disease)
      ? (s.condition_or_disease as string[])
      : s.condition_or_disease
        ? [String(s.condition_or_disease)]
        : []
    const arms = Array.isArray(s.arm_name) ? (s.arm_name as string[]).map(String) : []
    const focus = Array.isArray(s.research_focus)
      ? (s.research_focus as string[]).join(', ')
      : String(s.research_focus || '')
    const enrollment = Number(
      s.actual_enrollment ?? s.shared_subject_count ?? s.study_size_number ?? 0,
    )

    return {
      studyId: String(s.study_accession || hit._id || `immport-${i}`),
      title: String(s.brief_title || s.title || s.study_accession || ''),
      description: String(s.brief_description || s.description || ''),
      studyType:
        s.clinical_trial === 'Y' || s.clinical_trial === true
          ? 'Clinical trial'
          : focus || 'Research study',
      conditionStudied: conditions.join('; ') || undefined,
      intervention: focus || undefined,
      participantCount: Number.isFinite(enrollment) ? enrollment : 0,
      arms: arms.slice(0, 12),
      reagents: [],
    }
  })
  return ImmPortResponseSchema.parse({ studies })
}

export async function fetchImmPortData(
  query: string,
): Promise<ReturnType<typeof standardizeResponse<ImmPortResponse>>> {
  const q = query.trim()
  if (q.length < 2) return EMPTY()

  const url = new URL(SEARCH_BASE)
  url.searchParams.set('term', q)
  url.searchParams.set('pageSize', '12')
  url.searchParams.set(
    'sourceFields',
    [
      'study_accession',
      'brief_title',
      'brief_description',
      'condition_or_disease',
      'research_focus',
      'program_name',
      'clinical_trial',
      'actual_enrollment',
      'shared_subject_count',
      'species',
      'study_pi',
      'pubmed_id',
    ].join(','),
  )

  const result = await freeApiAgent<ImmPortResponse>({
    source: 'niaid-immport',
    empty: { studies: [] },
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
        throw new Error('HTML response from ImmPort')
      }
      const text = await response.text()
      if (!text || text.trimStart().startsWith('<')) {
        throw new Error('HTML body from ImmPort')
      }
      const data = JSON.parse(text) as {
        hits?: {
          hits?: Array<{ _id?: string; _source?: Record<string, unknown> }>
          total?: { value?: number } | number
        }
      }
      return mapStudies(data.hits?.hits ?? [])
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
    source: 'NIAID ImmPort',
    timestamp: new Date().toISOString(),
  }
}
