import { standardizeResponse } from "./utils"
import { z } from "zod"

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

export async function fetchNeuroMMSigData(query: string): Promise<ReturnType<typeof standardizeResponse<NeuroMMSigResponse>>> {
  try {
    const baseUrl = 'https://stemcells.nindsgenetics.org/api/search'
    const response = await fetch(
      `${baseUrl}?q=${encodeURIComponent(query)}&limit=10`,
      {
        headers: { Accept: 'application/json' },
      },
    )

    if (!response.ok) {
      return { data: { signatures: [] }, source: 'NINDS NeuroGenetics', timestamp: new Date().toISOString() }
    }

    const data = await response.json()
    const items = Array.isArray(data) ? data : (data.results ?? data.signatures ?? data.genes ?? data.data ?? [])

    const signatures = items.slice(0, 10).map((item: Record<string, unknown>, i: number) => ({
      signatureId: String(item.id || item.gene_symbol || item.signatureId || `ninds-${i}`),
      name: String(item.gene_symbol || item.name || item.title || ''),
      disease: String(item.disease || item.condition || item.phenotype || ''),
      mechanism: String(item.mechanism || item.pathway || item.function || ''),
      genes: Array.isArray(item.genes) ? item.genes as string[] : (item.gene_symbol ? [String(item.gene_symbol)] : []),
      drugs: Array.isArray(item.drugs) ? item.drugs as string[] : (item.drug ? [String(item.drug)] : []),
      evidence: String(item.evidence || item.evidence_level || ''),
      publications: Array.isArray(item.publications) ? item.publications as string[] : [],
    }))

    const parsedData = NeuroMMSigResponseSchema.parse({ signatures })
    return { data: parsedData, source: 'NINDS NeuroGenetics', timestamp: new Date().toISOString() }
  } catch (error) {
    console.error('Error fetching NINDS neurogenetics data:', error)
    return { data: { signatures: [] }, source: 'NINDS NeuroGenetics', timestamp: new Date().toISOString() }
  }
}