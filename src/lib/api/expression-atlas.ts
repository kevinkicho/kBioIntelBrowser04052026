import type { GeneExpression } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { cache: 'no-store' }

/**
 * Expression Atlas harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True 404 / zero-hit JSON remains []. Baseline 5xx falls through to the
 * experiments catalog; if that fallback also fails (or returns empty after a
 * primary 5xx), the error is thrown.
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

function asHttpError(e: unknown): Error & { status?: number } {
  return e instanceof Error ? e : new Error(String(e))
}

function isHumanSpecies(species: string | undefined): boolean {
  if (!species) return false
  const s = species.toLowerCase()
  return s.includes('homo sapiens') || s === 'human' || s.includes('h. sapiens')
}

interface BaselineColumn {
  assayGroupId?: string
  factorValue?: string
  factorValueOntologyTermId?: string
}

interface BaselineExpr {
  value?: number
}

interface BaselineProfileRow {
  id?: string
  name?: string
  experimentType?: string
  expressions?: BaselineExpr[]
}

/**
 * Map Expression Atlas baseline_experiments JSON → per-tissue GeneExpression rows
 * with real expression values (not hardcoded 0).
 */
export function mapBaselineExperimentsToRows(
  data: {
    columnHeaders?: BaselineColumn[]
    profiles?: { rows?: BaselineProfileRow[] }
    config?: { expressionUnit?: string; species?: string }
  },
  geneSymbol: string,
): GeneExpression[] {
  const headers = Array.isArray(data.columnHeaders) ? data.columnHeaders : []
  const rows = Array.isArray(data.profiles?.rows) ? data.profiles!.rows! : []
  const unit = (data.config?.expressionUnit || '').trim()
  const species =
    data.config?.species?.replace(/_/g, ' ') ||
    'Homo sapiens'
  const out: GeneExpression[] = []

  for (const profile of rows) {
    const expressions = Array.isArray(profile.expressions) ? profile.expressions : []
    const expId = profile.id || ''
    const expName = profile.name || profile.id || 'Baseline experiment'
    const expType = profile.experimentType || 'Baseline'
    const url = expId
      ? `https://www.ebi.ac.uk/gxa/experiments/${encodeURIComponent(expId)}?geneQuery=${encodeURIComponent(geneSymbol)}`
      : 'https://www.ebi.ac.uk/gxa/'

    for (let i = 0; i < headers.length; i++) {
      const cell = expressions[i]
      const value = typeof cell?.value === 'number' && Number.isFinite(cell.value) ? cell.value : null
      // Skip empty cells (no call / no measurement)
      if (value == null) continue
      const col = headers[i] || {}
      const tissue = (col.factorValue || col.assayGroupId || '').trim()
      if (!tissue) continue
      out.push({
        geneSymbol,
        tissueName: tissue,
        expressionLevel: value,
        unit,
        condition: expName,
        experimentType: expType,
        experimentDescription: expName,
        species: isHumanSpecies(species) ? 'Homo sapiens' : species,
        url,
      })
    }
  }

  // Highest expression first within gene
  out.sort((a, b) => (b.expressionLevel || 0) - (a.expressionLevel || 0))
  return out
}

function mapCatalogExperiments(
  data: { experiments?: Array<Record<string, unknown>> },
  geneSymbol: string,
): GeneExpression[] {
  const experiments = (data.experiments ?? []) as Array<Record<string, unknown>>
  const human = experiments.filter((e) => isHumanSpecies(String(e.species || '')))
  const chosen = (human.length > 0 ? human : experiments).slice(0, 20)

  return chosen.map((e) => {
    const accession = String(e.experimentAccession || '')
    const factors = Array.isArray(e.experimentalFactors)
      ? (e.experimentalFactors as string[]).join(', ')
      : ''
    return {
      geneSymbol,
      tissueName: factors || '',
      // NaN sentinel → UI treats as no level (not 0)
      expressionLevel: Number.NaN,
      unit: '',
      condition: String(e.experimentType || e.rawExperimentType || ''),
      experimentType: String(e.experimentType || e.rawExperimentType || ''),
      experimentDescription: String(
        e.experimentDescription || e.experimentAccession || '',
      ),
      species: String(e.species || ''),
      url: accession
        ? `https://www.ebi.ac.uk/gxa/experiments/${encodeURIComponent(accession)}`
        : 'https://www.ebi.ac.uk/gxa/',
    }
  })
}

async function fetchExpressionForSymbol(symbol: string): Promise<GeneExpression[]> {
  let primaryError: (Error & { status?: number }) | null = null
  try {
    const baselineUrl =
      `https://www.ebi.ac.uk/gxa/json/baseline_experiments?geneQuery=${encodeURIComponent(symbol)}` +
      `&species=${encodeURIComponent('homo sapiens')}`
    const baseRes = await timedFetch(baselineUrl, {
      ...fetchOptions,
      headers: { Accept: 'application/json' },
      timeoutMs: 8000,
    })
    if (!isAbsentStatus(baseRes.status)) {
      throwIfHttpFailed(baseRes, 'Expression Atlas')
      const baseJson = await baseRes.json()
      const mapped = mapBaselineExperimentsToRows(baseJson, symbol)
      if (mapped.length > 0) {
        return mapped.slice(0, 60)
      }
    }
  } catch (e) {
    primaryError = asHttpError(e)
  }

  try {
    const res = await timedFetch(
      `https://www.ebi.ac.uk/gxa/json/experiments?geneQuery=${encodeURIComponent(symbol)}`,
      { ...fetchOptions, headers: { Accept: 'application/json' }, timeoutMs: 8000 },
    )
    if (isAbsentStatus(res.status)) {
      if (primaryError) throw primaryError
      return []
    }
    throwIfHttpFailed(res, 'Expression Atlas')
    const catalog = mapCatalogExperiments(await res.json(), symbol)
    if (catalog.length > 0) return catalog
    if (primaryError) throw primaryError
    return []
  } catch (e) {
    if (primaryError) throw primaryError
    throw e
  }
}

/**
 * Expression Atlas experiments for gene symbols.
 * Prefers human baseline tissue values (with real levels) via baseline_experiments;
 * falls back to experiment list (metadata only, level blank).
 */
export async function getGeneExpressionBySymbols(symbols: string[]): Promise<GeneExpression[]> {
  const limited = symbols.slice(0, 3)
  if (limited.length === 0) return []

  const results = await Promise.all(limited.map((symbol) => fetchExpressionForSymbol(symbol)))

  const all = results.flat()
  const seen = new Set<string>()
  return all.filter((e) => {
    // Dedupe by experiment+tissue+level when tissue-level; by url for catalog rows
    const key = e.tissueName
      ? `${e.url}|${e.tissueName}|${e.expressionLevel}`
      : e.url
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** UI helper: does this row have a displayable numeric expression level? */
export function hasAtlasExpressionLevel(e: Pick<GeneExpression, 'expressionLevel'>): boolean {
  return typeof e.expressionLevel === 'number' && Number.isFinite(e.expressionLevel)
}
