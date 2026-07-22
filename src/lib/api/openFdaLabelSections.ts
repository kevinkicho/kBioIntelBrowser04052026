/**
 * openFDA drug/label.json — structured SPL section snippets (free public).
 * Complements DailyMed setid directory with claim-ready section text.
 * Not clinical decision support; reporting / label text only.
 * @see https://open.fda.gov/apis/drug/label/
 */

import { getApiKey } from './utils'

const BASE_URL = 'https://api.fda.gov/drug/label.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export type OpenFdaLabelSectionKey =
  | 'boxed_warning'
  | 'indications_and_usage'
  | 'contraindications'
  | 'warnings_and_cautions'
  | 'adverse_reactions'
  | 'drug_interactions'
  | 'dosage_and_administration'

export interface OpenFdaLabelSection {
  key: OpenFdaLabelSectionKey
  label: string
  /** Truncated section text for UI / claims */
  text: string
}

export interface OpenFdaLabelRecord {
  id: string
  brandName: string
  genericName: string
  manufacturer: string
  setId: string
  sections: OpenFdaLabelSection[]
  dailyMedUrl: string | null
  openFdaUrl: string
}

const SECTION_META: { key: OpenFdaLabelSectionKey; label: string }[] = [
  { key: 'boxed_warning', label: 'Boxed warning' },
  { key: 'indications_and_usage', label: 'Indications & usage' },
  { key: 'contraindications', label: 'Contraindications' },
  { key: 'warnings_and_cautions', label: 'Warnings & cautions' },
  { key: 'adverse_reactions', label: 'Adverse reactions' },
  { key: 'drug_interactions', label: 'Drug interactions' },
  { key: 'dosage_and_administration', label: 'Dosage & administration' },
]

function keyParam(): string {
  const k = getApiKey('OPENFDA_API_KEY')
  return k ? `&api_key=${encodeURIComponent(k)}` : ''
}

function firstText(v: unknown): string {
  if (Array.isArray(v)) {
    return v
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .join('\n\n')
  }
  if (typeof v === 'string') return v.trim()
  return ''
}

function truncate(s: string, max = 900): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/**
 * Fetch openFDA label records with key safety/use sections for a drug name.
 */
export async function getOpenFdaLabelSectionsByName(
  name: string,
  limit = 5,
): Promise<OpenFdaLabelRecord[]> {
  const q = name.trim()
  if (q.length < 2) return []
  try {
    const enc = encodeURIComponent(`"${q}"`)
    const search = [
      `openfda.brand_name:${enc}`,
      `openfda.generic_name:${enc}`,
      `openfda.substance_name:${enc}`,
    ].join('+OR+')
    const url = `${BASE_URL}?search=${search}&limit=${Math.min(10, Math.max(1, limit))}${keyParam()}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Record<string, unknown>[] }
    const out: OpenFdaLabelRecord[] = []

    for (const r of data.results ?? []) {
      const openfda = (r.openfda ?? {}) as Record<string, unknown>
      const brand = firstText(openfda.brand_name).split('\n')[0] || ''
      const generic = firstText(openfda.generic_name).split('\n')[0] || ''
      const manufacturer = firstText(openfda.manufacturer_name).split('\n')[0] || ''
      const setId = firstText(openfda.spl_set_id).split('\n')[0] || firstText(r.set_id) || ''
      const id = String(r.id || setId || `${brand}-${generic}`).trim()
      const sections: OpenFdaLabelSection[] = []
      for (const meta of SECTION_META) {
        const raw = firstText(r[meta.key])
        if (!raw) continue
        sections.push({
          key: meta.key,
          label: meta.label,
          text: truncate(raw),
        })
      }
      if (sections.length === 0) continue
      out.push({
        id,
        brandName: brand || q,
        genericName: generic,
        manufacturer,
        setId,
        sections,
        dailyMedUrl: setId
          ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(setId)}`
          : null,
        openFdaUrl: url.split('&api_key')[0] || BASE_URL,
      })
    }
    return out
  } catch {
    return []
  }
}
