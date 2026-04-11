export interface ProteinAtlasData {
  gene: string
  ensemblId: string
  description?: string
  tissueExpression: TissueExpression[]
  cellLineExpression?: CellLineExpression[]
  subcellularLocalization?: SubcellularLocation[]
  antibodies?: AntibodyInfo[]
}

export interface TissueExpression {
  tissue: string
  tissueType: string
  expressionLevel: string // Not detected, Low, Medium, High
  score: number
  nRna: number
  nProtein: number
}

export interface CellLineExpression {
  cellLine: string
  expressionLevel: string
  score: number
}

export interface SubcellularLocation {
  location: string
  confidence: string // Approved, Uncertain, Supported
}

export interface AntibodyInfo {
  antibodyId: string
  target: string
  clonality: string
  host: string
}

export interface ProteinAtlasResult {
  data: ProteinAtlasData | null
  totalCount: number
}

const HPA_BASE_URL = 'https://www.proteinatlas.org/api'

export async function getProteinAtlasData(geneSymbol: string): Promise<ProteinAtlasData | null> {
  try {
    // Search for the gene in Human Protein Atlas
    const searchUrl = `${HPA_BASE_URL}/search.json?q=${encodeURIComponent(geneSymbol)}&page=1`
    const res = await fetch(searchUrl, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const searchData = await res.json()

    if (!searchData?.results?.length) return null

    // Get the first matching result
    const firstResult = searchData.results[0]
    const geneName = firstResult.gene || firstResult.name

    if (!geneName) return null

    // Fetch detailed tissue expression data
    const tissueUrl = `${HPA_BASE_URL}/tissue.json?gene_name=${encodeURIComponent(geneName)}`
    const tissueRes = await fetch(tissueUrl, { next: { revalidate: 86400 } })
    if (!tissueRes.ok) return null
    const tissueData = await tissueRes.json()

    // Fetch cell line expression data
    const cellLineUrl = `${HPA_BASE_URL}/cellline.json?gene_name=${encodeURIComponent(geneName)}`
    const cellLineRes = await fetch(cellLineUrl, { next: { revalidate: 86400 } })
    if (!cellLineRes.ok) return null
    const cellLineData = await cellLineRes.json()

    // Fetch subcellular location data
    const subcellularUrl = `${HPA_BASE_URL}/subcellular.json?gene_name=${encodeURIComponent(geneName)}`
    const subcellularRes = await fetch(subcellularUrl, { next: { revalidate: 86400 } })
    if (!subcellularRes.ok) return null
    const subcellularData = await subcellularRes.json()

    // Process tissue expression
    const tissueExpression: TissueExpression[] = []
    if (Array.isArray(tissueData)) {
      for (const item of tissueData) {
        if (item.tissue) {
          tissueExpression.push({
            tissue: item.tissue,
            tissueType: item.tissue_type || 'Unknown',
            expressionLevel: item.expression_level || 'Not detected',
            score: item.score || 0,
            nRna: item.n_rna || 0,
            nProtein: item.n_protein || 0,
          })
        }
      }
    }

    // Process cell line expression
    const cellLineExpression: CellLineExpression[] = []
    if (Array.isArray(cellLineData)) {
      for (const item of cellLineData) {
        if (item.cell_line) {
          cellLineExpression.push({
            cellLine: item.cell_line,
            expressionLevel: item.expression_level || 'Not detected',
            score: item.score || 0,
          })
        }
      }
    }

    // Process subcellular localization
    const subcellularLocalization: SubcellularLocation[] = []
    if (Array.isArray(subcellularData)) {
      for (const item of subcellularData) {
        if (item.location) {
          subcellularLocalization.push({
            location: item.location,
            confidence: item.confidence || 'Uncertain',
          })
        }
      }
    }

    return {
      gene: geneName,
      ensemblId: firstResult.ensembl_id || '',
      description: firstResult.description || undefined,
      tissueExpression,
      cellLineExpression: cellLineExpression.length > 0 ? cellLineExpression : undefined,
      subcellularLocalization: subcellularLocalization.length > 0 ? subcellularLocalization : undefined,
    }
  } catch {
    return null
  }
}
