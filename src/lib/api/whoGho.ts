/**
 * WHO Global Health Observatory OData API — free, no key.
 * Disease / population epidemiology indicators (not per-drug labels).
 * @see https://www.who.int/data/gho/info/gho-odata-api
 * @see docs/design/public-apis-international.md
 */

export interface WhoGhoIndicator {
  code: string
  name: string
}

export interface WhoGhoFact {
  indicatorCode: string
  indicatorName: string
  spatialDim: string
  timeDim: string
  value: string
  numericValue: number | null
  dim1: string
}

const BASE = 'https://ghoapi.azureedge.net/api'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Search indicators by name substring (OData contains).
 * Cap results for UI use.
 */
export async function searchWhoGhoIndicators(
  query: string,
  limit = 15,
): Promise<WhoGhoIndicator[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  // OData: contains(IndicatorName,'term')
  const filter = encodeURIComponent(`contains(IndicatorName,'${q.replace(/'/g, "''")}')`)
  const url = `${BASE}/Indicator?$filter=${filter}`
  const data = await fetchJson<{ value?: Array<{ IndicatorCode?: string; IndicatorName?: string }> }>(
    url,
  )
  const rows = data?.value ?? []
  return rows.slice(0, limit).map((r) => ({
    code: String(r.IndicatorCode ?? ''),
    name: String(r.IndicatorName ?? ''),
  })).filter((r) => r.code && r.name)
}

/**
 * Fetch a sample of facts for one indicator code (global / multi-country).
 */
export async function getWhoGhoIndicatorFacts(
  indicatorCode: string,
  limit = 20,
): Promise<WhoGhoFact[]> {
  const code = indicatorCode.trim()
  if (!code) return []
  const url = `${BASE}/${encodeURIComponent(code)}`
  const data = await fetchJson<{
    value?: Array<{
      IndicatorCode?: string
      IndicatorName?: string
      SpatialDim?: string
      TimeDim?: string | number
      Value?: string
      NumericValue?: number | null
      Dim1?: string
    }>
  }>(url)
  const rows = data?.value ?? []
  return rows.slice(0, limit).map((r) => ({
    indicatorCode: String(r.IndicatorCode ?? code),
    indicatorName: String(r.IndicatorName ?? ''),
    spatialDim: String(r.SpatialDim ?? ''),
    timeDim: String(r.TimeDim ?? ''),
    value: String(r.Value ?? ''),
    numericValue:
      typeof r.NumericValue === 'number' && Number.isFinite(r.NumericValue)
        ? r.NumericValue
        : null,
    dim1: String(r.Dim1 ?? ''),
  }))
}

/**
 * Convenience: search indicators matching a disease-ish query and pull a few facts
 * from the first matching indicator.
 */
export async function getWhoGhoContextForDisease(
  diseaseName: string,
): Promise<{ indicators: WhoGhoIndicator[]; facts: WhoGhoFact[] }> {
  const indicators = await searchWhoGhoIndicators(diseaseName, 8)
  if (indicators.length === 0) return { indicators: [], facts: [] }
  const facts = await getWhoGhoIndicatorFacts(indicators[0].code, 15)
  return { indicators, facts }
}
