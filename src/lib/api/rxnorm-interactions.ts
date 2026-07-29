import { getRxcuiByName } from './rxnorm'

export interface InteractionResult {
  drugA: string
  drugB: string
  severity: string
  description: string
  source: string
}

export interface InteractionCheckResponse {
  interactions: InteractionResult[]
  warnings: string[]
}

interface RxNormInteractionPair {
  interactionConcept?: Array<{
    minConceptItem?: { rxcui?: string; name?: string }
  }>
  severity?: string
  description?: string
}

interface RxNormInteractionType {
  interactionPair?: RxNormInteractionPair[]
}

interface RxNormInteractionTypeGroup {
  sourceName?: string
  interactionType?: RxNormInteractionType[]
}

interface RxNormListResponse {
  fullInteractionTypeGroup?: RxNormInteractionTypeGroup[]
}

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST'

async function openFdaPairInteractions(
  drugA: string,
  drugB: string,
): Promise<InteractionResult[]> {
  try {
    // Labels for drugA that mention drugB in drug_interactions
    const url =
      `https://api.fda.gov/drug/label.json?search=` +
      `openfda.generic_name:"${encodeURIComponent(drugA)}"` +
      `+AND+drug_interactions:"${encodeURIComponent(drugB)}"&limit=3`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) {
      // reverse pair
      const url2 =
        `https://api.fda.gov/drug/label.json?search=` +
        `openfda.generic_name:"${encodeURIComponent(drugB)}"` +
        `+AND+drug_interactions:"${encodeURIComponent(drugA)}"&limit=3`
      const res2 = await fetch(url2, { next: { revalidate: 86400 } })
      if (!res2.ok) return []
      return parseOpenFdaLabels(await res2.json(), drugA, drugB)
    }
    return parseOpenFdaLabels(await res.json(), drugA, drugB)
  } catch {
    return []
  }
}

function parseOpenFdaLabels(
  data: { results?: Array<Record<string, unknown>> },
  drugA: string,
  drugB: string,
): InteractionResult[] {
  const out: InteractionResult[] = []
  for (const lab of data.results ?? []) {
    const sections = lab.drug_interactions ?? lab.drug_interactions_table ?? []
    const text = Array.isArray(sections) ? sections.join(' ') : String(sections || '')
    if (!text.trim()) continue
    const lowerB = drugB.toLowerCase()
    const chunks = text
      .split(/(?<=\.)\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30 && s.toLowerCase().includes(lowerB))
      .slice(0, 5)
    for (const description of chunks.length ? chunks : [text.slice(0, 400)]) {
      out.push({
        drugA,
        drugB,
        severity: 'N/A',
        description: description.slice(0, 500),
        source: 'openFDA label',
      })
    }
  }
  return out.slice(0, 10)
}

export async function getMultiDrugInteractions(
  drugNames: string[],
): Promise<InteractionCheckResponse> {
  const warnings: string[] = []
  const rxcuiMap: Record<string, string> = {}

  await Promise.all(
    drugNames.map(async (name) => {
      const rxcui = await getRxcuiByName(name)
      if (rxcui) {
        rxcuiMap[name] = rxcui
      } else {
        warnings.push(`Could not resolve '${name}' to an RxNorm concept`)
      }
    }),
  )

  const interactions: InteractionResult[] = []
  const seen = new Set<string>()

  const resolvedNames = drugNames.filter((n) => rxcuiMap[n])

  // Pairwise RxNorm list.json (bulk multi-rxcui often 404s on NLM)
  try {
    for (let i = 0; i < resolvedNames.length; i++) {
      for (let j = i + 1; j < resolvedNames.length; j++) {
        const a = resolvedNames[i]
        const b = resolvedNames[j]
        const url = `${BASE_URL}/interaction/list.json?rxcuis=${rxcuiMap[a]}+${rxcuiMap[b]}`
        const res = await fetch(url)
        if (!res.ok) continue
        const data = (await res.json()) as RxNormListResponse
        for (const group of data.fullInteractionTypeGroup ?? []) {
          const sourceName = group.sourceName ?? ''
          for (const type of group.interactionType ?? []) {
            for (const pair of type.interactionPair ?? []) {
              const concepts = pair.interactionConcept ?? []
              const nameA = concepts[0]?.minConceptItem?.name ?? a
              const nameB = concepts[1]?.minConceptItem?.name ?? b
              const key = `${nameA}|${nameB}|${pair.description ?? ''}`
              if (seen.has(key)) continue
              seen.add(key)
              interactions.push({
                drugA: nameA || a,
                drugB: nameB || b,
                severity: pair.severity ?? 'N/A',
                description: pair.description ?? '',
                source: sourceName,
              })
            }
          }
        }
      }
    }
  } catch {
    /* fall through to openFDA */
  }

  // openFDA free-label fallback when NLM interaction service is down (common 404)
  if (interactions.length === 0) {
    for (let i = 0; i < drugNames.length; i++) {
      for (let j = i + 1; j < drugNames.length; j++) {
        const pairRows = await openFdaPairInteractions(drugNames[i], drugNames[j])
        for (const row of pairRows) {
          const key = `${row.drugA}|${row.drugB}|${row.description.slice(0, 80)}`
          if (seen.has(key)) continue
          seen.add(key)
          interactions.push(row)
        }
      }
    }
    if (interactions.length === 0) {
      warnings.push(
        'RxNorm interaction service returned no pairs; openFDA label text also empty for these names.',
      )
    } else {
      warnings.push('Used openFDA label drug_interactions text (RxNorm interaction API unavailable).')
    }
  }

  return { interactions: interactions.slice(0, 50), warnings }
}
