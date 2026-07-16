import { standardizeResponse } from "./utils"
import { z } from "zod"

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

export async function fetchTranslatorData(query: string): Promise<ReturnType<typeof standardizeResponse<TranslatorResponse>>> {
  try {
    const baseUrl = 'https://arax.ncats.io/api/arax/v1.0/entity'
    const response = await fetch(`${baseUrl}?substring=${encodeURIComponent(query)}&limit=10`, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return { data: { associations: [] }, source: 'NCATS Translator', timestamp: new Date().toISOString() }
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('text/html')) {
      return { data: { associations: [] }, source: 'NCATS Translator', timestamp: new Date().toISOString() }
    }

    const text = await response.text()
    if (!text || text.trimStart().startsWith('<')) {
      return { data: { associations: [] }, source: 'NCATS Translator', timestamp: new Date().toISOString() }
    }

    const data = JSON.parse(text)
    const entities = data?.entities ?? []

    const associations = entities.slice(0, 10).map((ent: Record<string, unknown>) => ({
      subject: String(ent.name || ent.id || ''),
      predicate: 'related_to',
      object: String(ent.category || 'chemical'),
      edgeLabel: String(ent.category || ''),
      source: 'NCATS Translator / ARAX',
      publications: [] as string[],
    }))

    const parsedData = TranslatorResponseSchema.parse({ associations })
    return { data: parsedData, source: 'NCATS Translator', timestamp: new Date().toISOString() }
  } catch {
    return { data: { associations: [] }, source: 'NCATS Translator', timestamp: new Date().toISOString() }
  }
}