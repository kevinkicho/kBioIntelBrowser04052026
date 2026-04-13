import type { AtcClassification } from '../types'
import { getRxcuiByName } from './rxnorm'

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getAtcClassificationsByName(name: string): Promise<AtcClassification[]> {
  try {
    const rxcui = await getRxcuiByName(name)
    if (!rxcui) return []

    const url = `${BASE_URL}?rxcui=${rxcui}&classType=ATC`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const drugInfoList = data.rxclassDrugInfoList?.rxclassDrugInfo ?? data.rxclassMinConceptList?.rxclassMinConcept ?? []
    return drugInfoList.map((item: Record<string, unknown>) => {
      const concept = (item.rxclassMinConceptItem ?? item) as Record<string, unknown>
      return {
        code: String(concept.classId ?? ''),
        name: String(concept.className ?? ''),
        classType: String(concept.classType ?? ''),
      }
    })
  } catch {
    return []
  }
}
