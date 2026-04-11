import type { AtcClassification } from '../types'
import { getRxcuiByName } from './rxnorm'

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getAtcClassificationsByName(name: string): Promise<AtcClassification[]> {
  try {
    const rxcui = await getRxcuiByName(name)
    if (!rxcui) return []

    const url = `${BASE_URL}?rxcui=${rxcui}&relaSource=ATC`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const concepts = data.rxclassMinConceptList?.rxclassMinConcept ?? []
    return concepts.map((c: { classId?: string; className?: string; classType?: string }) => ({
      code: c.classId ?? '',
      name: c.className ?? '',
      classType: c.classType ?? '',
    }))
  } catch {
    return []
  }
}
