/**
 * NCATS Translator / ARAX entity lookup (free public JSON).
 * HTTP error / HTML / timeout are not EMPTY().
 */

import { standardizeResponse } from "./utils"
import { z } from "zod"
import { freeApiAgent } from './freeApiAgent'
import { timedFetch } from './timedFetch'

const TranslatorAssociationSchema = z.object({
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  edgeLabel: z.string(),
  source: z.string(),
  publications: z.array(z.string()).optional(),
})

const TranslatorResponseSchema = z.object({
  associations: z.array(TranslatorAssociationSchema),
})

export type TranslatorAssociation = z.infer<typeof TranslatorAssociationSchema>
export type TranslatorResponse = z.infer<typeof TranslatorResponseSchema>

const SEARCH_BASE = 'https://arax.ncats.io/api/arax/v1.0/entity'

function mapAssociations(entities: Array<Record<string, unknown>>): TranslatorResponse {
  const associations = entities.slice(0, 10).map((ent) => ({
    subject: String(ent.name || ent.id || ''),
    predicate: 'related_to',
    object: String(ent.category || 'chemical'),
    edgeLabel: String(ent.category || ''),
    source: 'NCATS Translator / ARAX',
    publications: [] as string[],
  }))
  return TranslatorResponseSchema.parse({ associations })
}

export async function fetchTranslatorData(query: string): Promise<ReturnType<typeof standardizeResponse<TranslatorResponse>>> {
  const url = `${SEARCH_BASE}?substring=${encodeURIComponent(query)}&limit=10`

  const result = await freeApiAgent<TranslatorResponse>({
    source: 'ncats-translator',
    empty: { associations: [] },
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
        throw new Error('HTML response from NCATS Translator')
      }
      const text = await response.text()
      if (!text || text.trimStart().startsWith('<')) {
        throw new Error('HTML body from NCATS Translator')
      }
      const parsed: unknown = JSON.parse(text)
      const data = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        ? (parsed as { entities?: Array<Record<string, unknown>> })
        : null
      return mapAssociations(data?.entities ?? [])
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

  return { data: result.data, source: 'NCATS Translator', timestamp: new Date().toISOString() }
}
