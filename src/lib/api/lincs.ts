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

export async function getLINCSSignaturesByName(name: string, limit: number = 20): Promise<LINCSSignature[]> {
  try {
    const sigUrl = `${LINCS_BASE_URL}/signatures/?search=${encodeURIComponent(name)}&limit=${limit}`
    const res = await fetch(sigUrl, { next: { revalidate: 86400 } })
    if (!res.ok) {
      const fallbackUrl = `${LINCS_BASE_URL}/perturbations/?search=${encodeURIComponent(name)}&limit=${Math.min(limit, 5)}`
      const fallbackRes = await fetch(fallbackUrl, { next: { revalidate: 86400 } })
      if (!fallbackRes.ok) return []
      const fallbackData = await fallbackRes.json()
      if (!fallbackData.results?.length) return []
      const perturbationIds = fallbackData.results.slice(0, 5).map((p: { id?: string }) => p.id).filter(Boolean)
      const sigPromises = perturbationIds.map((id: string) =>
        fetch(`${LINCS_BASE_URL}/signatures/?perturbation=${id}&limit=3`, { next: { revalidate: 86400 } })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
      const sigResults = await Promise.all(sigPromises)
      const signatures: LINCSSignature[] = []
      for (const sigData of sigResults) {
        if (!sigData?.results) continue
        for (const sig of sigData.results) {
          signatures.push({
            perturbationId: sig.perturbation_id || '',
            perturbationName: sig.perturbation_name || name,
            perturbationType: sig.perturbation_type || 'small molecule',
            concentration: Number(sig.concentration) || 0,
            concentrationUnit: sig.concentration_unit || 'uM',
            timePoint: sig.time_point || '24h',
            cellLine: sig.cell_line || '',
            cellLineName: sig.cell_line_name || '',
            tissue: sig.tissue || '',
            upregulatedGenes: sig.up_genes || [],
            downregulatedGenes: sig.down_genes || [],
            zScore: Number(sig.zscore) || 0,
            pValue: Number(sig.pvalue) || 0,
          })
        }
      }
      return signatures
    }
    const data = await res.json()
    if (!data.results?.length) return []
    return data.results.slice(0, limit).map((sig: Record<string, unknown>) => ({
      perturbationId: (sig.perturbation_id as string) ?? '',
      perturbationName: (sig.perturbation_name as string) ?? name,
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
    }))
  } catch {
    return []
  }
}

export async function getGeneExpressionSignature(
  geneSymbol: string,
  limit: number = 10
): Promise<LINCSSignature[]> {
  try {
    // Search for perturbations affecting a specific gene
    const searchUrl = `${LINCS_BASE_URL}/genes/?search=${encodeURIComponent(geneSymbol)}`
    const res = await fetch(searchUrl, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const data = await res.json()

    if (!data.results?.length) return []
    const geneId = data.results[0].id

    // Get signatures for this gene
    const signaturesUrl = `${LINCS_BASE_URL}/signatures/?gene=${geneId}&limit=${limit}`
    const sigRes = await fetch(signaturesUrl, { next: { revalidate: 86400 } })
    if (!sigRes.ok) return []
    const sigData = await sigRes.json()

    return (sigData.results || []).map((sig: Record<string, unknown>) => ({
      perturbationId: (sig.perturbation_id as string) ?? '',
      perturbationName: (sig.perturbation_name as string) ?? '',
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
    }))
  } catch {
    return []
  }
}

export async function getCellLineSignatures(
  cellLine: string,
  limit: number = 20
): Promise<LINCSSignature[]> {
  try {
    const url = `${LINCS_BASE_URL}/signatures/?cell_line=${encodeURIComponent(cellLine)}&limit=${limit}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const data = await res.json()

    return (data.results || []).map((sig: Record<string, unknown>) => ({
      perturbationId: (sig.perturbation_id as string) ?? '',
      perturbationName: (sig.perturbation_name as string) ?? '',
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
    }))
  } catch {
    return []
  }
}
