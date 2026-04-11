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

export async function getMultiDrugInteractions(
  drugNames: string[]
): Promise<InteractionCheckResponse> {
  const warnings: string[] = []
  const rxcuiMap: Record<string, string> = {}

  // Resolve all drug names to RXCUIs
  await Promise.all(
    drugNames.map(async (name) => {
      const rxcui = await getRxcuiByName(name)
      if (rxcui) {
        rxcuiMap[name] = rxcui
      } else {
        warnings.push(`Could not resolve '${name}' to an RxNorm concept`)
      }
    })
  )

  const resolvedNames = drugNames.filter((n) => rxcuiMap[n])
  if (resolvedNames.length < 2) {
    return { interactions: [], warnings }
  }

  const rxcuiList = resolvedNames.map((n) => rxcuiMap[n]).join('+')
  const url = `${BASE_URL}/interaction/list.json?rxcuis=${rxcuiList}`

  try {
    const res = await fetch(url)
    if (!res.ok) return { interactions: [], warnings }

    const data = (await res.json()) as RxNormListResponse
    const interactions: InteractionResult[] = []

    const typeGroups = data.fullInteractionTypeGroup ?? []
    for (const group of typeGroups) {
      const sourceName = group.sourceName ?? ''
      for (const type of group.interactionType ?? []) {
        for (const pair of type.interactionPair ?? []) {
          const concepts = pair.interactionConcept ?? []
          const nameA = concepts[0]?.minConceptItem?.name ?? 'Unknown'
          const nameB = concepts[1]?.minConceptItem?.name ?? 'Unknown'

          interactions.push({
            drugA: nameA,
            drugB: nameB,
            severity: pair.severity ?? 'N/A',
            description: pair.description ?? '',
            source: sourceName,
          })
        }
      }
    }

    return { interactions, warnings }
  } catch {
    return { interactions: [], warnings }
  }
}
