import type { DrugInteraction } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * RxNorm harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains [] / null. 404 on pair-list is retryable.
 */
function throwIfHttpFailed(
  res: Response,
  source: string,
  opts?: { allowNotFound?: boolean },
): void {
  if (!res.ok) {
    if (opts?.allowNotFound && res.status === 404) return
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

type InteractionSeverity = 'N/A' | 'minor' | 'moderate' | 'major' | 'contraindicated'

function normalizeSeverity(raw: unknown): InteractionSeverity {
  const s = String(raw ?? 'N/A').toLowerCase()
  if (s === 'minor' || s === 'moderate' || s === 'major' || s === 'contraindicated') return s
  return 'N/A'
}

export async function getRxcuiByName(name: string): Promise<string | null> {
  const q = (name || '').trim()
  if (!q) return null
  let url = `${BASE_URL}/rxcui.json?name=${encodeURIComponent(q)}`
  let res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'RxNorm')
  const data = await res.json()
  const ids = data.idGroup?.rxnormId
  if (Array.isArray(ids) && ids.length > 0) return ids[0]

  url = `${BASE_URL}/approximateTerm.json?term=${encodeURIComponent(q)}&maxEntries=1`
  res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'RxNorm')
  const approx = await res.json()
  const match = approx.approximateGroup?.candidate?.[0]
  if (match?.rxcui) return match.rxcui
  return null
}

export async function getDrugInteractionsByName(name: string): Promise<DrugInteraction[]> {
  const q = (name || '').trim()
  if (!q) return []
  const rxcui = await getRxcuiByName(q)
  if (!rxcui) return []

  // NLM single-drug interaction.json is frequently 404; try list with a common co-med
  // pair set, then fall back to openFDA label drug_interactions text.
  const companionRxcuis = ['11289', '5640', '161', '7052'] // warfarin, ibuprofen, acetaminophen, morphine
  for (const other of companionRxcuis) {
    if (other === rxcui) continue
    const listUrl = `${BASE_URL}/interaction/list.json?rxcuis=${rxcui}+${other}`
    const res = await timedFetch(listUrl, { ...fetchOptions, timeoutMs: 8000 })
    throwIfHttpFailed(res, 'RxNorm', { allowNotFound: true })
    if (!res.ok) continue
    const data = await res.json()
    const interactions = parseInteractionGroups(data.fullInteractionTypeGroup ?? data.interactionTypeGroup)
    if (interactions.length > 0) return interactions.slice(0, 30)
  }

  // openFDA label sections (free) as last resort
  return await getInteractionsFromOpenFdaLabel(q)
}

function parseInteractionGroups(groups: unknown[]): DrugInteraction[] {
  const interactions: DrugInteraction[] = []
  if (!Array.isArray(groups)) return interactions
  for (const group of groups as Array<Record<string, unknown>>) {
    const sourceName = String(group.sourceName ?? '')
    for (const type of (group.interactionType as Array<Record<string, unknown>>) ?? []) {
      for (const pair of (type.interactionPair as Array<Record<string, unknown>>) ?? []) {
        const concepts = (pair.interactionConcept as Array<Record<string, Record<string, string>>>) ?? []
        const names = concepts.map((c) => c.minConceptItem?.name).filter(Boolean)
        interactions.push({
          drugName: names[1] || names[0] || 'Unknown',
          severity: normalizeSeverity(pair.severity),
          description: String(pair.description ?? ''),
          sourceName,
        })
      }
    }
  }
  return interactions
}

async function getInteractionsFromOpenFdaLabel(name: string): Promise<DrugInteraction[]> {
    const url =
      `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"+openfda.brand_name:"${encodeURIComponent(name)}"&limit=3`
    const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
    throwIfHttpFailed(res, 'openFDA', { allowNotFound: true })
    if (!res.ok) return []
    const data = await res.json()
    const results = data.results ?? []
    const out: DrugInteraction[] = []
    for (const lab of results) {
      const sections: string[] = lab.drug_interactions ?? lab.drug_interactions_table ?? []
      const text = Array.isArray(sections) ? sections.join(' ') : String(sections || '')
      if (!text.trim()) continue
      // Split on common delimiters into short interaction notes
      const chunks = text
        .split(/(?<=\.)\s+(?=[A-Z])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 40)
        .slice(0, 8)
      for (const description of chunks) {
        out.push({
          drugName: name,
          severity: 'N/A',
          description: description.slice(0, 500),
          sourceName: 'openFDA label',
        })
      }
    }
    return out.slice(0, 20)
}
