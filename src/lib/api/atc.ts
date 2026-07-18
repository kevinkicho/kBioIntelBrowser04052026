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

/**
 * Collapse RxClass multi-relation rows (same ATC classId can appear 5+ times)
 * and drop non-WHO VA/SNOMED noise. Safe to call on cached payloads.
 */
export function dedupeAtcClassifications(
  rows: readonly AtcClassification[] | null | undefined,
): AtcClassification[] {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const byCode = new Map<string, AtcClassification>()

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const code = String(row.code ?? '').trim().toUpperCase()
    if (!isWhoAtcCode(code)) continue

    const name = String(row.name ?? '').trim()
    const classType = String(row.classType ?? '').trim()
    const url =
      row.url && (row.url.includes('atcddd.fhi.no') || row.url.includes('whocc.no'))
        ? row.url
        : atcDeepLink(code)

    const next: AtcClassification = {
      code,
      name,
      classType: classType || atcLevelLabel(code),
      url,
    }

    const prev = byCode.get(code)
    if (!prev) {
      byCode.set(code, next)
      continue
    }
    // Keep the longer / more informative class name when duplicates collide
    if ((next.name?.length ?? 0) > (prev.name?.length ?? 0)) {
      byCode.set(code, { ...prev, name: next.name, classType: next.classType || prev.classType })
    }
  }

  const out = Array.from(byCode.values())
  // Prefer longer (more specific) codes first, then alpha
  out.sort((a, b) => {
    if (b.code.length !== a.code.length) return b.code.length - a.code.length
    return a.code.localeCompare(b.code)
  })
  return out
}

function mapRxClassItems(drugInfoList: unknown[]): AtcClassification[] {
  const raw: AtcClassification[] = []
  for (const item of drugInfoList) {
    const rec = item as Record<string, unknown>
    const concept = (rec.rxclassMinConceptItem ?? rec) as Record<string, unknown>
    const code = String(concept.classId ?? concept.class_id ?? '').trim().toUpperCase()
    if (!code) continue
    raw.push({
      code,
      name: String(concept.className ?? concept.class_name ?? '').trim(),
      classType: String(concept.classType ?? concept.class_type ?? '').trim(),
      url: atcDeepLink(code),
    })
  }
  return dedupeAtcClassifications(raw)
}

export async function getAtcClassificationsByName(name: string): Promise<AtcClassification[]> {
  try {
    const rxcui = await getRxcuiByName(name)
    if (!rxcui) return []

    // relaSource=ATC keeps WHO ATC; without it RxClass repeats the same classId
    // once per relation type (often 5× identical L01EK-style rows).
    const url = `${BASE_URL}?rxcui=${encodeURIComponent(rxcui)}&relaSource=ATC`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const drugInfoList: unknown[] =
      data.rxclassDrugInfoList?.rxclassDrugInfo ??
      data.rxclassMinConceptList?.rxclassMinConcept ??
      []

    const list = Array.isArray(drugInfoList) ? drugInfoList : [drugInfoList]
    return mapRxClassItems(list)
  } catch {
    return []
  }
}
