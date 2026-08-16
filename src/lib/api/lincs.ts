import { timedFetch } from './timedFetch'

export interface LINCSSignature {
  perturbationId: string
  perturbationName: string
  perturbationType: string
  concentration: number
  concentrationUnit: string
  timePoint: string
  cellLine: string
  cellLineName: string
  tissue: string
  upregulatedGenes: string[]
  downregulatedGenes: string[]
  zScore: number
  pValue: number
  similarityScore?: number
}

export interface LINCSResult {
  signatures: LINCSSignature[]
  totalCount: number
}

const LINCS_BASE_URL = 'https://lincsportal.ccs.miami.edu/api/v2'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * LINCS harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True 404 / zero-hit JSON remains []. Signatures 5xx falls through to
 * perturbations; if that fallback also fails, the error is thrown.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

function mapSignature(sig: Record<string, unknown>, fallbackName = ''): LINCSSignature {
  return {
    perturbationId: (sig.perturbation_id as string) ?? '',
    perturbationName: (sig.perturbation_name as string) ?? fallbackName,
    perturbationType: (sig.perturbation_type as string) ?? 'small molecule',
    concentration: Number(sig.concentration) || 0,
    concentrationUnit: (sig.concentration_unit as string) ?? 'uM',
    timePoint: (sig.time_point as string) ?? '24h',
    cellLine: (sig.cell_line as string) ?? '',
    cellLineName: (sig.cell_line_name as string) ?? '',
    tissue: (sig.tissue as string) ?? '',
    upregulatedGenes: (sig.up_genes as string[]) ?? [],
    downregulatedGenes: (sig.down_genes as string[]) ?? [],
    zScore: Number(sig.zscore) || 0,
    pValue: Number(sig.pvalue) || 0,
  }
}

async function signaturesFromPerturbationJson(
  fallbackData: { results?: Array<{ id?: string }> },
  name: string,
): Promise<LINCSSignature[]> {
  if (!fallbackData.results?.length) return []
  const perturbationIds = fallbackData.results.slice(0, 5).map((p) => p.id).filter(Boolean)
  const signatures: LINCSSignature[] = []
  for (const id of perturbationIds as string[]) {
    const sigRes = await timedFetch(
      `${LINCS_BASE_URL}/signatures/?perturbation=${id}&limit=3`,
      { ...fetchOptions, timeoutMs: 8000 },
    )
    if (isAbsentStatus(sigRes.status)) continue
    throwIfHttpFailed(sigRes, 'LINCS')
    const sigData = await sigRes.json()
    if (!sigData?.results) continue
    for (const sig of sigData.results) {
      signatures.push(mapSignature(sig, name))
    }
  }
  return signatures
}

export async function getLINCSSignaturesByName(name: string, limit: number = 20): Promise<LINCSSignature[]> {
  const sigUrl = `${LINCS_BASE_URL}/signatures/?search=${encodeURIComponent(name)}&limit=${limit}`
  const res = await timedFetch(sigUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (res.ok) {
    throwIfHttpFailed(res, 'LINCS')
    const data = await res.json()
    if (!data.results?.length) return []
    return data.results.slice(0, limit).map((sig: Record<string, unknown>) => mapSignature(sig, name))
  }

  const fallbackUrl = `${LINCS_BASE_URL}/perturbations/?search=${encodeURIComponent(name)}&limit=${Math.min(limit, 5)}`
  const fallbackRes = await timedFetch(fallbackUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (fallbackRes.ok) {
    throwIfHttpFailed(fallbackRes, 'LINCS')
    return signaturesFromPerturbationJson(await fallbackRes.json(), name)
  }
  if (isAbsentStatus(res.status) && isAbsentStatus(fallbackRes.status)) return []
  throwIfHttpFailed(res.status >= 500 ? res : fallbackRes, 'LINCS')
  return []
}

export async function getGeneExpressionSignature(
  geneSymbol: string,
  limit: number = 10
): Promise<LINCSSignature[]> {
  const searchUrl = `${LINCS_BASE_URL}/genes/?search=${encodeURIComponent(geneSymbol)}`
  const res = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'LINCS')
  const data = await res.json()

  if (!data.results?.length) return []
  const geneId = data.results[0].id

  const signaturesUrl = `${LINCS_BASE_URL}/signatures/?gene=${geneId}&limit=${limit}`
  const sigRes = await timedFetch(signaturesUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(sigRes.status)) return []
  throwIfHttpFailed(sigRes, 'LINCS')
  const sigData = await sigRes.json()

  return (sigData.results || []).map((sig: Record<string, unknown>) => mapSignature(sig))
}

export async function getCellLineSignatures(
  cellLine: string,
  limit: number = 20
): Promise<LINCSSignature[]> {
  const url = `${LINCS_BASE_URL}/signatures/?cell_line=${encodeURIComponent(cellLine)}&limit=${limit}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'LINCS')
  const data = await res.json()

  return (data.results || []).map((sig: Record<string, unknown>) => mapSignature(sig))
}
