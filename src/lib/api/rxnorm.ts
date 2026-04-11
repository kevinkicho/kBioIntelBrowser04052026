import type { DrugInteraction } from '../types'

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getRxcuiByName(name: string): Promise<string | null> {
  try {
    const url = `${BASE_URL}/rxcui.json?name=${encodeURIComponent(name)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    const ids = data.idGroup?.rxnormId
    return Array.isArray(ids) && ids.length > 0 ? ids[0] : null
  } catch {
    return null
  }
}

export async function getDrugInteractionsByName(name: string): Promise<DrugInteraction[]> {
  try {
    const rxcui = await getRxcuiByName(name)
    if (!rxcui) return []

    const url = `${BASE_URL}/interaction/interaction.json?rxcui=${rxcui}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const interactions: DrugInteraction[] = []
    const groups = data.interactionTypeGroup ?? []

    for (const group of groups) {
      const sourceName = group.sourceName ?? ''
      for (const type of group.interactionType ?? []) {
        for (const pair of type.interactionPair ?? []) {
          const concepts = pair.interactionConcept ?? []
          const otherDrug = concepts.find(
            (c: { minConceptItem?: { rxcui?: string } }) =>
              c.minConceptItem?.rxcui !== rxcui
          )
          interactions.push({
            drugName: otherDrug?.minConceptItem?.name ?? 'Unknown',
            severity: pair.severity ?? 'N/A',
            description: pair.description ?? '',
            sourceName,
          })
        }
      }
    }

    return interactions
  } catch {
    return []
  }
}
