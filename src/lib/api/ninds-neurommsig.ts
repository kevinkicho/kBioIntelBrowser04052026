/**
 * NINDS NeuroGenetics / NeuroMMSig search (free public JSON).
 * HTTP error / HTML / timeout are not EMPTY().
 */

import { standardizeResponse } from "./utils"
import { z } from "zod"
import { freeApiAgent } from './freeApiAgent'
import { timedFetch } from './timedFetch'

const NeuroMMSigSignatureSchema = z.object({
  signatureId: z.string(),
  name: z.string(),
  disease: z.string(),
  mechanism: z.string(),
  genes: z.array(z.string()),
  drugs: z.array(z.string()),
  evidence: z.string().optional(),
  publications: z.array(z.string()).optional(),
})

const NeuroMMSigResponseSchema = z.object({
  signatures: z.array(NeuroMMSigSignatureSchema),
})

export type NeuroMMSigSignature = z.infer<typeof NeuroMMSigSignatureSchema>
export type NeuroMMSigResponse = z.infer<typeof NeuroMMSigResponseSchema>

const SEARCH_BASE = 'https://stemcells.nindsgenetics.org/api/search'

function mapSignatures(items: Array<Record<string, unknown>>): NeuroMMSigResponse {
  const signatures = items.slice(0, 10).map((item, i) => ({
    signatureId: String(item.id || item.gene_symbol || item.signatureId || `ninds-${i}`),
    name: String(item.gene_symbol || item.name || item.title || ''),
    disease: String(item.disease || item.condition || item.phenotype || ''),
    mechanism: String(item.mechanism || item.pathway || item.function || ''),
    genes: Array.isArray(item.genes) ? item.genes as string[] : (item.gene_symbol ? [String(item.gene_symbol)] : []),
    drugs: Array.isArray(item.drugs) ? item.drugs as string[] : (item.drug ? [String(item.drug)] : []),
    evidence: String(item.evidence || item.evidence_level || ''),
    publications: Array.isArray(item.publications) ? item.publications as string[] : [],
  }))
  return NeuroMMSigResponseSchema.parse({ signatures })
}

export async function fetchNeuroMMSigData(query: string): Promise<ReturnType<typeof standardizeResponse<NeuroMMSigResponse>>> {
  const url = `${SEARCH_BASE}?q=${encodeURIComponent(query)}&limit=10`

  const result = await freeApiAgent<NeuroMMSigResponse>({
    source: 'ninds-neurommsig',
    empty: { signatures: [] },
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
        throw new Error('HTML response from NINDS NeuroGenetics')
      }
      const text = await response.text()
      if (!text || text.trimStart().startsWith('<')) {
        throw new Error('HTML body from NINDS NeuroGenetics')
      }
      const parsed: unknown = JSON.parse(text)
      const data = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        ? (parsed as {
            results?: Array<Record<string, unknown>>
            signatures?: Array<Record<string, unknown>>
            genes?: Array<Record<string, unknown>>
            data?: Array<Record<string, unknown>>
          })
        : null
      const items = Array.isArray(parsed)
        ? parsed
        : (data?.results ?? data?.signatures ?? data?.genes ?? data?.data ?? [])
      return mapSignatures(Array.isArray(items) ? items as Array<Record<string, unknown>> : [])
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

  return { data: result.data, source: 'NINDS NeuroGenetics', timestamp: new Date().toISOString() }
}
