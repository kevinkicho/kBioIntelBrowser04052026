import type { AtcClassification } from '../types'
import { getRxcuiByName } from './rxnorm'

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json'
/** Official WHO ATC/DDD Index (Norwegian Institute of Public Health / WHOCC) */
const ATC_INDEX_BASE = 'https://atcddd.fhi.no/atc_ddd_index/'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/** WHO anatomical main groups (1st level). */
const ATC_L1 = 'ABCDGHJLMNPRSV'

/**
 * True for WHO ATC codes only (not VA class IDs like CN103).
 * Levels: A | A10 | A10B | A10BA | A10BA02
 */
export function isWhoAtcCode(code: string | null | undefined): boolean {
  const raw = (code || '').trim().toUpperCase()
  if (!raw) return false
  return new RegExp(
    `^[${ATC_L1}](?:\\d{2}(?:[A-Z](?:[A-Z](?:\\d{2})?)?)?)?$`,
  ).test(raw)
}

/** Human-readable hierarchy level from code length / classType. */
export function atcLevelLabel(code: string, classType?: string): string {
  const raw = (code || '').trim().toUpperCase()
  if (raw.length === 1) return 'Level 1 · Anatomical'
  if (raw.length === 3) return 'Level 2 · Therapeutic'
  if (raw.length === 4) return 'Level 3 · Pharmacological'
  if (raw.length === 5) return 'Level 4 · Chemical'
  if (raw.length === 7) return 'Level 5 · Substance'
  // RxClass classType e.g. ATC1-4
  if (classType?.toUpperCase().includes('ATC')) {
    return classType.replace(/^ATC/i, 'ATC ')
  }
  return classType?.trim() || 'ATC'
}

/**
 * Deep link into the WHO ATC/DDD Index for a class code (e.g. A10BA02).
 * Falls back to the index homepage when code is missing/invalid.
 */
export function atcDeepLink(code: string | null | undefined): string {
  const raw = (code || '').trim().toUpperCase()
  if (isWhoAtcCode(raw)) {
    return `${ATC_INDEX_BASE}?code=${encodeURIComponent(raw)}&showdescription=yes`
  }
  return ATC_INDEX_BASE
}

export async function getAtcClassificationsByName(name: string): Promise<AtcClassification[]> {
  try {
    const rxcui = await getRxcuiByName(name)
    if (!rxcui) return []

    // relaSource=ATC keeps WHO ATC; classType alone still mixes VA classes
    const url = `${BASE_URL}?rxcui=${encodeURIComponent(rxcui)}&relaSource=ATC`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const drugInfoList: unknown[] =
      data.rxclassDrugInfoList?.rxclassDrugInfo ??
      data.rxclassMinConceptList?.rxclassMinConcept ??
      []

    const seen = new Set<string>()
    const out: AtcClassification[] = []

    for (const item of drugInfoList) {
      const rec = item as Record<string, unknown>
      const concept = (rec.rxclassMinConceptItem ?? rec) as Record<string, unknown>
      const code = String(concept.classId ?? '').trim().toUpperCase()
      if (!isWhoAtcCode(code)) continue
      if (seen.has(code)) continue
      seen.add(code)

      const className = String(concept.className ?? '').trim()
      const classType = String(concept.classType ?? '').trim()
      out.push({
        code,
        name: className,
        classType: classType || atcLevelLabel(code),
        url: atcDeepLink(code),
      })
    }

    // Prefer longer (more specific) codes first, then alpha
    out.sort((a, b) => {
      if (b.code.length !== a.code.length) return b.code.length - a.code.length
      return a.code.localeCompare(b.code)
    })

    return out
  } catch {
    return []
  }
}
