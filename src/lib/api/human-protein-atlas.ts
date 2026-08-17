import { timedFetch } from './timedFetch'

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
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Human Protein Atlas harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * 404, missing symbol, and unmatched JSON remain empty.
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

async function hpaGet(url: string, source: string): Promise<Response> {
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return res
  throwIfHttpFailed(res, source)
  return res
}

function mapTissue(tissueData: unknown): TissueExpression[] {
  const tissueExpression: TissueExpression[] = []
  if (!Array.isArray(tissueData)) return tissueExpression
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
  return tissueExpression
}

function mapCellLine(cellLineData: unknown): CellLineExpression[] {
  const cellLineExpression: CellLineExpression[] = []
  if (!Array.isArray(cellLineData)) return cellLineExpression
  for (const item of cellLineData) {
    if (item.cell_line) {
      cellLineExpression.push({
        cellLine: item.cell_line,
        expressionLevel: item.expression_level || 'Not detected',
        score: item.score || 0,
      })
    }
  }
  return cellLineExpression
}

function mapSubcellular(subcellularData: unknown): SubcellularLocation[] {
  const subcellularLocalization: SubcellularLocation[] = []
  if (!Array.isArray(subcellularData)) return subcellularLocalization
  for (const item of subcellularData) {
    if (item.location) {
      subcellularLocalization.push({
        location: item.location,
        confidence: item.confidence || 'Uncertain',
      })
    }
  }
  return subcellularLocalization
}

export async function getProteinAtlasData(geneSymbol: string): Promise<ProteinAtlasData | null> {
  const q = geneSymbol.trim()
  if (!q) return null

  const searchUrl = `${HPA_BASE_URL}/search.json?q=${encodeURIComponent(q)}&page=1`
  const res = await hpaGet(searchUrl, 'Human Protein Atlas')
  if (isAbsentStatus(res.status)) return null
  const searchData = await res.json()

  if (!searchData?.results?.length) return null

  const firstResult = searchData.results[0]
  const geneName = firstResult.gene || firstResult.name
  if (!geneName) return null

  const tissueUrl = `${HPA_BASE_URL}/tissue.json?gene_name=${encodeURIComponent(geneName)}`
  const tissueRes = await hpaGet(tissueUrl, 'Human Protein Atlas tissue')
  const tissueData = isAbsentStatus(tissueRes.status) ? [] : await tissueRes.json()

  const cellLineUrl = `${HPA_BASE_URL}/cellline.json?gene_name=${encodeURIComponent(geneName)}`
  const cellLineRes = await hpaGet(cellLineUrl, 'Human Protein Atlas cell line')
  const cellLineData = isAbsentStatus(cellLineRes.status) ? [] : await cellLineRes.json()

  const subcellularUrl = `${HPA_BASE_URL}/subcellular.json?gene_name=${encodeURIComponent(geneName)}`
  const subcellularRes = await hpaGet(subcellularUrl, 'Human Protein Atlas subcellular')
  const subcellularData = isAbsentStatus(subcellularRes.status) ? [] : await subcellularRes.json()

  const tissueExpression = mapTissue(tissueData)
  const cellLineExpression = mapCellLine(cellLineData)
  const subcellularLocalization = mapSubcellular(subcellularData)

  return {
    gene: geneName,
    ensemblId: firstResult.ensembl_id || '',
    description: firstResult.description || undefined,
    tissueExpression,
    cellLineExpression: cellLineExpression.length > 0 ? cellLineExpression : undefined,
    subcellularLocalization: subcellularLocalization.length > 0 ? subcellularLocalization : undefined,
  }
}
